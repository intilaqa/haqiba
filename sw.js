const V="haqiba-v1";
const LOCAL=["./","index.html","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png","icons/maskable-512.png","icons/apple-touch-icon.png"];
const CDN=["https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js","https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js","https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(async c=>{await c.addAll(LOCAL);await Promise.all(CDN.map(u=>fetch(u,{mode:"cors"}).then(r=>r.ok&&c.put(u,r)).catch(()=>{})))}));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{const r=e.request;if(r.method!=="GET")return;
  if(r.mode==="navigate"){e.respondWith(fetch(r).then(res=>{caches.open(V).then(c=>c.put("index.html",res.clone()));return res}).catch(()=>caches.match("index.html")));return}
  e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{if(res.ok&&(r.url.startsWith(self.location.origin)||r.url.includes("cdnjs")||r.url.includes("fonts.g"))){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp))}return res}).catch(()=>hit)))});
