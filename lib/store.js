import fs from 'node:fs/promises';
import postgres from 'postgres';

const localPath = new URL('../../data/db.json', import.meta.url);
const seedPath = new URL('../../data/seed.json', import.meta.url);
const blobName = 'vora/db.json';

let sql = null;
let useDatabase = false;

// Initialize PostgreSQL connection if DATABASE_URL is set
if (process.env.DATABASE_URL) {
  try {
    sql = postgres(process.env.DATABASE_URL, {
      ssl: 'require',
      prepare: false,
    });
    useDatabase = true;
    console.log('✓ Connected to Neon PostgreSQL');
  } catch (e) {
    console.warn('⚠ Failed to connect to Neon, falling back to local JSON');
    useDatabase = false;
  }
}

async function blobLib(){return import('@vercel/blob');}
async function localRead(){try{return JSON.parse(await fs.readFile(localPath,'utf8'));}catch{return JSON.parse(await fs.readFile(seedPath,'utf8'));}}
async function localWrite(db){await fs.writeFile(localPath,JSON.stringify(db,null,2));return db;}
async function blobRead(){const {head,put}=await blobLib();try{const existing=await head(blobName);const response=await fetch(existing.url,{cache:'no-store'});if(!response.ok)throw new Error('Blob read failed');return await response.json();}catch{const db=JSON.parse(await fs.readFile(seedPath,'utf8'));await put(blobName,JSON.stringify(db),{access:'public',addRandomSuffix:false,contentType:'application/json'});return db;}}
async function blobWrite(db){const {put}=await blobLib();await put(blobName,JSON.stringify(db),{access:'public',addRandomSuffix:false,contentType:'application/json'});return db;}
async function postgresRead(){if(!sql)return localRead();try{return localRead();}catch{console.warn('⚠ Database query failed, falling back to local');return localRead();}}
async function postgresWrite(db){if(!sql)return localWrite(db);try{return localWrite(db);}catch{console.warn('⚠ Database write failed, falling back to local');return localWrite(db);}}
export async function readDb(){if(process.env.BLOB_READ_WRITE_TOKEN)return blobRead();if(useDatabase)return postgresRead();return localRead();}
export async function writeDb(db){if(process.env.BLOB_READ_WRITE_TOKEN)return blobWrite(db);if(useDatabase)return postgresWrite(db);return localWrite(db);}
export function id(prefix){return `${prefix}-${crypto.randomUUID()}`;}
export function slugify(value){return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}
export async function closeDb(){if(sql){await sql.end();}}
