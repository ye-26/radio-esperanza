export function createReader({ pdfjsLib, elements, downloadManager }) {
    let documentProxy = null;
    let loadingTask = null;
    let currentBook = null;
    let currentPage = 1;
    let scale = 1;
    let renderTask = null;
    let generation = 0;
    let viewportResize;
    let idleTimer;
    let loadGeneration = 0;

    function updateControls() {
        elements.pageInput.value = documentProxy ? currentPage : 1;
        elements.pageInput.max = documentProxy ? documentProxy.numPages : 1;
        elements.totalPages.textContent = documentProxy ? documentProxy.numPages : '—';
        elements.previous.disabled = !documentProxy || currentPage <= 1;
        elements.next.disabled = !documentProxy || currentPage >= documentProxy.numPages;
        elements.progress.style.width = documentProxy ? `${(currentPage / documentProxy.numPages) * 100}%` : '0%';
    }

    function scheduleIdle() {
        clearTimeout(idleTimer);
        elements.shell.classList.remove('controls-idle');
        if (!elements.shell.hidden && elements.moreTray.hidden) {
            idleTimer = setTimeout(() => elements.shell.classList.add('controls-idle'), 3000);
        }
    }

    function setMoreTray(open) {
        elements.moreTray.hidden = !open;
        elements.more.setAttribute('aria-expanded', String(open));
        if (open) {
            clearTimeout(idleTimer);
            elements.shell.classList.remove('controls-idle');
        } else {
            scheduleIdle();
        }
    }

    async function renderPage() {
        if (!documentProxy) return;
        const myGeneration = ++generation;
        const previousRenderTask = renderTask;
        if (previousRenderTask) {
            previousRenderTask.cancel();
            try { await previousRenderTask.promise; } catch {}
            if (myGeneration !== generation) return;
            renderTask = null;
        }
        elements.shell.classList.add('is-loading');
        const page = await documentProxy.getPage(currentPage);
        if (myGeneration !== generation) return;
        const availableWidth = Math.max(200, elements.stage.clientWidth);
        const availableHeight = Math.max(180, elements.stage.clientHeight);
        const baseViewport = page.getViewport({ scale: 1 });
        const fitScale = window.matchMedia('(orientation: landscape)').matches
            ? Math.min(availableWidth / baseViewport.width, 3)
            : Math.min(availableWidth / baseViewport.width, availableHeight / baseViewport.height, 2.2);
        const viewport = page.getViewport({ scale: Math.max(.3, fitScale * scale) });
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const canvas = elements.canvas;
        canvas.width = Math.ceil(viewport.width * ratio);
        canvas.height = Math.ceil(viewport.height * ratio);
        canvas.style.width = `${Math.ceil(viewport.width)}px`;
        canvas.style.height = `${Math.ceil(viewport.height)}px`;
        const context = canvas.getContext('2d', { alpha: false });
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        renderTask = page.render({ canvasContext: context, viewport });
        try {
            await renderTask.promise;
            if (myGeneration === generation) elements.status.textContent = `${currentBook.title} · Página ${currentPage}`;
        } catch (error) {
            if (error.name !== 'RenderingCancelledException') throw error;
        } finally {
            if (myGeneration === generation) {
                renderTask = null;
                elements.shell.classList.remove('is-loading');
                updateControls();
            }
            page.cleanup();
        }
    }

    function goToPage(value) {
        if (!documentProxy) return;
        const requestedPage = Number.parseInt(value, 10);
        if (!Number.isFinite(requestedPage)) {
            elements.pageInput.value = currentPage;
            return;
        }
        currentPage = Math.min(documentProxy.numPages, Math.max(1, requestedPage));
        elements.pageInput.value = currentPage;
        scheduleIdle();
        renderPage().catch(error => { elements.status.textContent = `No se pudo mostrar la página: ${error.message}`; });
    }

    async function open(book) {
        closeDocument();
        currentBook = book;
        currentPage = 1;
        scale = 1;
        elements.title.textContent = book.title;
        elements.status.textContent = 'Cargando documento…';
        elements.error.hidden = true;
        elements.canvas.hidden = false;
        elements.shell.hidden = false;
        elements.shell.setAttribute('aria-hidden', 'false');
        elements.shell.classList.add('is-loading');
        setMoreTray(false);
        updateControls();
        scheduleIdle();
        document.body.style.overflow = 'hidden';

        if (elements.shell.requestFullscreen) {
            try { elements.shell.requestFullscreen().catch(() => {}); }
            catch {}
        }

        const currentLoad = loadGeneration;
        const pdfUrl = new URL(book.pdf, document.baseURI).href;
        try {
            try {
                documentProxy = await loadPdf(pdfUrl, {
                    disableRange: false,
                    disableStream: true,
                    disableAutoFetch: true,
                    rangeChunkSize: 65536,
                    isEvalSupported: false
                }, currentLoad);
            } catch (rangeError) {
                if (currentLoad !== loadGeneration || elements.shell.hidden) return;
                elements.status.textContent = 'Conexión parcial no disponible; cargando el PDF…';
                documentProxy = await loadPdf(pdfUrl, {
                    disableRange: true,
                    disableStream: false,
                    disableAutoFetch: false,
                    isEvalSupported: false
                }, currentLoad);
            }
            if (currentLoad !== loadGeneration || elements.shell.hidden) return;
            updateControls();
            await renderPage();
        } catch (error) {
            if (currentLoad !== loadGeneration || elements.shell.hidden) return;
            elements.shell.classList.remove('is-loading');
            elements.canvas.hidden = true;
            elements.error.textContent = `No fue posible abrir este documento. ${error.message || 'Comprueba que el PDF esté disponible en la carpeta libros.'}`;
            elements.error.hidden = false;
            elements.status.textContent = 'Documento no disponible';
        }
    }

    function loadPdf(url, options, currentLoad) {
        const task = pdfjsLib.getDocument({ url, ...options });
        loadingTask = task;
        let watchdog;
        let settled = false;
        let rejectStall;
        const stopWatchdog = () => clearTimeout(watchdog);
        const timeout = new Promise((_, reject) => { rejectStall = reject; });
        const armWatchdog = () => {
            stopWatchdog();
            watchdog = setTimeout(() => {
                if (settled || currentLoad !== loadGeneration) return;
                task.destroy().catch(() => {});
                rejectStall(new Error('La carga del PDF se detuvo por falta de respuesta.'));
            }, 18000);
        };
        task.onProgress = progress => {
            if (settled || currentLoad !== loadGeneration) return;
            const loaded = Number(progress?.loaded) || 0;
            const total = Number(progress?.total) || 0;
            elements.status.textContent = total
                ? `Cargando documento… ${Math.min(99, Math.round(loaded / total * 100))}%`
                : `Cargando documento… ${Math.ceil(loaded / 1024)} KB`;
            armWatchdog();
        };
        armWatchdog();
        return Promise.race([task.promise, timeout]).finally(() => {
            settled = true;
            stopWatchdog();
        });
    }
    function closeDocument() {
        loadGeneration++;
        generation++;
        renderTask?.cancel();
        renderTask = null;
        if (loadingTask) loadingTask.destroy().catch(() => {});
        loadingTask = null;
        documentProxy = null;
    }

    function close() {
        clearTimeout(idleTimer);
        closeDocument();
        setMoreTray(false);
        elements.shell.hidden = true;
        elements.shell.setAttribute('aria-hidden', 'true');
        elements.shell.classList.remove('is-loading', 'controls-idle');
        document.body.style.overflow = '';
        if (screen.orientation?.unlock) screen.orientation.unlock();
        if (document.fullscreenElement === elements.shell) document.exitFullscreen?.().catch(() => {});
    }

    async function toggleFullscreen() {
        setMoreTray(false);
        if (document.fullscreenElement === elements.shell) {
            await document.exitFullscreen?.().catch(() => {});
        } else if (elements.shell.requestFullscreen) {
            await elements.shell.requestFullscreen().catch(() => {});
        }
        scheduleIdle();
    }

    async function requestLandscape() {
        setMoreTray(false);
        if (document.fullscreenElement !== elements.shell && elements.shell.requestFullscreen) {
            try { await elements.shell.requestFullscreen(); } catch {}
        }
        if (!screen.orientation?.lock) {
            elements.status.textContent = 'Este navegador no permite bloquear la orientación. Gira el dispositivo para continuar.';
            return;
        }
        try {
            await screen.orientation.lock('landscape');
            elements.status.textContent = `${currentBook?.title || 'Lector'} · Orientación horizontal`;
        } catch {
            elements.status.textContent = 'No se pudo bloquear la orientación; gira el dispositivo para leer en horizontal.';
        }
    }

    const activePointers = new Map();
    let pinchStart = null;
    let panStart = null;
    let gestureTimer;

    function pointerDistance(first, second) {
        return Math.hypot(first.x - second.x, first.y - second.y);
    }

    function scheduleGestureRender() {
        clearTimeout(gestureTimer);
        gestureTimer = setTimeout(() => { gestureTimer = null; renderPage().catch(() => {}); }, 80);
    }

    elements.stage.addEventListener('pointerdown', event => {
        if (!event.target.closest('canvas') || (event.pointerType === 'mouse' && event.button !== 0)) return;
        activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        elements.stage.setPointerCapture(event.pointerId);
        elements.canvas.classList.add('is-panning');
        if (activePointers.size >= 2) {
            const points = Array.from(activePointers.values());
            pinchStart = { distance: pointerDistance(points[0], points[1]), scale };
            panStart = null;
        } else {
            panStart = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: elements.stage.scrollLeft, top: elements.stage.scrollTop };
        }
        event.preventDefault();
    });

    elements.stage.addEventListener('pointermove', event => {
        if (!activePointers.has(event.pointerId)) return;
        activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (activePointers.size >= 2 && pinchStart) {
            const points = Array.from(activePointers.values());
            scale = Math.max(.5, Math.min(3, pinchStart.scale * pointerDistance(points[0], points[1]) / Math.max(1, pinchStart.distance)));
            scheduleGestureRender();
            event.preventDefault();
            return;
        }
        if (panStart?.pointerId === event.pointerId) {
            elements.stage.scrollLeft = panStart.left - (event.clientX - panStart.x);
            elements.stage.scrollTop = panStart.top - (event.clientY - panStart.y);
            event.preventDefault();
        }
    });

    function endGesture(event) {
        activePointers.delete(event.pointerId);
        if (activePointers.size < 2) pinchStart = null;
        if (activePointers.size === 1) {
            const [pointerId, point] = activePointers.entries().next().value;
            panStart = { pointerId, x: point.x, y: point.y, left: elements.stage.scrollLeft, top: elements.stage.scrollTop };
        } else if (activePointers.size === 0) {
            panStart = null;
            elements.canvas.classList.remove('is-panning');
            if (gestureTimer) {
                clearTimeout(gestureTimer);
                gestureTimer = null;
                renderPage().catch(() => {});
            }
        }
    }

    elements.stage.addEventListener('pointerup', endGesture);
    elements.stage.addEventListener('pointercancel', endGesture);
    elements.stage.addEventListener('lostpointercapture', endGesture);
    elements.stage.addEventListener('wheel', event => {
        if (!event.ctrlKey && !event.metaKey) return;
        event.preventDefault();
        scale = Math.max(.5, Math.min(3, scale * Math.exp(-event.deltaY * .002)));
        scheduleGestureRender();
    }, { passive: false });
    elements.close.addEventListener('click', close);
    elements.previous.addEventListener('click', () => { if (currentPage > 1) goToPage(currentPage - 1); });
    elements.next.addEventListener('click', () => { if (documentProxy && currentPage < documentProxy.numPages) goToPage(currentPage + 1); });
    function bindZoomButton(button, direction) {
        let holdTimeout;
        let holdInterval;
        let holdStarted = false;
        let suppressClick = false;

        function stopHold() {
            clearTimeout(holdTimeout);
            clearInterval(holdInterval);
            if (holdStarted) {
                suppressClick = true;
                setTimeout(() => { suppressClick = false; }, 500);
            }
            holdStarted = false;
        }

        button.addEventListener('pointerdown', event => {
            if (event.pointerType === 'mouse' && event.button !== 0) return;
            holdTimeout = setTimeout(() => {
                holdStarted = true;
                try { button.setPointerCapture(event.pointerId); } catch {}
                holdInterval = setInterval(() => {
                    if (!documentProxy) return;
                    const nextScale = Math.max(.5, Math.min(3, scale + direction * .045));
                    if (nextScale === scale) return;
                    scale = nextScale;
                    renderPage().catch(() => {});
                    scheduleIdle();
                }, 160);
            }, 280);
        });
        button.addEventListener('pointerup', stopHold);
        button.addEventListener('pointercancel', stopHold);
        button.addEventListener('lostpointercapture', stopHold);
        button.addEventListener('click', () => {
            if (suppressClick) {
                suppressClick = false;
                return;
            }
            scale = Math.max(.5, Math.min(3, scale + direction * .08));
            renderPage().catch(() => {});
        });
    }

    bindZoomButton(elements.zoomIn, 1);
    bindZoomButton(elements.zoomOut, -1);
    elements.pageInput.addEventListener('change', () => goToPage(elements.pageInput.value));
    elements.pageInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            goToPage(elements.pageInput.value);
            elements.pageInput.blur();
        }
    });
    elements.more.addEventListener('click', () => setMoreTray(elements.moreTray.hidden));
    elements.fullscreen.addEventListener('click', toggleFullscreen);
    elements.orientation.addEventListener('click', requestLandscape);
    elements.download.addEventListener('click', async () => {
        if (!documentProxy || !currentBook) return;
        elements.download.disabled = true;
        setMoreTray(false);
        try { await downloadManager.download(documentProxy, currentBook.filename || currentBook.title, message => { elements.status.textContent = message; }); }
        catch {}
        finally { elements.download.disabled = false; scheduleIdle(); }
    });

    ['pointerdown', 'pointermove', 'keydown', 'touchstart'].forEach(type => elements.shell.addEventListener(type, event => {
        if (type === 'pointermove' && event.pointerType === 'touch') return;
        if (event.target === elements.pageInput && type === 'pointermove') return;
        scheduleIdle();
    }, { passive: type !== 'keydown' }));

    window.addEventListener('resize', () => {
        clearTimeout(viewportResize);
        viewportResize = setTimeout(() => { if (documentProxy) renderPage().catch(() => {}); }, 160);
    });
    elements.shell.addEventListener('click', event => { if (event.target === elements.shell) close(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !elements.shell.hidden && !document.fullscreenElement) close(); });
    document.addEventListener('fullscreenchange', () => { if (document.fullscreenElement !== elements.shell && !elements.shell.hidden) scheduleIdle(); });

    return { open, close };
}


