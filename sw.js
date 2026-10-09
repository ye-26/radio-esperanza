const VERSION = '1.0.15';
const CACHE_NAME = 'radio-esperanza-v' + VERSION;

const ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './config/pestañas.json',
    './config/mensajes.json',
    './secciones/bot/IA.html',
    './secciones/juego-biblico/index.html',
    './secciones/juego-biblico/datos/preguntas1.json',
    './secciones/juego-biblico/datos/creditos.json',
    './secciones/juego-biblico/datos/preguntas.json',
    './secciones/programacion/programacion.html',
    './secciones/programacion/horarios.json',
    './secciones/programacion/eventos.json',
    './secciones/recursos/recursos.html',
    './secciones/recursos/recursos/recursos.json',
    './secciones/recursos/recursos/categorias/escuela-sabatica.json',
    './secciones/sintonizar/sintonizar.html',
    './secciones/podcast/podcasts.html',
    './secciones/contacto/contacto.html'
];

self.addEventListener('install', (e) => {
    self.skipWaiting(); 
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            const requests = ASSETS.map(url => new Request(url, { cache: 'reload' }));
            return cache.addAll(requests);
        })
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim()) 
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((res) => {
            return res || fetch(e.request);
        })
    );
});
