const VERSION = '1.0.21';
const CACHE_NAME = 'radio-esperanza-v' + VERSION;

const ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './mensajes.js',
    './config/pestañas.json',
    './config/mensajes.json',
    './assets/images/fondo.jpg',
    './assets/images/notificaciones.jpg',
    './assets/win/close.svg',
    './assets/win/expandir.svg',
    './assets/win/home.svg',
    './assets/win/maximize.svg',
    './assets/win/maximize-pantalla.svg',
    './assets/win/minimize-pantalla.svg',
    './assets/win/minimize.svg',
    './assets/win/no-expandir.svg',
    './assets/icons/bot.svg',
    './assets/icons/contacto.svg',
    './assets/icons/juego-biblico.svg',
    './assets/icons/podcast.svg',
    './assets/icons/programacion.svg',
    './assets/icons/recursos.svg',
    './assets/icons/sintonizar.svg',
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
    './secciones/podcast/podcasts/podcasts.json',
    './secciones/podcast/podcasts/la-fe-de-Jesus/info.json',
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
