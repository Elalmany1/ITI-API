import fs from 'node:fs/promises';
const localPath = new URL('../../data/db.json', import.meta.url);
const seedPath = new URL('../../data/seed.json', import.meta.url);
const blobName = 'vora/db.json';
async function blobLib(){return import('@vercel/blob');}
async function localRead(){try{return JSON.parse(await fs.readFile(localPath,'utf8'));}catch{return JSON.parse(await fs.readFile(seedPath,'utf8'));}}
async function localWrite(db){await fs.writeFile(localPath,JSON.stringify(db,null,2));return db;}
async function blobRead(){const {head,put}=await blobLib();try{const existing=await head(blobName);const response=await fetch(existing.url,{cache:'no-store'});if(!response.ok)throw new Error('Blob read failed');return await response.json();}catch{const db=JSON.parse(await fs.readFile(seedPath,'utf8'));await put(blobName,JSON.stringify(db),{access:'public',addRandomSuffix:false,contentType:'application/json'});return db;}}
async function blobWrite(db){const {put}=await blobLib();await put(blobName,JSON.stringify(db),{access:'public',addRandomSuffix:false,contentType:'application/json'});return db;}
export async function readDb(){return process.env.BLOB_READ_WRITE_TOKEN?blobRead():localRead();}
export async function writeDb(db){return process.env.BLOB_READ_WRITE_TOKEN?blobWrite(db):localWrite(db);}
export function id(prefix){return `${prefix}-${crypto.randomUUID()}`;}
export function slugify(value){return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}
