const VERSION = '1.0.05';
const CACHE_NAME = 'radio-esperanza-juego-v' + VERSION;

const ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './config/pestañas.json',
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
    './secciones/podcast/podcasts.htnl'
];


self.addEventListener('install', (e) => {
    self.skipWaiting(); 
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});




self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    //
                    if (key !== CACHE_NAME) {
                        console.log('Borrando versión vieja:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});


self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((res) => res || fetch(e.request))
    );
});
