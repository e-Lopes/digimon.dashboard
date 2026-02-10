// 1. Mudei o nome para digistats e a versão para v2
const CACHE_NAME = 'digistats-v2';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.json'
];

// Instala o Service Worker
self.addEventListener('install', (event) => {
  // O skipWaiting faz o novo SW assumir o controle imediatamente
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// 2. LOGICA NOVA: Deleta o cache antigo (v1) para não dar conflito
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Limpando cache antigo...');
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Responde com o cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});