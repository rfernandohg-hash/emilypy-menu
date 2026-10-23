import fs from 'node:fs';
fs.mkdirSync('dist',{recursive:true});for(const f of ['index.html','style.css','app.js','admin.html','admin.js','login.html','login.js','catalogo-inicial.json','_worker.js','_routes.json','_headers','fotos','imagenes'])if(fs.existsSync(f))fs.cpSync(f,'dist/'+f,{recursive:true});console.log('Catálogo listo en dist');
