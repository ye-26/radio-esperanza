/**
 * Controlador de Créditos Animados
 */
class CreditosController {
    constructor() {
        this.audioCreditos = null;
        this.animFrameId = null;
        this.posicionY = 0;
        this.esAutoScrolling = false;
        this.interaccionManual = false;
        this.startY = 0;
    }

    async abrirCreditos(configAudio, rutaDatosCreditos, contenedorPadre, callbackVolver) {
        // 1. Descargar datos de créditos
        let datosCreditos = null;
        try {
            const resp = await fetch(rutaDatosCreditos);
            datosCreditos = await resp.json();
        } catch (e) {
            datosCreditos = { titulo: "Radio Esperanza", secciones: [] };
        }

        // 2. Renderizar Estructura
        let htmlSecciones = '';
        datosCreditos.secciones.forEach(sec => {
            htmlSecciones += `
                <div class="creditos-bloque">
                    <div class="creditos-rol">${this.escapar(sec.rol)}</div>
                    ${sec.nombres.map(n => `<div class="creditos-nombre">${this.escapar(n)}</div>`).join('')}
                </div>
            `;
        });

        contenedorPadre.innerHTML = `
            <div class="juego-card">
                <div class="juego-titulo">${this.escapar(datosCreditos.titulo)}</div>
                <div class="juego-subtitulo">${this.escapar(datosCreditos.subtitulo || '')}</div>
                
                <div class="creditos-overlay" id="creditos-viewport">
                    <div class="creditos-scroll-wrapper" id="creditos-content">
                        ${htmlSecciones}
                    </div>
                </div>

                <div class="creditos-footer-btn">
                    <button class="btn-juego-secundario" id="btn-cerrar-creditos">← VOLVER</button>
                </div>
            </div>
        `;

        // 3. Iniciar Música credits.mp3
        if (configAudio && configAudio.rutas.credits) {
            if (!this.audioCreditos) {
                this.audioCreditos = new Audio(configAudio.rutas.credits);
                this.audioCreditos.loop = true;
            }
            this.audioCreditos.volume = configAudio.volumenCreditos || 0.5;
            this.audioCreditos.currentTime = 0;
            this.audioCreditos.play().catch(() => {});
        }

        // 4. Calcular Altura y Auto-scroll
        const viewport = document.getElementById('creditos-viewport');
        const content = document.getElementById('creditos-content');

        // Posición inicial: Abajo si hay scroll, o centrado si cabe
        const alturaViewport = viewport.clientHeight;
        const alturaContent = content.scrollHeight;

        if (alturaContent > alturaViewport) {
            this.posicionY = alturaViewport - 20;
            this.esAutoScrolling = true;
            this.interaccionManual = false;
            this.iniciarAutoScroll(viewport, content);
        } else {
            // Cabe completo: centrar verticalmente
            content.style.position = 'relative';
            content.style.top = '0px';
            viewport.style.display = 'flex';
            viewport.style.alignItems = 'center';
            viewport.style.justifyContent = 'center';
        }

        // 5. Controles de Interacción Manual (Touch & Wheel)
        this.vincularEventosManuales(viewport, content);

        // 6. Evento Volver
        document.getElementById('btn-cerrar-creditos').addEventListener('click', () => {
            this.detener();
            callbackVolver();
        });
    }

    iniciarAutoScroll(viewport, content) {
        const velocidad = 0.5; // píxeles por frame
        const limiteSuperior = -(content.scrollHeight);

        const animar = () => {
            if (!this.esAutoScrolling || this.interaccionManual) return;

            this.posicionY -= velocidad;
            content.style.transform = `translateY(${this.posicionY}px)`;

            if (this.posicionY > limiteSuperior) {
                this.animFrameId = requestAnimationFrame(animar);
            } else {
                this.esAutoScrolling = false; // Se detiene al final
            }
        };

        this.animFrameId = requestAnimationFrame(animar);
    }

    vincularEventosManuales(viewport, content) {
        const detenerAuto = () => {
            this.interaccionManual = true;
            this.esAutoScrolling = false;
            if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
        };

        // Arrastrar Táctil / Mouse
        viewport.addEventListener('touchstart', (e) => {
            detenerAuto();
            this.startY = e.touches[0].clientY - this.posicionY;
        }, { passive: true });

        viewport.addEventListener('touchmove', (e) => {
            if (!this.interaccionManual) return;
            this.posicionY = e.touches[0].clientY - this.startY;
            content.style.transform = `translateY(${this.posicionY}px)`;
        }, { passive: true });

        // Rueda del ratón
        viewport.addEventListener('wheel', (e) => {
            detenerAuto();
            this.posicionY -= e.deltaY * 0.5;
            content.style.transform = `translateY(${this.posicionY}px)`;
        }, { passive: true });
    }

    detener() {
        this.esAutoScrolling = false;
        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
        
        // Detener música de créditos inmediatamente
        if (this.audioCreditos) {
            this.audioCreditos.pause();
            this.audioCreditos.currentTime = 0;
        }
    }

    escapar(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
}

window.creditosEngine = new CreditosController();