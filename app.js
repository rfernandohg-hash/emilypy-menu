const $=s=>document.querySelector(s),money=n=>new Intl.NumberFormat('es-EC',{style:'currency',currency:'USD'}).format(n);
let catalog,category='Todos',limit=8,selected,step=0,galleryImages=[],photoIndex=0;
const el=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n;};
const imageURL=s=>s.startsWith('/')?s:'/'+s;

function setPhoto(img,source,hero=false){
 const original=imageURL(source);img.decoding='async';
 if(/^(\/?fotos\/|\/?imagenes\/)/.test(source)){
  const base='/optimized/'+source.replace(/^\//,'').split('/').map(encodeURIComponent).join('/');img.sizes=hero?'(max-width:600px) 90vw, 560px':'(max-width:600px) calc((100vw - 50px)/2), (max-width:1100px) calc((100vw - 92px)/2), 380px';
  img.srcset=base+'.480.webp?v=2 480w, '+base+'.960.webp?v=2 960w';img.src=base+(hero?'.960.webp?v=2':'.480.webp?v=2');
  img.onerror=()=>{img.onerror=null;img.removeAttribute('srcset');img.src=original;};
 }else img.src=original;
}

async function load(){try{const r=await fetch('/api/catalog');if(!r.ok)throw Error();catalog=await r.json();}catch{try{catalog=await(await fetch('/catalogo-inicial.json')).json();}catch{$('#products').textContent='No pudimos cargar el catálogo. Recarga o escríbenos por WhatsApp.';return;}}
 const hero=catalog.products.find(p=>p.images.length);if(hero)setPhoto($('#hero-image'),hero.images[0],true);
 for(const key of ['leadTime','delivery','payment'])if(catalog.settings?.[key])$('#'+key).textContent=catalog.settings[key];
 if(!$('#delivery').textContent)$('#delivery').textContent='Entregas dentro de Pastaza. Consulta cobertura y costo por WhatsApp.';
 if(!$('#payment').textContent)$('#payment').textContent='Confirmaremos disponibilidad, personalización, valor final y forma de pago por WhatsApp.';
 const quotes=catalog.settings?.testimonials||[];$('#testimonials').hidden=!quotes.length;for(const q of quotes){const card=el('blockquote','quote');card.append(el('p','',q.quote),el('cite','',q.name));$('#quotes').append(card);}
 categories();render();}
function categories(){const names=['Todos',...new Set(catalog.products.map(p=>p.category))];$('#categories').replaceChildren(...names.map(name=>{const b=el('button','chip'+(category===name?' active':''),name);b.setAttribute('aria-pressed',category===name);b.onclick=()=>{category=name;limit=8;categories();render();};return b;}));}
function render(){const term=$('#search').value.trim().toLocaleLowerCase('es');let products=catalog.products.filter(p=>p.visible!==false&&(category==='Todos'||p.category===category)&&[p.name,p.description,p.occasion,p.category,p.id].join(' ').toLocaleLowerCase('es').includes(term));
 const sort=$('#sort').value;products.sort((a,b)=>sort==='low'?a.price-b.price:sort==='high'?b.price-a.price:Number(b.featured)-Number(a.featured)||a.order-b.order);
 $('#category-title').textContent=category==='Todos'?'Todos los detalles':category;$('#count').textContent=products.length+' opciones';$('#products').replaceChildren();
 for(const p of products.slice(0,limit)){
 const card=el('article','card'),photo=el('button','card-photo');photo.type='button';photo.setAttribute('aria-label','Ver fotos de '+p.name);
 if(p.images.length){const img=el('img');img.alt=p.name;img.loading='lazy';setPhoto(img,p.images[0]);img.width=500;img.height=525;photo.append(img);}else photo.append(el('span','','Foto próximamente'));
 if(p.featured)photo.append(el('span','badge','Destacado'));if(p.images.length>1)photo.append(el('span','photo-count',p.images.length+' fotos'));photo.onclick=()=>openGallery(p);
 const body=el('div','card-body');body.append(el('span','card-category',p.category),el('h3','',p.name),el('p','card-description',p.description));
 const fields=[['Incluye',p.includes],['Ocasión',p.occasion],['Colores',p.colors],['Personalización',p.personalization],['Anticipación',p.leadTime]];
 {const hasExtra=fields.some(([,v])=>v),detail=el('details','product-details'+(hasExtra?' has-extra':''));detail.append(el('summary','','Ver detalles'),el('p','detail-description',p.description));for(const [label,value]of fields)if(value)detail.append(el('p','',label+': '+value));body.append(detail);}
 const bottom=el('div','card-bottom'),price=el('div','price',money(p.price));price.append(el('small','','Precio referencial'));const choose=el('button','button','Lo quiero');choose.onclick=()=>openOrder(p);bottom.append(price,choose);body.append(bottom);card.append(photo,body);$('#products').append(card);}
 if(!products.length)$('#products').append(el('p','empty','No hay resultados. Prueba otra palabra o categoría.'));$('#more').hidden=products.length<=limit;
}
$('#search').oninput=()=>{limit=8;render();};$('#sort').onchange=render;$('#more').onclick=()=>{limit+=8;render();};
function openGallery(p){if(!p.images.length)return;galleryImages=p.images;photoIndex=0;$('#gallery-photo').alt=p.name;updatePhoto();$('#gallery').showModal();}
function updatePhoto(){$('#gallery-photo').src=imageURL(galleryImages[photoIndex]);$('#photo-counter').textContent=(photoIndex+1)+' / '+galleryImages.length;$('#previous-photo').hidden=$('#next-photo').hidden=galleryImages.length<2;}
$('#previous-photo').onclick=()=>{photoIndex=(photoIndex-1+galleryImages.length)%galleryImages.length;updatePhoto();};$('#next-photo').onclick=()=>{photoIndex=(photoIndex+1)%galleryImages.length;updatePhoto();};$('#close-gallery').onclick=()=>$('#gallery').close();
function openOrder(p){selected=p;step=0;$('#selected').textContent=p.name+' · '+money(p.price);$('#order-error').textContent='';showStep();$('#order-dialog').showModal();}
function showStep(){document.querySelectorAll('[data-step]').forEach((n,i)=>n.hidden=i!==step);$('#back').hidden=step===0;$('#next').hidden=step===2;$('#send').hidden=step!==2;$('#step-label').textContent=(step+1)+' de 3 · '+['Tus datos','Entrega','Personalización'][step];}
function validStep(){for(const input of document.querySelectorAll('[data-step="'+step+'"] input'))if(!input.reportValidity())return false;return true;}
$('#next').onclick=()=>{if(validStep()){step++;showStep();}};$('#back').onclick=()=>{step--;showStep();};$('#close-order').onclick=()=>$('#order-dialog').close();
$('#order-form').noValidate=true;
$('#order-form').onsubmit=e=>{e.preventDefault();if(step!==2){$('#next').click();return;}if(!selected||!validStep())return;const d=Object.fromEntries(new FormData(e.target));const message=['Hola Emily Py, quisiera coordinar este pedido:','',selected.name+' ('+selected.id+')','Categoría: '+selected.category,'Precio referencial: '+money(selected.price),'','Nombre: '+d.customer,'Teléfono: '+d.phone,'Fecha deseada: '+(d.date||'Por coordinar'),'Hora: '+(d.time||'Por coordinar'),'Dirección en Pastaza: '+d.address,'Mapa: '+(d.map||'No enviado'),'Dedicatoria y personalización: '+(d.note||'Por coordinar'),'Pago: '+d.payment,'','Quedo pendiente de confirmar disponibilidad, valor final y entrega.'].join('\n');window.open('https://wa.me/593988119393?text='+encodeURIComponent(message),'_blank','noopener');};
$('#order-form [name=date]').min=new Date().toLocaleDateString('en-CA');load();
