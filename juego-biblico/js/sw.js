const CACHE_NAME = 'radio-esperanza-juego-v1';
const ASSETS = [
    '../config/juego.json',
    '../datos/preguntas.json',
    '../datos/creditos.json',
    '../css/juego.css',
    './audio.js',
    './creditos.js',
    './juego.js'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((res) => res || fetch(e.request))
    );
});