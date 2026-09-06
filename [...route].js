import { readDb, writeDb, id, slugify } from './lib/store.js';

const json = (res, body, status=200) => { res.status(status).setHeader('Content-Type','application/json'); res.end(JSON.stringify(body)); };
const body = async (req) => { if (req.method === 'GET' || req.method === 'DELETE') return {}; let raw=''; for await (const c of req) raw += c; return raw ? JSON.parse(raw) : {}; };
const now = () => new Date().toISOString();
const publicProducts = db => db.products.filter(p => p.status === 'published');
const publicCategories = db => db.categories.filter(c => c.active);

function applyProductFilters(products, url) {
  const q = (url.searchParams.get('search') || '').toLowerCase();
  const category = url.searchParams.get('category');
  const brand = url.searchParams.get('brand');
  const min = Number(url.searchParams.get('minPrice') || 0);
  const max = Number(url.searchParams.get('maxPrice') || Number.MAX_SAFE_INTEGER);
  const stock = url.searchParams.get('stock');
  const sort = url.searchParams.get('sort') || 'featured';
  let out = products.filter(p => {
    const cat = dbCategory(p.categoryId, url.__db);
    return (!q || [p.name,p.brand,p.sku,p.description].join(' ').toLowerCase().includes(q)) &&
      (!category || p.categoryId === category || cat?.slug === category) &&
      (!brand || p.brand === brand) && p.price >= min && p.price <= max &&
      (!stock || (stock === 'in' ? p.stock > 0 : p.stock <= 0));
  });
  out.sort((a,b) => sort === 'price-asc' ? a.price-b.price : sort === 'price-desc' ? b.price-a.price : sort === 'newest' ? b.createdAt.localeCompare(a.createdAt) : (b.stock>0)-(a.stock>0));
  return out;
}
function dbCategory(id, db){ return db?.categories?.find(c=>c.id===id); }

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://localhost');
    const parts = url.pathname.replace(/^\/api\/?/,'').split('/').filter(Boolean).map(decodeURIComponent);
    const resource = parts[0] || '';
    const itemId = parts[1];
    const db = await readDb();
    url.__db = db;

    if (req.method === 'GET' && resource === 'health') return json(res,{ok:true,service:'vora-api',storage:process.env.BLOB_READ_WRITE_TOKEN?'vercel-blob':'local-json'});

    if (resource === 'categories') {
      if (req.method === 'GET') return json(res,{data:(url.searchParams.get('admin')==='1'?db.categories:publicCategories(db)).sort((a,b)=>a.sortOrder-b.sortOrder)});
      if (req.method === 'POST') { const b=await body(req); if(!b.name) return json(res,{error:'name is required'},400); const c={id:id('cat'),name:b.name,slug:b.slug||slugify(b.name),description:b.description||'',image:b.image||'',sortOrder:Number(b.sortOrder||db.categories.length+1),active:b.active!==false}; db.categories.push(c); await writeDb(db); return json(res,{data:c},201); }
      if (itemId) {
        const i=db.categories.findIndex(c=>c.id===itemId); if(i<0) return json(res,{error:'Category not found'},404);
        if(req.method==='PUT'){ const b=await body(req); db.categories[i]={...db.categories[i],...b,slug:b.slug||slugify(b.name||db.categories[i].name)}; await writeDb(db); return json(res,{data:db.categories[i]}); }
        if(req.method==='DELETE'){ db.categories.splice(i,1); db.products.forEach(p=>{if(p.categoryId===itemId)p.categoryId=null}); await writeDb(db); return json(res,{ok:true}); }
      }
    }

    if (resource === 'products') {
      if(req.method==='GET' && !itemId){ const all=url.searchParams.get('admin')==='1' ? db.products : publicProducts(db); const data=applyProductFilters(all,url); const page=Math.max(1,Number(url.searchParams.get('page')||1)); const limit=Math.min(100,Math.max(1,Number(url.searchParams.get('limit')||12))); return json(res,{data:data.slice((page-1)*limit,page*limit),meta:{page,limit,total:data.length,pages:Math.max(1,Math.ceil(data.length/limit)),brands:[...new Set(all.map(p=>p.brand))].sort()}}); }
      if(req.method==='GET' && itemId){ const p=db.products.find(x=>x.id===itemId||x.slug===itemId); return p?json(res,{data:p}):json(res,{error:'Product not found'},404); }
      if(req.method==='POST'){ const b=await body(req); if(!b.name||!b.price) return json(res,{error:'name and price are required'},400); const p={id:id('prod'),name:b.name,slug:b.slug||slugify(b.name),sku:b.sku||id('sku').toUpperCase(),brand:b.brand||'VORA',categoryId:b.categoryId||null,description:b.description||'',price:Number(b.price),compareAtPrice:Number(b.compareAtPrice||b.price),stock:Number(b.stock||0),lowStockThreshold:Number(b.lowStockThreshold||5),status:b.status||'draft',images:b.images||[],attributes:b.attributes||{},createdAt:now(),updatedAt:now()}; db.products.push(p); await writeDb(db); return json(res,{data:p},201); }
      if(itemId){ const i=db.products.findIndex(p=>p.id===itemId); if(i<0)return json(res,{error:'Product not found'},404); if(req.method==='PUT'){const b=await body(req); db.products[i]={...db.products[i],...b,updatedAt:now()}; await writeDb(db); return json(res,{data:db.products[i]});} if(req.method==='DELETE'){db.products[i].status='archived'; db.products[i].updatedAt=now(); await writeDb(db); return json(res,{ok:true});} }
    }

    if(resource==='inventory' && req.method==='GET'){ const data=db.products.map(p=>({...p,category:dbCategory(p.categoryId,db)?.name||'Uncategorized',stockState:p.stock<=0?'critical':p.stock<=p.lowStockThreshold?'low':'optimal'})); return json(res,{data,summary:{activeSkus:data.filter(p=>p.status==='published').length,lowStock:data.filter(p=>p.stock>0&&p.stock<=p.lowStockThreshold).length,outOfStock:data.filter(p=>p.stock<=0).length}}); }
    if(resource==='inventory' && itemId && req.method==='PATCH'){ const p=db.products.find(x=>x.id===itemId); if(!p)return json(res,{error:'Product not found'},404); const b=await body(req); p.stock=Math.max(0,p.stock+Number(b.delta||0)); p.updatedAt=now(); await writeDb(db); return json(res,{data:p}); }

    if(resource==='orders'){
      if(req.method==='GET'){ let data=[...db.orders]; const status=url.searchParams.get('status'); if(status) data=data.filter(o=>o.status===status); return json(res,{data}); }
      if(req.method==='POST'){ const b=await body(req); if(!Array.isArray(b.items)||!b.items.length)return json(res,{error:'items are required'},400); const orderItems=[]; let subtotal=0; for(const item of b.items){const p=db.products.find(x=>x.id===item.productId); if(!p||p.status!=='published')return json(res,{error:`Product ${item.productId} unavailable`},400); const qty=Math.max(1,Number(item.quantity||1)); if(p.stock<qty)return json(res,{error:`Insufficient stock for ${p.name}`},409); orderItems.push({productId:p.id,name:p.name,sku:p.sku,quantity:qty,price:p.price}); subtotal+=p.price*qty; } const tax=subtotal*Number(db.settings.taxRate||0); const order={id:id('ord'),number:`TS-${Math.floor(10000+Math.random()*89999)}`,customer:b.customer||{},items:orderItems,subtotal,shipping:Number(b.shipping||0),tax,total:subtotal+Number(b.shipping||0)+tax,status:'pending',paymentStatus:'pending',createdAt:now(),updatedAt:now()}; orderItems.forEach(i=>{const p=db.products.find(x=>x.id===i.productId);p.stock-=i.quantity;p.updatedAt=now()}); db.orders.unshift(order); await writeDb(db); return json(res,{data:order},201); }
      if(itemId && req.method==='PATCH'){const o=db.orders.find(x=>x.id===itemId); if(!o)return json(res,{error:'Order not found'},404); const b=await body(req); o.status=b.status||o.status;o.paymentStatus=b.paymentStatus||o.paymentStatus;o.updatedAt=now();await writeDb(db);return json(res,{data:o});}
    }

    if(resource==='dashboard' && req.method==='GET'){const orders=db.orders;const products=publicProducts(db);const revenue=orders.filter(o=>o.paymentStatus==='paid'||o.status==='completed').reduce((s,o)=>s+o.total,0);return json(res,{data:{revenue,orders:orders.length,customers:db.customers.length,conversionRate:0,lowStock:products.filter(p=>p.stock<=p.lowStockThreshold),recentOrders:orders.slice(0,5)}});}
    if(resource==='settings'){ if(req.method==='GET')return json(res,{data:db.settings}); if(req.method==='PUT'){db.settings={...db.settings,...await body(req)};await writeDb(db);return json(res,{data:db.settings});} }
    return json(res,{error:'Route not found'},404);
  } catch(e) { console.error(e); return json(res,{error:e.message||'Internal server error'},500); }
}
