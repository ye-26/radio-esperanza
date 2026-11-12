import * as pdfjsLib from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.mjs';
import { createSearch } from './buscador.js?v=20261111-purple-controls-lock';
import { createCatalog } from './catalogo.js?v=20261111-purple-controls-lock';
import { createReader } from './lector.js?v=20261112-soft-zoom-fullscreen';
import { createDownloadManager } from './descargas.js?v=20261111-purple-controls-lock';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.worker.mjs';
const elements = {
    grid: document.querySelector('#bookGrid'), categories: document.querySelector('#categoryList'),
    resultsTitle: document.querySelector('#resultsTitle'), resultsCount: document.querySelector('#resultsCount'),
    status: document.querySelector('#statusMessage'), more: document.querySelector('#loadMore'),
    searchToggle: document.querySelector('#searchToggle'), searchPanel: document.querySelector('#searchPanel'),
    searchInput: document.querySelector('#searchInput'), searchForm: document.querySelector('#searchForm'),
    searchClear: document.querySelector('#searchClear'), suggestions: document.querySelector('#suggestions'),
    authorFilter: document.querySelector('#authorFilter'), sortSelect: document.querySelector('#sortSelect'),
    resetFilters: document.querySelector('#resetFilters')
};
let books = [];
let searchQuery = '';
let activeCategory = '';
let activeAuthor = '';
let sortMode = 'title';
const pageSize = 24;
const coverCache = new Map();
let coverObserver;

function normalize(value = '') {
    return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
}

function safeText(value) {
    return String(value ?? '').replace(/[\u0000-\u001f]/g, '').trim();
}

function validBook(entry, index) {
    if (!entry || typeof entry !== 'object') return null;
    const title = safeText(entry.title);
    const pdf = safeText(entry.pdf);
    if (!title || !pdf || /^(?:[a-z]+:|\/|\\)/i.test(pdf) || pdf.split('/').includes('..')) return null;
    const id = safeText(entry.id) || `libro-${index + 1}`;
    const keywords = Array.isArray(entry.keywords) ? entry.keywords.map(safeText).filter(Boolean) : [];
    return { ...entry, id, title, pdf, author: safeText(entry.author) || 'Autor no especificado', category: safeText(entry.category) || 'Sin categoría', description: safeText(entry.description), keywords };
}

function showStatus(message, visible = true) {
    elements.status.textContent = message;
    elements.status.hidden = !visible;
}

function getFilteredBooks() {
    return createCatalog({ books, search: { matches: createSearch.matches, query: searchQuery }, category: activeCategory, author: activeAuthor, sort: sortMode });
}

function renderCategories() {
    const counts = new Map();
    books.forEach(book => counts.set(book.category, (counts.get(book.category) || 0) + 1));
    const categories = [['', 'Todos los libros', books.length], ...Array.from(counts.entries()).sort(([a], [b]) => a.localeCompare(b, 'es')).map(([name, count]) => [name, name, count])];
    elements.categories.replaceChildren(...categories.map(([id, name, count]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `category-chip${activeCategory === id ? ' active' : ''}`;
        button.setAttribute('aria-pressed', String(activeCategory === id));
        button.innerHTML = `<span>${escapeHtml(name)}</span><em>${count}</em>`;
        button.addEventListener('click', () => { activeCategory = id; renderCatalog(); });
        return button;
    }));
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function renderCover(canvas, book, wrapper, loading) {
    const cached = coverCache.get(book.pdf);
    if (cached) {
        const context = canvas.getContext('2d');
        canvas.width = cached.width;
        canvas.height = cached.height;
        context.drawImage(cached, 0, 0);
        loading.classList.add('done');
        return;
    }
    if (wrapper.dataset.coverState === 'loading' || wrapper.dataset.coverState === 'done') return;
    wrapper.dataset.coverState = 'loading';
    const url = new URL(book.pdf, document.baseURI).href;
    const loadingTask = pdfjsLib.getDocument({ url, disableRange: false, disableStream: true, disableAutoFetch: true, rangeChunkSize: 65536, isEvalSupported: false });
    loadingTask.promise.then(async documentProxy => {
        const page = await documentProxy.getPage(1);
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(1.2, Math.max(0.55, 360 / baseViewport.width));
        const viewport = page.getViewport({ scale });
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await page.render({ canvasContext: canvas.getContext('2d', { alpha: false }), viewport }).promise;
        coverCache.set(book.pdf, canvas);
        wrapper.dataset.coverState = 'done';
        loading.classList.add('done');
        page.cleanup();
        await loadingTask.destroy();
    }).catch(() => {
        wrapper.dataset.coverState = 'failed';
        loading.classList.add('done');
        canvas.remove();
    });
}

function createCard(book) {
    const article = document.createElement('article');
    article.className = 'book-card';
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'book-open';
    open.dataset.bookId = book.id;
    open.setAttribute('aria-label', `Abrir ${book.title}`);
    const cover = document.createElement('span');
    cover.className = 'cover-wrap';
    cover._book = book;
    const fallback = document.createElement('span');
    fallback.className = 'cover-fallback';
    fallback.innerHTML = `<small>Biblioteca EGW</small><strong>${escapeHtml(book.title)}</strong><span>${escapeHtml(book.author)}</span>`;
    const canvas = document.createElement('canvas');
    canvas.className = 'cover-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    const loading = document.createElement('span');
    loading.className = 'cover-loading';
    loading.setAttribute('aria-label', 'Generando portada');
    cover.append(fallback, canvas, loading);
    const meta = document.createElement('span');
    meta.className = 'book-meta';
    meta.innerHTML = `<strong class="book-title">${escapeHtml(book.title)}</strong><span class="book-author">${escapeHtml(book.author)}</span><span class="book-category">${escapeHtml(book.category)}</span>`;
    open.append(cover, meta);
    article.append(open);
    if (coverObserver) coverObserver.observe(cover);
    return article;
}

function renderCatalog() {
    renderCategories();
    const filtered = getFilteredBooks();
    const previousScroll = window.scrollY;
    const visible = filtered.slice(0, pageSize);
    elements.grid.replaceChildren(...visible.map(createCard));
    coverObserver?.disconnect();
    elements.grid.querySelectorAll('.cover-wrap').forEach(cover => coverObserver?.observe(cover));
    elements.resultsTitle.textContent = searchQuery ? `Resultados para “${searchQuery}”` : activeCategory || 'Todos los libros';
    elements.resultsCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'libro' : 'libros'}`;
    elements.more.hidden = filtered.length <= pageSize;
    showStatus(filtered.length ? '' : (books.length ? 'No encontramos libros con esos filtros. Prueba otra búsqueda o restablece los filtros.' : 'El catálogo está vacío. Añade libros en config/libros.json para comenzar.'), !filtered.length);
    if (window.scrollY !== previousScroll) window.scrollTo({ top: previousScroll, behavior: 'instant' });
}

function populateAuthors() {
    const authors = Array.from(new Set(books.map(book => book.author))).sort((a, b) => a.localeCompare(b, 'es'));
    elements.authorFilter.replaceChildren(new Option('Todos los autores', ''), ...authors.map(author => new Option(author, author)));
}

coverObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const card = entry.target.closest('.book-card');
    const book = entry.target._book || card?._book;
    if (book) renderCover(entry.target.querySelector('canvas'), book, entry.target, entry.target.querySelector('.cover-loading'));
    coverObserver.unobserve(entry.target);
}), { rootMargin: '220px 0px' });

const reader = createReader({ pdfjsLib, elements: {
    shell: document.querySelector('#reader'), stage: document.querySelector('#readerStage'),
    canvas: document.querySelector('#pdfCanvas'), title: document.querySelector('#readerTitle'),
    status: document.querySelector('#readerStatus'), error: document.querySelector('#readerError'),
    indicator: document.querySelector('#pageIndicator'), pageInput: document.querySelector('#pageInput'), totalPages: document.querySelector('#totalPages'), progress: document.querySelector('#pageProgress'),
    close: document.querySelector('#readerClose'), fullscreen: document.querySelector('#fullscreenButton'),
    zoomIn: document.querySelector('#zoomIn'), zoomOut: document.querySelector('#zoomOut'),
    previous: document.querySelector('#previousPage'), next: document.querySelector('#nextPage'),
    orientation: document.querySelector('#orientationButton'), download: document.querySelector('#downloadPdf'), more: document.querySelector('#moreButton'), moreTray: document.querySelector('#readerMoreTray')
}, downloadManager: createDownloadManager() });

function reportReaderError(error) {
    const readerShell = document.querySelector('#reader');
    const readerError = document.querySelector('#readerError');
    const readerStatus = document.querySelector('#readerStatus');
    if (readerShell) {
        readerShell.hidden = false;
        readerShell.setAttribute('aria-hidden', 'false');
    }
    if (readerError) {
        readerError.textContent = `No se pudo iniciar el lector. ${error.message || 'Vuelve a cargar la página e inténtalo de nuevo.'}`;
        readerError.hidden = false;
    }
    const canvas = document.querySelector('#pdfCanvas');
    if (canvas) canvas.hidden = true;
    if (readerStatus) readerStatus.textContent = 'Error al abrir el lector';
}

function openBook(book) {
    try {
        reader.open(book).catch(reportReaderError);
    } catch (error) {
        reportReaderError(error);
    }
}

elements.grid.addEventListener('click', event => {
    const bookButton = event.target.closest('.book-open');
    if (!bookButton) return;
    const book = books.find(item => item.id === bookButton.dataset.bookId);
    if (book) openBook(book);
});
elements.searchToggle.addEventListener('click', () => {
    const isOpen = elements.searchToggle.getAttribute('aria-expanded') === 'true';
    elements.searchToggle.setAttribute('aria-expanded', String(!isOpen));
    elements.searchPanel.hidden = isOpen;
    if (!isOpen) elements.searchInput.focus();
});
elements.searchForm.addEventListener('submit', event => { event.preventDefault(); searchQuery = elements.searchInput.value.trim(); elements.suggestions.hidden = true; renderCatalog(); });
elements.searchInput.addEventListener('input', createSearch.debounce(() => {
    const query = elements.searchInput.value.trim();
    searchQuery = query;
    renderCatalog();
    const matches = books.filter(book => createSearch.matches(book, query)).slice(0, 6);
    elements.suggestions.replaceChildren(...matches.map(book => {
        const option = document.createElement('button');
        option.type = 'button';
        option.className = 'suggestion';
        option.setAttribute('role', 'option');
        option.innerHTML = `<span><strong>${escapeHtml(book.title)}</strong><small>${escapeHtml(book.author)} · ${escapeHtml(book.category)}</small></span>`;
        option.addEventListener('click', () => { elements.searchInput.value = book.title; searchQuery = book.title; elements.suggestions.hidden = true; renderCatalog(); openBook(book); });
        return option;
    }));
    elements.suggestions.hidden = !query || matches.length === 0;
}, 180));
elements.searchClear.addEventListener('click', () => { elements.searchInput.value = ''; searchQuery = ''; elements.suggestions.hidden = true; renderCatalog(); elements.searchInput.focus(); });
document.addEventListener('click', event => { if (!elements.searchPanel.contains(event.target)) elements.suggestions.hidden = true; });
elements.authorFilter.addEventListener('change', () => { activeAuthor = elements.authorFilter.value; renderCatalog(); });
elements.sortSelect.addEventListener('change', () => { sortMode = elements.sortSelect.value; renderCatalog(); });
elements.resetFilters.addEventListener('click', () => { activeCategory = ''; activeAuthor = ''; searchQuery = ''; elements.searchInput.value = ''; elements.authorFilter.value = ''; elements.sortSelect.value = 'title'; renderCatalog(); });
elements.more.addEventListener('click', () => {
    const filtered = getFilteredBooks();
    const count = elements.grid.children.length;
    elements.grid.append(...filtered.slice(count, count + pageSize).map(createCard));
    elements.more.hidden = elements.grid.children.length >= filtered.length;
});

try {
    const response = await fetch('./config/libros.json');
    if (!response.ok) throw new Error('El archivo de catálogo no está disponible.');
    const data = await response.json();
    books = (Array.isArray(data) ? data : data.books || []).map(validBook).filter(Boolean);
    populateAuthors();
    renderCatalog();
    if (navigator.onLine === false) showStatus(books.length ? 'Estás sin conexión. Solo estarán disponibles los recursos guardados previamente.' : 'No hay conexión y no se pudo cargar el catálogo.', true);
} catch (error) {
    showStatus(`${error.message} Revisa config/libros.json o vuelve a intentarlo cuando tengas conexión.`, true);
    elements.resultsCount.textContent = 'No se pudo cargar la biblioteca';
}
window.addEventListener('online', () => { if (!books.length) location.reload(); });




document.addEventListener('contextmenu', event => event.preventDefault());
document.addEventListener('dragstart', event => event.preventDefault());
