const ADMINS=['rfernandohg@gmail.com','deisyveraguarani@gmail.com'];
const hash=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
function equal(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
async function passwordHash(password,salt){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);return hex(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256)));}
async function tables(db){await db.batch([db.prepare('CREATE TABLE IF NOT EXISTS admin_accounts (email TEXT PRIMARY KEY,salt TEXT NOT NULL,password TEXT NOT NULL)'),db.prepare('CREATE TABLE IF NOT EXISTS admin_sessions (id TEXT PRIMARY KEY,email TEXT NOT NULL,expires INTEGER NOT NULL)'),db.prepare('CREATE TABLE IF NOT EXISTS auth_attempts (email TEXT PRIMARY KEY,count INTEGER NOT NULL,reset INTEGER NOT NULL)')]);}
const cookieToken=request=>(request.headers.get('Cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('__Host-emilypy='))?.slice(15);
async function authorize(request,env){const token=cookieToken(request);if(!token||!/^[a-f0-9]{64}$/.test(token)||!env.CATALOG_DB)return null;await tables(env.CATALOG_DB);const row=await env.CATALOG_DB.prepare('SELECT email,expires FROM admin_sessions WHERE id=?').bind(await hash(token)).first();return row&&row.expires>Date.now()&&ADMINS.includes(row.email)?row.email:null;}
async function authRoute(path,request,env){
 const response=(value,status=200,cookie)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})}});
 if(request.method!=='POST')return response({error:'Método no permitido'},405);
 if(request.headers.get('Origin')!==new URL(request.url).origin)return response({error:'Origen no permitido'},403);
 if(!env.CATALOG_DB)return response({error:'Base de datos no disponible'},503);await tables(env.CATALOG_DB);
 if(path==='logout'){const token=cookieToken(request);if(token)await env.CATALOG_DB.prepare('DELETE FROM admin_sessions WHERE id=?').bind(await hash(token)).run();return response({ok:true},200,'__Host-emilypy=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0');}
 const body=await request.text();if(body.length>4000)return response({error:'Datos demasiado grandes'},413);let raw;try{raw=JSON.parse(body);}catch{return response({error:'Datos inválidos'},400);}
 const email=String(raw.email||'').trim().toLowerCase(),password=raw.password;
 if(!ADMINS.includes(email)||typeof password!=='string'||password.length<12||password.length>128)return response({error:'Revisa tu correo y contraseña. La contraseña debe tener entre 12 y 128 caracteres.'},400);
 const now=Date.now(),db=env.CATALOG_DB;
 await db.prepare('INSERT INTO auth_attempts(email,count,reset) VALUES (?,1,?) ON CONFLICT(email) DO UPDATE SET count=CASE WHEN reset<? THEN 1 ELSE count+1 END,reset=CASE WHEN reset<? THEN ? ELSE reset END').bind(email,now+900000,now,now,now+900000).run();
 const attempts=await db.prepare('SELECT count,reset FROM auth_attempts WHERE email=?').bind(email).first();if(attempts.count>8)return response({error:'Demasiados intentos. Espera 15 minutos antes de volver a intentar.'},429);
 if(path==='register'){
 const expected=email===ADMINS[0]?env.INVITE_FERNANDO:env.INVITE_DEISY;
 if(!expected||typeof raw.invite!=='string'||!equal(await hash(raw.invite),await hash(expected)))return response({error:'Enlace de activación inválido.'},403);
 const salt=hex(crypto.getRandomValues(new Uint8Array(24))),hashed=await passwordHash(password,salt);
 const result=await db.prepare('INSERT OR IGNORE INTO admin_accounts(email,salt,password) VALUES (?,?,?)').bind(email,salt,hashed).run();if(!result.meta.changes)return response({error:'Esta cuenta ya está activada. Inicia sesión con tu contraseña.'},409);
 }else if(path==='login'){
 const account=await db.prepare('SELECT salt,password FROM admin_accounts WHERE email=?').bind(email).first();const actual=await passwordHash(password,account?.salt||'emilypy-dummy-salt');if(!account||!equal(actual,account.password))return response({error:'Correo o contraseña incorrectos.'},401);
 }else return response({error:'No encontrado'},404);
 await db.prepare('DELETE FROM auth_attempts WHERE email=?').bind(email).run();await db.prepare('DELETE FROM admin_sessions WHERE expires<?').bind(now).run();
 const token=hex(crypto.getRandomValues(new Uint8Array(32)));await db.prepare('INSERT INTO admin_sessions(id,email,expires) VALUES (?,?,?)').bind(await hash(token),email,now+43200000).run();
 return response({ok:true,email},200,`__Host-emilypy=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`);
}


const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const text=(v,max=4000)=>typeof v==='string'?v.trim().slice(0,max):'';
function validateProduct(p){
 if(!p||typeof p!=='object'||!text(p.name,120)||!text(p.category,100)||!Number.isFinite(p.price)||p.price<0||p.price>100000)throw Error('Nombre, categoría y precio válido son obligatorios.');
 if(!Array.isArray(p.images)||p.images.length>12||p.images.some(s=>typeof s!=='string'||s.length>500||!(/^(fotos\/|imagenes\/|\/api\/images\/)/.test(s))))throw Error('Las fotos deben subirse desde el panel.');
 return {id:text(p.id,80)||crypto.randomUUID(),name:text(p.name,120),category:text(p.category,100),price:p.price,description:text(p.description),includes:text(p.includes),occasion:text(p.occasion,300),colors:text(p.colors,300),personalization:text(p.personalization,1000),leadTime:text(p.leadTime,300),images:p.images,visible:p.visible!==false,featured:p.featured===true,order:Number.isFinite(p.order)?p.order:0};
}
async function setup(db){await db.batch([db.prepare('CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, data TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1)'),db.prepare('CREATE TABLE IF NOT EXISTS images (id TEXT PRIMARY KEY, type TEXT NOT NULL, data BLOB NOT NULL)'),db.prepare('CREATE TABLE IF NOT EXISTS settings (id TEXT PRIMARY KEY, data TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1)')]);}
const defaultSettings={leadTime:'',delivery:'Entregas dentro de Pastaza. Consulta cobertura y costo por WhatsApp.',payment:'La disponibilidad, el valor final y la forma de pago se confirman por WhatsApp.',testimonials:[]};
async function catalog(env,request,privateView=false){
 const seed=await (await env.ASSETS.fetch(new URL('/catalogo-inicial.json',request.url))).json();
 if(!env.CATALOG_DB)return {...seed,settings:defaultSettings,configured:false};
 await setup(env.CATALOG_DB);
 const {results}=await env.CATALOG_DB.prepare('SELECT id,data,version FROM products').all();
 const products=new Map(seed.products.map(p=>[p.id,{...p,version:0}]));
 for(const row of results)products.set(row.id,{...JSON.parse(row.data),version:row.version});
 const settings=await env.CATALOG_DB.prepare("SELECT data,version FROM settings WHERE id='public'").first();
 return {products:[...products.values()].filter(p=>privateView||p.visible!==false),categories:seed.categories,settings:settings?{...defaultSettings,...JSON.parse(settings.data),version:settings.version}:{...defaultSettings,version:0},configured:true};
}
async function onRequest({request,env}){
 try{
 const url=new URL(request.url),path=url.pathname.replace(/^\/api\/?/,'');
 if(request.method==='GET'&&path==='catalog')return json(await catalog(env,request));
 if(request.method==='GET'&&/^images\/[a-z0-9-]+$/.test(path)){
 if(!env.CATALOG_DB)return new Response('No disponible',{status:404});await setup(env.CATALOG_DB);
 const image=await env.CATALOG_DB.prepare('SELECT type,data FROM images WHERE id=?').bind(path.split('/')[1]).first();
 if(!image)return new Response('No encontrada',{status:404});return new Response(Array.isArray(image.data)?new Uint8Array(image.data):image.data,{headers:{'Content-Type':image.type,'Cache-Control':'public,max-age=31536000,immutable','X-Content-Type-Options':'nosniff'}});}
 if(['auth/login','auth/register','auth/logout'].includes(path))return authRoute(path.split('/')[1],request,env);
 if(!path.startsWith('admin/'))return json({error:'No encontrado'},404);
 const email=await authorize(request,env);if(!email)return json({error:'Acceso privado. Inicia sesión con un correo autorizado.'},401);
 if(!env.CATALOG_DB)return json({error:'Falta conectar la base de datos.'},503);
 if(request.method!=='GET'&&request.headers.get('Origin')!==url.origin)return json({error:'Origen no permitido'},403);
 await setup(env.CATALOG_DB);
 if(request.method==='GET'&&path==='admin/catalog')return json({...await catalog(env,request,true),email});
 if(request.method==='POST'&&path==='admin/products'){
 if(Number(request.headers.get('Content-Length'))>50000)return json({error:'Datos demasiado grandes'},413);
 const body=await request.text();if(body.length>50000)return json({error:'Datos demasiado grandes'},413);
 const raw=JSON.parse(body),product=validateProduct(raw),expected=Number(raw.version)||0;
 let result;if(expected===0)result=await env.CATALOG_DB.prepare('INSERT OR IGNORE INTO products (id,data,version) VALUES (?,?,1)').bind(product.id,JSON.stringify(product)).run();
 else result=await env.CATALOG_DB.prepare('UPDATE products SET data=?,version=version+1 WHERE id=? AND version=?').bind(JSON.stringify(product),product.id,expected).run();
 if(!result.meta.changes)return json({error:'Otra persona modificó este producto. Recarga antes de guardar.'},409);
 return json({...product,version:expected+1});}
 if(request.method==='POST'&&path==='admin/images'){
 const length=Number(request.headers.get('Content-Length'));if(!length||length>1800000)return json({error:'La foto debe pesar menos de 1,8 MB.'},413);
 const bytes=new Uint8Array(await request.arrayBuffer());if(bytes.length>1800000)return json({error:'Foto demasiado grande'},413);
 let type;if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)type='image/jpeg';else if(bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71)type='image/png';else if(new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP')type='image/webp';else return json({error:'Usa fotografías JPG, PNG o WebP.'},400);
 const id=crypto.randomUUID();await env.CATALOG_DB.prepare('INSERT INTO images (id,type,data) VALUES (?,?,?)').bind(id,type,bytes.buffer).run();return json({url:`/api/images/${id}`},201);}
 if(request.method==='POST'&&path==='admin/settings'){
 const body=await request.text();if(body.length>15000)return json({error:'Datos demasiado grandes'},413);
 const raw=JSON.parse(body),value={leadTime:text(raw.leadTime,500),delivery:text(raw.delivery,1000),payment:text(raw.payment,1000),testimonials:(Array.isArray(raw.testimonials)?raw.testimonials:[]).slice(0,6).filter(t=>text(t.name)&&text(t.quote)).map(t=>({name:text(t.name,80),quote:text(t.quote,600)}))};
 const version=Number(raw.version)||0;const result=version===0?await env.CATALOG_DB.prepare("INSERT OR IGNORE INTO settings (id,data,version) VALUES ('public',?,1)").bind(JSON.stringify(value)).run():await env.CATALOG_DB.prepare("UPDATE settings SET data=?,version=version+1 WHERE id='public' AND version=?").bind(JSON.stringify(value),version).run();
 if(!result.meta.changes)return json({error:'La información cambió. Recarga antes de guardar.'},409);return json({...value,version:version+1});}
 return json({error:'Método no permitido'},405);
 }catch(e){console.error('Catalog API',e.message);return json({error:e instanceof SyntaxError?'Datos inválidos.':e.message?.startsWith('Nombre')||e.message?.startsWith('Las fotos')?e.message:'No se pudo completar la operación. Intenta de nuevo.'},400);}
}

export default {async fetch(request,env,ctx){
 const url=new URL(request.url);
 if(url.pathname.startsWith('/api/'))return onRequest({request,env,waitUntil:ctx.waitUntil.bind(ctx)});
 const routes={'/admin':'/admin.html','/admin/':'/admin.html','/admin/admin.js':'/admin.js','/admin/login.html':'/login.html','/admin/login.js':'/login.js'};
 if(routes[url.pathname]){url.pathname=routes[url.pathname];return env.ASSETS.fetch(new Request(url,request));}
 return env.ASSETS.fetch(request);
}};
