const VERSION = '1.0.26';
const CACHE_PREFIX = 'radio-esperanza-v';
const CACHE_NAME = CACHE_PREFIX + VERSION;
const DYNAMIC_JSON_PATHS = new Set([
    '/secciones/programacion/horarios.json',
    '/secciones/programacion/eventos.json',
    '/secciones/tv/programacion.json'
]);
const SHELL_ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './assets/images/fondo.jpg',
    './assets/images/notificaciones.jpg',
    './assets/win/close.svg',
    './assets/win/expandir.svg',
    './assets/win/home.svg',
    './assets/win/lupa.svg',
    './assets/win/x.svg',
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
    './assets/icons/sobre-nosotros.svg',
    './assets/icons/tv.svg',
    './config/pestañas.json',
    './config/mensajes.json',
    './mensajes.js'
];

function isSameOrigin(request) {
    return new URL(request.url).origin === self.location.origin;
}

function isDynamicScheduleJson(url) {
    const scopePath = new URL(self.registration.scope).pathname;
    const appPath = url.pathname.startsWith(scopePath) ? url.pathname.slice(scopePath.length) : url.pathname.replace(/^\/+/, '');
    return DYNAMIC_JSON_PATHS.has('/' + appPath.toLowerCase());
}

function isLazyAppResource(request) {
    const url = new URL(request.url);
    if (!url.pathname.includes('/secciones/')) return false;
    if (!['GET', 'HEAD'].includes(request.method)) return false;
    if (request.destination === 'audio' || request.destination === 'video' || request.destination === 'document' && /\.(pdf|mp3|mp4|m4a|ogg|wav|webm)$/i.test(url.pathname)) return false;
    return /\.(html?|json|css|js|svg|png|jpe?g|webp|gif|woff2?)$/i.test(url.pathname);
}

async function cachedResponse(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    const url = new URL(request.url);
    if (/\/podcasts\/podcasts\.json$/i.test(url.pathname)) {
        const normalized = new Request(url.origin + url.pathname, { method: 'GET' });
        const fallback = await cache.match(normalized);
        if (fallback) return fallback;
    }
    return null;
}

async function cacheFirst(request) {
    const cached = await cachedResponse(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
        const url = new URL(request.url);
        if (/\/podcasts\/podcasts\.json$/i.test(url.pathname)) {
            await cache.put(new Request(url.origin + url.pathname), response.clone());
        }
    }
    return response;
}

async function networkFirst(request) {
    try {
        const response = await fetch(request, { cache: 'no-store' });
        if (response.ok && response.type === 'basic') {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        return (await cachedResponse(request)) || Response.error();
    }
}

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
    event.waitUntil(caches.keys().then((keys) => Promise.all(
        keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key))
    )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET' || !isSameOrigin(request)) return;
    const url = new URL(request.url);
    if (isDynamicScheduleJson(url)) {
        event.respondWith(networkFirst(request));
        return;
    }
    if (url.pathname.includes('/secciones/') && isLazyAppResource(request)) {
        event.respondWith(cacheFirst(request).catch(async () => (await cachedResponse(request)) || Response.error()));
        return;
    }
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});
