import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL || '');
const slugify=(v:string)=>v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export default async function handler(req:VercelRequest,res:VercelResponse){
 res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','GET, POST, PUT, DELETE, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
 if(req.method==='OPTIONS')return res.status(204).end();
 try{
  await sql`CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  const count=await sql`SELECT COUNT(*)::int AS count FROM categories`;
  if(Number(count[0]?.count||0)===0) await sql`INSERT INTO categories (id,name) SELECT DISTINCT regexp_replace(regexp_replace(lower(trim(data->>'category')),'[^a-z0-9]+','-','g'),'(^-|-$)','','g'),trim(data->>'category') FROM products WHERE COALESCE(trim(data->>'category'),'')<>'' ON CONFLICT(id) DO NOTHING`;
  if(req.method==='GET')return res.status(200).json(await sql`SELECT id,name FROM categories ORDER BY name ASC`);
  if(req.method==='POST'){const name=String(req.body?.name||'').trim(),id=String(req.body?.id||slugify(name));if(!name)return res.status(400).json({error:'Název kategorie je povinný.'});const rows=await sql`INSERT INTO categories(id,name) VALUES(${id},${name}) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,updated_at=NOW() RETURNING id,name`;return res.status(201).json(rows[0]);}
  const id=typeof req.query.id==='string'?req.query.id:'';if(!id)return res.status(400).json({error:'Chybí ID kategorie.'});
  if(req.method==='PUT'){const name=String(req.body?.name||'').trim();const rows=await sql`UPDATE categories SET name=${name},updated_at=NOW() WHERE id=${id} RETURNING id,name`;if(!rows.length)return res.status(404).json({error:'Kategorie nenalezena.'});return res.status(200).json(rows[0]);}
  if(req.method==='DELETE'){await sql`DELETE FROM categories WHERE id=${id}`;return res.status(200).json({success:true});}
  return res.status(405).json({error:'Metoda není podporovaná.'});
 }catch(error:any){console.error('Categories API error:',error);return res.status(500).json({error:'Kategorie se nepodařilo načíst.',details:error?.message||String(error)});}
}
