import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
fs.mkdirSync('dist',{recursive:true});
for(const f of ['index.html','style.css','app.js','admin.html','admin.js','login.html','login.js','catalogo-inicial.json','_worker.js','_routes.json','_headers','fotos','imagenes'])if(fs.existsSync(f))fs.cpSync(f,'dist/'+f,{recursive:true});
function list(dir){return fs.existsSync(dir)?fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?list(path.join(dir,e.name)):[path.join(dir,e.name)]):[];}
const pictures=['fotos','imagenes'].flatMap(list).filter(p=>/\.(jpe?g|png|webp)$/i.test(p));
let cursor=0,total=0;sharp.concurrency(1);
await Promise.all(Array.from({length:4},async()=>{while(cursor<pictures.length){const input=pictures[cursor++];for(const width of [480,960]){const target=path.join('dist','optimized',input+'.'+width+'.webp');fs.mkdirSync(path.dirname(target),{recursive:true});await sharp(input).rotate().resize({width,height:width,fit:'cover',withoutEnlargement:true}).webp({quality:76,effort:4}).toFile(target);total++;}}}));
console.log(`Catálogo listo: ${total} imágenes optimizadas para teléfono y computadora.`);
