const VERSION = '1.0.02';
const CACHE_NAME = 'radio-esperanza-juego-v' + VERSION;

const ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './config/pestañas.json',
    './secciones/juego-biblico/index.html',
    './secciones/juego-biblico/css/juego.css',
    './secciones/juego-biblico/config/juego.json',
    './secciones/juego-biblico/datos/preguntas1.json',
    './secciones/juego-biblico/datos/creditos.json',
    './secciones/juego-biblico/js/audio.js',
    './secciones/juego-biblico/js/creditos.js',
    './secciones/juego-biblico/js/juego.js'
];

// Instalar el nuevo caché y forzar al navegador a usarlo de inmediato
self.addEventListener('install', (e) => {
    self.skipWaiting(); 
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

// EL TRUCO QUE INVENTASTE: Leer el código de versión y borrar lo viejo
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    // Si el nombre del caché viejo no coincide con la versión nueva (ej. 1.0 vs 1.1), ¡mátalo!
                    if (key !== CACHE_NAME) {
                        console.log('Borrando versión vieja:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Usar el caché o buscar en internet
self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((res) => res || fetch(e.request))
    );
});
