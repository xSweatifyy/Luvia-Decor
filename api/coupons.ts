import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL || '');
async function ensureTable(){
  await sql`CREATE TABLE IF NOT EXISTS coupons (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, type TEXT NOT NULL, value NUMERIC NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), note TEXT)`;
  await sql`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS note TEXT`;
  await sql`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS category_ids JSONB NOT NULL DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS remaining_value NUMERIC`;
}
function send(res:VercelResponse,status:number,body:unknown){res.setHeader('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate');res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','GET, POST, PUT, DELETE, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');return res.status(status).json(body)}
function parseCategoryIds(value:unknown): string[] { if (Array.isArray(value)) return value.map(String).map(v=>v.trim()).filter(Boolean); if (typeof value === 'string') { try { const parsed = JSON.parse(value); if (Array.isArray(parsed)) return parsed.map(String).map(v=>v.trim()).filter(Boolean); } catch {} } return []; }
function row(r:any){ return { id:r.id, code:String(r.code), type:r.type, value:Number(r.value), active:Boolean(r.active), createdAt:r.created_at, note:r.note||'', giftVoucher:r.note==='gift-voucher', categoryIds:parseCategoryIds(r.category_ids), remainingValue:r.remaining_value==null?Number(r.value):Number(r.remaining_value) }; }
async function validateCode(raw:unknown){
  const code=String(raw||'').replace(/\s+/g,' ').trim().toUpperCase();
  if(!code) return { status:400, body:{valid:false,error:'Zadejte slevový kód nebo kód dárkového poukazu.'} };
  const rows=await sql`SELECT id,code,type,value,active,created_at,note,category_ids,remaining_value FROM coupons WHERE UPPER(TRIM(code))=${code} AND active=TRUE LIMIT 1`;
  if(!rows.length) return { status:404, body:{valid:false,error:'Slevový kód nebo dárkový poukaz nebyl nalezen, je neaktivní nebo vypršel.'} };
  const result=row(rows[0]);
  if(result.value<=0 || (result.giftVoucher && result.remainingValue<=0)) return { status:400, body:{valid:false,error:'Tento kód již nemá žádnou využitelnou hodnotu.'} };
  return { status:200, body:{valid:true,...result} };
}
export default async function handler(req:VercelRequest,res:VercelResponse){
 if(req.method==='OPTIONS')return send(res,204,{});
 try{
  await ensureTable();
  const id=typeof req.query.id==='string'?req.query.id:undefined;
  const action=typeof req.query.action==='string'?req.query.action:undefined;
  if(action==='validate' && (req.method==='GET' || req.method==='POST')) { const raw=req.method==='GET' ? req.query.code : req.body?.code; const result=await validateCode(raw); return send(res,result.status,result.body); }
  if(req.method==='GET'){ const rows=await sql`SELECT id,code,type,value,active,created_at,note,category_ids,remaining_value FROM coupons ORDER BY created_at DESC`; return send(res,200,rows.map(row)); }
  if(req.method==='POST'){
    const code=String(req.body?.code||'').replace(/\s+/g,' ').trim().toUpperCase(); const type=req.body?.type==='fixed'?'fixed':'percent'; const value=Number(req.body?.value)||0; const note=String(req.body?.note||''); const categoryIds=parseCategoryIds(req.body?.categoryIds);
    if(!code||value<=0)return send(res,400,{error:'Zadejte kód a kladnou hodnotu slevy.'}); if(type==='percent'&&value>100)return send(res,400,{error:'Procentní sleva může být nejvýše 100 %.'});
    const voucher=note==='gift-voucher'; const idValue=`cup-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    const rows=await sql`INSERT INTO coupons (id,code,type,value,active,note,category_ids,remaining_value) VALUES (${idValue},${code},${type},${value},${req.body?.active!==false},${note},${JSON.stringify(categoryIds)}::jsonb,${voucher?value:null}) ON CONFLICT(code) DO UPDATE SET type=EXCLUDED.type,value=EXCLUDED.value,active=EXCLUDED.active,note=EXCLUDED.note,category_ids=EXCLUDED.category_ids,remaining_value=CASE WHEN EXCLUDED.note='gift-voucher' THEN COALESCE(coupons.remaining_value,EXCLUDED.value) ELSE coupons.remaining_value END RETURNING id,code,type,value,active,created_at,note,category_ids,remaining_value`;
    return send(res,201,row(rows[0]));
  }
  if(!id)return send(res,400,{error:'Chybí ID slevového kódu.'});
  if(req.method==='PUT'){ if(typeof req.body?.active==='boolean'){ const rows=await sql`UPDATE coupons SET active=${req.body.active} WHERE id=${id} RETURNING id,code,type,value,active,created_at,note,category_ids,remaining_value`; if(!rows.length)return send(res,404,{error:'Slevový kód nenalezen.'}); return send(res,200,row(rows[0])); } return send(res,400,{error:'Chybí data k aktualizaci.'}); }
  if(req.method==='DELETE'){await sql`DELETE FROM coupons WHERE id=${id}`;return send(res,200,{success:true});}
  return send(res,405,{error:'Metoda není podporovaná.'});
 }catch(error){ console.error('Coupons API error:',error); return send(res,500,{error:'Slevové kódy se nepodařilo načíst.',details:error instanceof Error?error.message:String(error)}); }
}
