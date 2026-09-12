import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

export interface CustomerAddress { id:string; label:string; fullName:string; phone:string; street:string; city:string; zip:string; country:string; }
export interface CustomerCollection { id:string; name:string; note?:string; productIds:string[]; createdAt:string; updatedAt:string; }
export interface CustomerPreferences { styles:string[]; colors:string[]; }
export interface CustomerAccount { id:string; email:string; passwordHash:string; name:string; phone:string; createdAt:string; lastLogin?:string; addresses:CustomerAddress[]; favorites:string[]; collections:CustomerCollection[]; preferences:CustomerPreferences; }

const DATA_DIR = process.env.LUVIA_DATA_DIR ? path.resolve(process.env.LUVIA_DATA_DIR) : path.join(process.cwd(),'data');
const DATABASE_FILE = path.join(DATA_DIR,'luvia.sqlite');
const sessions = new Map<string,string>();

let database: Database.Database | null = null;
function getDb(){
  if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR,{recursive:true});
  if(!database) {
    database = new Database(DATABASE_FILE);
    database.exec(`CREATE TABLE IF NOT EXISTS customer_accounts (id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,data TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`);
  }
  return database;
}
function hashPassword(password:string){ return crypto.createHash('sha256').update(password).digest('hex'); }
function makeToken(id:string){ return `${id}.${crypto.randomBytes(32).toString('hex')}`; }
function safeAccount(a:CustomerAccount){ const {passwordHash,...safe}=a; return safe; }

export function createCustomer(input:{email:string;password:string;name:string;phone?:string}){
  const email=input.email.trim().toLowerCase();
  if(!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Zadejte platný e-mail.');
  if(input.password.length<8) throw new Error('Heslo musí mít alespoň 8 znaků.');
  const existing=getDb().prepare('SELECT id FROM customer_accounts WHERE email=?').get(email);
  if(existing) throw new Error('Účet s tímto e-mailem již existuje.');
  const now=new Date().toISOString();
  const account:CustomerAccount={id:`cust-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,email,passwordHash:hashPassword(input.password),name:input.name.trim()||email.split('@')[0],phone:input.phone?.trim()||'',createdAt:now,addresses:[],favorites:[],collections:[],preferences:{styles:[],colors:[]}};
  getDb().prepare('INSERT INTO customer_accounts(id,email,password_hash,data,created_at,updated_at) VALUES(?,?,?,?,?,?)').run(account.id,email,account.passwordHash,JSON.stringify(account),now,now);
  const token=makeToken(account.id); sessions.set(token,account.id);
  return {user:safeAccount(account),token};
}
export function loginCustomer(emailInput:string,password:string){
  const email=emailInput.trim().toLowerCase();
  const row=getDb().prepare('SELECT data FROM customer_accounts WHERE email=?').get(email) as {data:string}|undefined;
  if(!row) return null;
  const account=JSON.parse(row.data) as CustomerAccount;
  if(account.passwordHash!==hashPassword(password)) return null;
  account.lastLogin=new Date().toISOString(); saveCustomer(account);
  const token=makeToken(account.id); sessions.set(token,account.id);
  return {user:safeAccount(account),token};
}
export function getCustomer(token:string|undefined){
  if(!token) return null;
  const id=sessions.get(token); if(!id) return null;
  const row=getDb().prepare('SELECT data FROM customer_accounts WHERE id=?').get(id) as {data:string}|undefined;
  if(!row){ sessions.delete(token); return null; }
  return JSON.parse(row.data) as CustomerAccount;
}
export function logoutCustomer(token:string|undefined){ if(token) sessions.delete(token); }
export function saveCustomer(account:CustomerAccount){
  const now=new Date().toISOString();
  getDb().prepare('UPDATE customer_accounts SET password_hash=?,data=?,updated_at=? WHERE id=?').run(account.passwordHash,JSON.stringify(account),now,account.id);
  return safeAccount(account);
}
export function updateCustomer(token:string|undefined,updates:Partial<Pick<CustomerAccount,'name'|'phone'|'favorites'|'addresses'|'collections'|'preferences'>>){
  const account=getCustomer(token); if(!account) return null;
  if(updates.name!==undefined) account.name=String(updates.name).trim();
  if(updates.phone!==undefined) account.phone=String(updates.phone).trim();
  if(updates.favorites!==undefined) account.favorites=Array.from(new Set((updates.favorites||[]).map(String)));
  if(updates.addresses!==undefined) account.addresses=updates.addresses as CustomerAddress[];
  if(updates.collections!==undefined) account.collections=updates.collections as CustomerCollection[];
  if(updates.preferences!==undefined) account.preferences={styles:Array.isArray(updates.preferences.styles)?updates.preferences.styles.map(String):[],colors:Array.isArray(updates.preferences.colors)?updates.preferences.colors.map(String):[]};
  return saveCustomer(account);
}
export function changeCustomerPassword(token:string|undefined,currentPassword:string,newPassword:string){
  const account=getCustomer(token); if(!account) throw new Error('Nejste přihlášeni.');
  if(account.passwordHash!==hashPassword(currentPassword)) throw new Error('Současné heslo není správné.');
  if(newPassword.length<8) throw new Error('Nové heslo musí mít alespoň 8 znaků.');
  account.passwordHash=hashPassword(newPassword); saveCustomer(account); return true;
}
