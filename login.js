const $=s=>document.querySelector(s),params=new URLSearchParams(location.hash.slice(1));const invite=params.get('invite'),email=params.get('email');
if(invite){history.replaceState(null,'',location.pathname);$('#title').textContent='Activa tu cuenta.';$('#intro').textContent='Elige una contraseña de al menos 12 caracteres. Tu enlace de activación funciona una sola vez.';$('#submit').textContent='Crear mi contraseña';$('#confirm-wrap').hidden=false;$('#login').elements.confirmation.required=true;$('#login').elements.password.autocomplete='new-password';if(email){$('#login').elements.email.value=email;$('#login').elements.email.readOnly=true;}}
$('#login').onsubmit=async e=>{e.preventDefault();const f=e.target,d=Object.fromEntries(new FormData(f));if(invite&&d.password!==d.confirmation){$('#message').textContent='Las contraseñas no coinciden.';return;}$('#submit').disabled=true;$('#message').textContent='Comprobando…';try{const r=await fetch('/api/auth/'+(invite?'register':'login'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:d.email,password:d.password,...(invite?{invite}:{})})});const result=await r.json();if(!r.ok)throw Error(result.error||'No se pudo iniciar sesión.');f.reset();location.replace('/admin/');}catch(e){$('#message').textContent=e.message;$('#submit').disabled=false;}};

for(const name of ['password','confirmation']){
 const input=$('#login').elements[name];input.id='login-'+name;
 const wrapper=document.createElement('span');wrapper.style.cssText='display:block;position:relative';
 input.parentNode.insertBefore(wrapper,input);wrapper.append(input);input.style.paddingRight='116px';
 const toggle=document.createElement('button');toggle.type='button';toggle.setAttribute('aria-controls',input.id);toggle.setAttribute('aria-pressed','false');
 toggle.style.cssText='position:absolute;right:6px;top:6px;bottom:6px;display:flex;align-items:center;justify-content:center;gap:6px;min-width:100px;border:0;border-radius:4px;background:#f4e7e8;color:#702f4a;font-size:12px;font-weight:600;cursor:pointer';
 const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('width','20');icon.setAttribute('height','20');icon.setAttribute('fill','none');icon.setAttribute('stroke','currentColor');icon.setAttribute('stroke-width','1.8');icon.setAttribute('aria-hidden','true');
 const outline=document.createElementNS(icon.namespaceURI,'path');outline.setAttribute('d','M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z');
 const pupil=document.createElementNS(icon.namespaceURI,'circle');pupil.setAttribute('cx','12');pupil.setAttribute('cy','12');pupil.setAttribute('r','3');
 const slash=document.createElementNS(icon.namespaceURI,'path');slash.setAttribute('d','m3 3 18 18');slash.style.display='none';icon.append(outline,pupil,slash);
 const caption=document.createElement('span');caption.textContent='Mostrar';toggle.append(icon,caption);toggle.setAttribute('aria-label',name==='confirmation'?'Mostrar confirmación de contraseña':'Mostrar contraseña');
 toggle.onclick=()=>{const visible=input.type==='password';input.type=visible?'text':'password';caption.textContent=visible?'Ocultar':'Mostrar';slash.style.display=visible?'':'none';toggle.setAttribute('aria-pressed',String(visible));toggle.setAttribute('aria-label',(visible?'Ocultar':'Mostrar')+(name==='confirmation'?' confirmación de contraseña':' contraseña'));};
 wrapper.append(toggle);
}
