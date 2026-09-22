document.addEventListener('DOMContentLoaded', () => {
    const contenedor = document.getElementById('radio-esperanza-podcasts');
    if (!contenedor) return;
    let datosPodcasts = [];

    // Formatea los segundos en mm:ss
    const formatearTiempo = (segundos) => {
        if (!segundos || isNaN(segundos)) return "00:00";
        const min = Math.floor(segundos / 60);
        const seg = Math.floor(segundos % 60);
        return `${min}:${seg < 10 ? '0' : ''}${seg}`;
    };

    // Carga el JSON esquivando la caché de GitHub Pages
    const cargarPodcasts = async () => {
        contenedor.innerHTML = '<div class="pd-loading">Cargando podcasts... ⏳</div>';
        try {
            // ?v=timestamp evita que el navegador cargue un JSON viejo guardado en caché
            const url = `podcasts/podcasts.json?v=${new Date().getTime()}`;
            const respuesta = await fetch(url);
            
            if (!respuesta.ok) throw new Error(`Error HTTP: ${respuesta.status}`);
            
            const json = await respuesta.json();
            datosPodcasts = json.podcasts || [];
            
            if (datosPodcasts.length === 0) {
                mostrarProximamente();
            } else {
                mostrarListaPodcasts();
            }
        } catch (error) {
            console.error('Error cargando podcasts:', error);
            contenedor.innerHTML = `
                <div class="pd-error">
                    ⚠️ No pudimos cargar los podcasts en este momento.<br>
                    <small>Por favor, intenta nuevamente más tarde.</small>
                </div>`;
        }
    };

    const mostrarProximamente = () => {
        contenedor.innerHTML = `
            <div class="pd-proximamente">
                <div class="pd-prox-icon">🎙️</div>
                <h2>PRÓXIMAMENTE</h2>
                <p>Estamos preparando nuestros primeros podcasts para ti.</p>
            </div>`;
    };

    const mostrarListaPodcasts = () => {
        contenedor.innerHTML = '';
        const grid = document.createElement('div');
        grid.className = 'pd-grid';

        datosPodcasts.forEach((podcast, index) => {
            const episodiosCount = podcast.episodios ? podcast.episodios.length : 0;
            grid.innerHTML += `
                <div class="pd-card">
                    <img src="${podcast.imagen}" class="pd-card-img" alt="${podcast.titulo}">
                    <div class="pd-card-content">
                        <span class="pd-badge">${podcast.categoria}</span>
                        <h3 class="pd-card-title">${podcast.titulo}</h3>
                        <p class="pd-card-desc">${podcast.descripcion}</p>
                        <div class="pd-card-meta">
                            <span>👤 ${podcast.autor}</span>
                            <span>🎙 ${episodiosCount} episodios</span>
                        </div>
                        <button class="pd-btn" onclick="verPodcast(${index})">Ver podcast</button>
                    </div>
                </div>`;
        });
        contenedor.appendChild(grid);
    };

    window.verPodcast = (index) => {
        const p = datosPodcasts[index];
        const episodios = p.episodios || [];
        
        let html = `
            <button class="pd-back-btn" onclick="document.dispatchEvent(new Event('volverPodcasts'))">← Volver a Podcasts</button>
            <div class="pd-header">
                <img src="${p.imagen}" class="pd-header-img" alt="${p.titulo}">
                <h1>${p.titulo}</h1>
                <p class="pd-header-desc">${p.descripcion}</p>
                <div class="pd-header-meta">
                    <span>👤 ${p.autor}</span> • <span>📁 ${p.categoria}</span> • <span>📅 ${p.fecha}</span>
                </div>
            </div>
            <h2 class="pd-episodes-title">Episodios (${episodios.length})</h2>
            <div class="pd-episodes-list">
        `;
        
        if(episodios.length === 0) {
            html += `<p class="pd-text-muted">Aún no hay episodios publicados.</p>`;
        } else {
            episodios.forEach((ep) => {
                const idUnico = `audio-${p.id}-${ep.id}`;
                html += `
                    <div class="pd-episode">
                        <div class="pd-ep-info">
                            <h3 class="pd-ep-title">${ep.titulo}</h3>
                            <span class="pd-ep-date">📅 ${ep.fecha}</span>
                        </div>
                        <p class="pd-ep-desc">${ep.descripcion}</p>
                        
                        <!-- REPRODUCTOR SEGURO CONTRA DESCARGA CASUAL -->
                        <div class="pd-ep-player-container">
                            <audio 
                                id="${idUnico}" 
                                class="pd-audio-player" 
                                controls 
                                controlsList="nodownload" 
                                oncontextmenu="return false;" 
                                preload="metadata">
                                <source src="${ep.archivo}" type="audio/mpeg">
                                Tu navegador no soporta el audio.
                            </audio>
                            <div class="pd-duration" id="dur-${idUnico}">⏱ --:--</div>
                        </div>
                    </div>`;
            });
        }
        
        html += `</div>`;
        contenedor.innerHTML = html;

        // Calcular duración automáticamente
        episodios.forEach((ep) => {
            const idUnico = `audio-${p.id}-${ep.id}`;
            const audioEl = document.getElementById(idUnico);
            const durEl = document.getElementById(`dur-${idUnico}`);
            
            if(audioEl && durEl) {
                audioEl.addEventListener('loadedmetadata', () => {
                    durEl.innerText = `⏱ ${formatearTiempo(audioEl.duration)}`;
                });
            }
        });
    };

    document.addEventListener('volverPodcasts', mostrarListaPodcasts);
    cargarPodcasts(); // Iniciar
});