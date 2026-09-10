import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
const sql=neon(process.env.DATABASE_URL||'');
const send=(res:VercelResponse,status:number,body:unknown)=>{res.setHeader('Cache-Control','no-store');res.setHeader('Access-Control-Allow-Origin','*');return res.status(status).json(body)};

export default async function handler(req:VercelRequest,res:VercelResponse){
 if(req.method!=='POST')return send(res,405,{error:'Metoda není podporovaná.'});
 try{
  const orderId=String(req.body?.orderId||'').trim();
  const allowBank=Boolean(req.body?.allowBankRemainder);
  const rawCards=Array.isArray(req.body?.cards)?req.body.cards:[req.body];
  if(!orderId||!rawCards.length)return send(res,400,{error:'Chybí objednávka nebo dárková karta.'});
  await sql`CREATE TABLE IF NOT EXISTS coupons (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, type TEXT NOT NULL, value NUMERIC NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), note TEXT, category_ids JSONB NOT NULL DEFAULT '[]'::jsonb, remaining_value NUMERIC, security_code TEXT)`;
  await sql`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS remaining_value NUMERIC`;
  await sql`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS security_code TEXT`;
  const orders=await sql`SELECT data FROM orders WHERE id=${orderId} LIMIT 1`;
  if(!orders.length)return send(res,404,{error:'Objednávka nebyla nalezena.'});
  const order=orders[0].data||{};
  const total=Number(order.totalPrice||0);
  let due=total;
  const verified:any[]=[];
  const seen=new Set<string>();
  for(const raw of rawCards){
   const code=String(raw?.code||'').trim().toUpperCase();const securityCode=String(raw?.securityCode||'').trim().toUpperCase();
   if(!code||!securityCode||seen.has(code))continue;seen.add(code);
   const rows=await sql`SELECT id,code,value,active,remaining_value,security_code FROM coupons WHERE UPPER(TRIM(code))=${code} AND note='gift-voucher' LIMIT 1`;
   if(!rows.length||!rows[0].active)return send(res,404,{error:`Dárková karta ${code} nebyla nalezena nebo je neaktivní.`});
   if(!rows[0].security_code||String(rows[0].security_code).trim().toUpperCase()!==securityCode)return send(res,403,{error:`Bezpečnostní kód dárkové karty ${code} není správný.`});
   verified.push({id:rows[0].id,code,securityCode,balance:Number(rows[0].remaining_value??rows[0].value??0)});
  }
  if(!verified.length)return send(res,400,{error:'Nebyla zadána platná dárková karta.'});
  const available=verified.reduce((s,c)=>s+c.balance,0);
  if(available+0.009<due&&!allowBank)return send(res,409,{error:`Nedostatečný zůstatek. Karty mají dohromady ${available.toLocaleString('cs-CZ',{minimumFractionDigits:2})} Kč.`});
  const deductions:{id:string;amount:number}[]=[];let used=0;
  try{
   for(const card of verified){if(due<=0)break;const amount=Math.min(due,card.balance);if(amount<=0)continue;const d=await sql`UPDATE coupons SET remaining_value=GREATEST(0,COALESCE(remaining_value,value)-${amount}),active=CASE WHEN COALESCE(remaining_value,value)-${amount}<=0 THEN FALSE ELSE active END WHERE id=${card.id} AND active=TRUE AND COALESCE(remaining_value,value)>=${amount} RETURNING remaining_value`;if(!d.length)throw new Error(`Zůstatek karty ${card.code} se mezitím změnil. Ověřte kartu znovu.`);deductions.push({id:card.id,amount});due=Math.max(0,due-amount);used+=amount}
  }catch(error){for(const d of deductions){await sql`UPDATE coupons SET remaining_value=COALESCE(remaining_value,0)+${d.amount},active=TRUE WHERE id=${d.id}`;}throw error}
  const updated={...order,paymentMethod:due>0?'gift_card_plus_bank_transfer':'gift_card',status:due>0?'čeká na platbu':'zaplaceno',giftCardPayment:true,giftCardCodes:verified.map(c=>c.code),giftCardUsed:used,giftCardRemainingDue:due,totalPrice:due,giftCardOriginalTotal:total};
  await sql`UPDATE orders SET data=${JSON.stringify(updated)}::jsonb WHERE id=${orderId}`;
  return send(res,200,{success:true,order:updated,usedAmount:used,remainingDue:due});
 }catch(error:any){console.error('Gift card payment error:',error);return send(res,500,{error:error?.message||'Platbu dárkovou kartou se nepodařilo dokončit.'})}
}
