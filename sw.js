/**
 * حقيبة الجودة
 * Copyright 2026 نعيمة سعيد الرشيدي
 * @author نعيمة سعيد الرشيدي
 */
const V="haqiba-v6-6";
const LOCAL=["./","index.html","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png","icons/maskable-512.png","icons/apple-touch-icon.png"];
const CDN=["https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js","https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js","https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js","https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js","https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"];
const CACHE_HOSTS=["cdnjs","fonts.g","jsdelivr","tessdata"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(async c=>{await Promise.all(LOCAL.map(u=>c.add(u).catch(()=>{})));await Promise.all(CDN.map(u=>fetch(u,{mode:"cors"}).then(r=>r.ok&&c.put(u,r)).catch(()=>{})))}));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{const r=e.request;if(r.method!=="GET")return;
  if(r.mode==="navigate"){e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(V).then(c=>c.put("index.html",cp));return res}).catch(()=>caches.match("index.html")));return}
  e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{if(res.ok&&(r.url.startsWith(self.location.origin)||CACHE_HOSTS.some(h=>r.url.includes(h)))){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp))}return res}).catch(()=>Response.error())))});
