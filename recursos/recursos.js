/**
 * Módulo de Recursos Bíblicos - Radio Esperanza
 * Carga bajo demanda y optimización estática para GitHub Pages.
 */

(function () {
    let datosCatalogo = null;
    let cargandoJSON = false;
    let categoriaActualId = null;

    // Escapar texto para evitar inyecciones XSS
    function escaparHTML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Inicializador al hacer clic en la pestaña "Recursos Bíblicos"
    async function inicializarRecursos() {
        const contenedor = document.getElementById('recursos-contenedor');
        if (!contenedor) return;

        // Si ya tenemos el JSON en memoria, solo renderizamos categorías
        if (datosCatalogo) {
            mostrarVistaCategorias();
            return;
        }

        if (cargandoJSON) return;
        cargandoJSON = true;

        // Mostrar estado de carga inicial (liviano)
        contenedor.innerHTML = `
            <div class="estado-vacio-recursos">
                <span class="estado-vacio-icono">⌛</span>
                <p>Cargando catálogo de recursos...</p>
            </div>
        `;

        try {
            // SOLICITUD ÚNICA: Solo descarga el índice JSON (metadatos)
            const respuesta = await fetch('recursos/recursos.json');
            if (!respuesta.ok) throw new Error('No se pudo encontrar el archivo de catálogo.');
            
            datosCatalogo = await respuesta.json();
            mostrarVistaCategorias();
        } catch (error) {
            console.error('Error al cargar Recursos Bíblicos:', error);
            contenedor.innerHTML = `
                <div class="estado-vacio-recursos">
                    <span class="estado-vacio-icono">⚠️</span>
                    <p>No se pudieron cargar los recursos. Inténtalo nuevamente más tarde.</p>
                </div>
            `;
        } finally {
            cargandoJSON = false;
        }
    }

    // Vista 1: Lista de Categorías
    function mostrarVistaCategorias() {
        const contenedor = document.getElementById('recursos-contenedor');
        if (!contenedor || !datosCatalogo) return;

        categoriaActualId = null;

        if (!datosCatalogo.categorias || datosCatalogo.categorias.length === 0) {
            contenedor.innerHTML = `
                <div class="estado-vacio-recursos">
                    <span class="estado-vacio-icono">📂</span>
                    <p>No hay categorías disponibles todavía.</p>
                </div>
            `;
            return;
        }

        let html = `
            <div class="recursos-seccion">
                <div class="recursos-header">
                    <h3 class="recursos-titulo">Recursos Bíblicos</h3>
                    <p class="recursos-subtitulo">Selecciona una categoría para explorar el material</p>
                </div>
                <div class="categorias-grid">
        `;

        datosCatalogo.categorias.forEach(cat => {
            const numArchivos = cat.archivos ? cat.archivos.length : 0;
            const textoCount = numArchivos === 1 ? '1 recurso' : `${numArchivos} recursos`;

            html += `
                <div class="tarjeta-categoria" data-cat-id="${escaparHTML(cat.id)}">
                    <span class="categoria-icono">${escaparHTML(cat.icono || '📄')}</span>
                    <span class="categoria-nombre">${escaparHTML(cat.nombre)}</span>
                    <span class="categoria-desc">${escaparHTML(cat.descripcion || '')}</span>
                    <span class="categoria-count">${textoCount}</span>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;

        contenedor.innerHTML = html;

        // Escuchar clics en las tarjetas
        contenedor.querySelectorAll('.tarjeta-categoria').forEach(tarjeta => {
            tarjeta.addEventListener('click', () => {
                const catId = tarjeta.getAttribute('data-cat-id');
                mostrarVistaArchivos(catId);
            });
        });
    }

    // Vista 2: Lista de Archivos dentro de una Categoría
    function mostrarVistaArchivos(categoriaId) {
        const contenedor = document.getElementById('recursos-contenedor');
        if (!contenedor || !datosCatalogo) return;

        const categoria = datosCatalogo.categorias.find(c => c.id === categoriaId);
        if (!categoria) {
            mostrarVistaCategorias();
            return;
        }

        categoriaActualId = categoriaId;

        let html = `
            <div class="recursos-seccion">
                <button class="btn-volver-recursos" id="btn-volver-cat">
                    ← Volver a Categorías
                </button>
                <div class="recursos-header" style="text-align: left; margin-bottom: 15px;">
                    <h3 class="recursos-titulo">${escaparHTML(categoria.icono)} ${escaparHTML(categoria.nombre)}</h3>
                    <p class="recursos-subtitulo">${escaparHTML(categoria.descripcion || '')}</p>
                </div>
        `;

        if (!categoria.archivos || categoria.archivos.length === 0) {
            html += `
                <div class="estado-vacio-recursos">
                    <span class="estado-vacio-icono">📭</span>
                    <p>No hay recursos disponibles todavía en esta categoría.</p>
                </div>
            `;
        } else {
            html += `<div class="archivos-lista">`;

            categoria.archivos.forEach(arc => {
                // Ruta directa al archivo estático
                const rutaArchivo = `recursos/${encodeURIComponent(categoria.carpeta)}/${encodeURIComponent(arc.archivo)}`;
                const tipoLower = (arc.tipo || 'doc').toLowerCase();

                let botonAccion = '';

                // REGLA CRÍTICA: No pre-cargar nada. Carga bajo demanda natural.
                if (tipoLower === 'audio') {
                    botonAccion = `
                        <audio controls preload="none" class="reproductor-audio-recurso" src="${escaparHTML(rutaArchivo)}">
                            Tu navegador no soporta reproducción de audio.
                        </audio>
                    `;
                } else if (tipoLower === 'imagen' || tipoLower === 'img') {
                    botonAccion = `
                        <a href="${escaparHTML(rutaArchivo)}" target="_blank" rel="noopener" class="btn-accion-recurso">
                            🔍 Ver Imagen
                        </a>
                    `;
                } else {
                    // PDFs, DOCs, PPTs, etc. Abre en visor nativo o descarga directa sin usar JS Blob
                    botonAccion = `
                        <a href="${escaparHTML(rutaArchivo)}" target="_blank" rel="noopener" class="btn-accion-recurso">
                            📖 Abrir
                        </a>
                    `;
                }

                html += `
                    <div class="tarjeta-archivo">
                        <div class="archivo-info">
                            <span class="archivo-nombre">${escaparHTML(arc.nombre)}</span>
                            <div class="archivo-meta">
                                <span class="badge-tipo">${escaparHTML(tipoLower)}</span>
                                ${arc.tamano ? `<span>· ${escaparHTML(arc.tamano)}</span>` : ''}
                            </div>
                        </div>
                        <div class="archivo-acciones">
                            ${botonAccion}
                        </div>
                    </div>
                `;
            });

            html += `</div>`;
        }

        html += `</div>`;

        contenedor.innerHTML = html;

        // Evento para el botón Volver
        const btnVolver = document.getElementById('btn-volver-cat');
        if (btnVolver) {
            btnVolver.addEventListener('click', mostrarVistaCategorias);
        }
    }

    // Exponer la función al cambiar de pestaña en el menú principal
    window.inicializarSeccionRecursos = inicializarRecursos;

    // Detectar cuando el usuario hace clic en el botón de navegación "RECURSOS BÍBLICOS"
    document.addEventListener('DOMContentLoaded', () => {
        const btnRecursos = document.querySelector('[onclick*="bible-resources"]');
        if (btnRecursos) {
            btnRecursos.addEventListener('click', inicializarRecursos);
        }
    });
})();