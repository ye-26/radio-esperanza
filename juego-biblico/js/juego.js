/**
 * Motor Principal del Juego Bíblico - Radio Esperanza
 */
(function () {
    let configJuego = null;
    let preguntasData = null;
    let indicePreguntaActual = 0;
    let puntaje = 0;
    let respondido = false;

    // Inicializador al pulsar la pestaña del Juego Bíblico
    async function cargarModuloJuego() {
        const contenedor = document.getElementById('juego-contenedor');
        if (!contenedor) return;

        // Si ya está renderizado la pantalla inicial, no recargar todo
        if (configJuego && contenedor.children.length > 0) return;

        contenedor.innerHTML = `
            <div class="juego-container">
                <div class="juego-card">
                    <p>Cargando Juego Bíblico...</p>
                </div>
            </div>
        `;

        try {
            // Cargar Configuración Central
            const respConfig = await fetch('juego-biblico/config/juego.json');
            configJuego = await respConfig.json();

            // Inicializar Audio
            window.juegoAudioEngine.inicializar(configJuego.audio);

            // Cargar Preguntas
            const respPreguntas = await fetch(configJuego.rutasDatos.preguntas);
            preguntasData = await respPreguntas.json();

            // Registrar Service Worker para Caché Offline
            registrarServiceWorker();

            // Mostrar Pantalla Inicial
            mostrarMenuInicio();
        } catch (err) {
            console.error('Error al inicializar el Juego Bíblico:', err);
            contenedor.innerHTML = `
                <div class="juego-container">
                    <div class="juego-card">
                        <div class="juego-titulo">JUEGO BÍBLICO</div>
                        <p style="color:#ef5350;">No se pudieron cargar los datos del juego. Por favor, intenta de nuevo.</p>
                    </div>
                </div>
            `;
        }
    }

    // Pantalla de Inicio
    function mostrarMenuInicio() {
        const contenedor = document.getElementById('juego-contenedor');
        contenedor.innerHTML = `
            <div class="juego-container">
                <div class="juego-card">
                    <div class="juego-titulo">JUEGO BÍBLICO</div>
                    <div class="juego-subtitulo">Pon a prueba tus conocimientos de la Palabra de Dios</div>
                    
                    <button class="btn-juego-principal" id="btn-iniciar-juego">
                        INICIAR JUEGO BÍBLICO
                    </button>

                    <div>
                        <button class="btn-juego-secundario" id="btn-abrir-creditos">
                            CRÉDITOS
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('btn-iniciar-juego').addEventListener('click', () => {
            window.juegoAudioEngine.reproducirEfecto('click');
            iniciarPartida();
        });

        document.getElementById('btn-abrir-creditos').addEventListener('click', () => {
            window.juegoAudioEngine.reproducirEfecto('click');
            window.creditosEngine.abrirCreditos(
                configJuego.audio,
                configJuego.rutasDatos.creditos,
                contenedor.querySelector('.juego-container'),
                mostrarMenuInicio
            );
        });
    }

    // Iniciar el Juego
    function iniciarPartida() {
        indicePreguntaActual = 0;
        puntaje = 0;
        mostrarPregunta();
    }

    // Mostrar Pregunta
    function mostrarPregunta() {
        respondido = false;
        const preguntaObj = preguntasData.preguntas[indicePreguntaActual];
        const total = preguntasData.preguntas.length;
        const porcentaje = ((indicePreguntaActual) / total) * 100;

        const contenedor = document.getElementById('juego-contenedor');
        
        let opcionesHtml = '';
        preguntaObj.opciones.forEach((opc, idx) => {
            opcionesHtml += `
                <button class="btn-opcion" data-index="${idx}">
                    <span>${escapar(opc)}</span>
                </button>
            `;
        });

        contenedor.innerHTML = `
            <div class="juego-container">
                <div class="juego-card">
                    <div class="progreso-bar-container">
                        <div class="progreso-bar-fill" style="width: ${porcentaje}%"></div>
                    </div>
                    
                    <div class="juego-subtitulo">Pregunta ${indicePreguntaActual + 1} de ${total}</div>
                    <div class="juego-titulo" style="font-size: 1.1rem; margin-bottom: 20px;">
                        ${escapar(preguntaObj.pregunta)}
                    </div>

                    <div class="opciones-grid">
                        ${opcionesHtml}
                    </div>
                </div>
            </div>
        `;

        // Escuchar selección de respuesta
        contenedor.querySelectorAll('.btn-opcion').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (respondido) return;
                const idxSeleccionado = parseInt(btn.getAttribute('data-index'));
                evaluarRespuesta(idxSeleccionado, preguntaObj.respuesta, btn, contenedor);
            });
        });
    }

    // Evaluar Respuesta
    function evaluarRespuesta(seleccionado, correcto, btnElemento, contenedor) {
        respondido = true;
        const botones = contenedor.querySelectorAll('.btn-opcion');

        if (seleccionado === correcto) {
            puntaje++;
            btnElemento.classList.add('correcta');
            window.juegoAudioEngine.reproducirEfecto('correcto');
        } else {
            btnElemento.classList.add('incorrecta');
            botones[correcto].classList.add('correcta');
            window.juegoAudioEngine.reproducirEfecto('incorrecto');
        }

        setTimeout(() => {
            indicePreguntaActual++;
            if (indicePreguntaActual < preguntasData.preguntas.length) {
                mostrarPregunta();
            } else {
                mostrarResultados();
            }
        }, 1500);
    }

    // Pantalla de Resultados
    function mostrarResultados() {
        const total = preguntasData.preguntas.length;
        const gano = puntaje >= Math.ceil(total * 0.6);

        if (gano) {
            window.juegoAudioEngine.reproducirEfecto('victoria');
        } else {
            window.juegoAudioEngine.reproducirEfecto('derrota');
        }

        const contenedor = document.getElementById('juego-contenedor');
        contenedor.innerHTML = `
            <div class="juego-container">
                <div class="juego-card">
                    <div class="juego-titulo">${gano ? '¡FELICITACIONES!' : '¡SIGUE INTENTÁNDOLO!'}</div>
                    <div class="juego-subtitulo">Obtuviste ${puntaje} de ${total} respuestas correctas</div>

                    <button class="btn-juego-principal" id="btn-reiniciar">
                        VOLVER A JUGAR
                    </button>

                    <div>
                        <button class="btn-juego-secundario" id="btn-menu-principal">
                            MENÚ PRINCIPAL
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('btn-reiniciar').addEventListener('click', () => {
            window.juegoAudioEngine.reproducirEfecto('click');
            iniciarPartida();
        });

        document.getElementById('btn-menu-principal').addEventListener('click', () => {
            window.juegoAudioEngine.reproducirEfecto('click');
            mostrarMenuInicio();
        });
    }

    function registrarServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('juego-biblico/js/sw.js').catch(() => {});
        }
    }

    function escapar(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // Detectar clic en el botón del menú de pestañas "JUEGO BÍBLICO"
    document.addEventListener('DOMContentLoaded', () => {
        const btnJuego = document.querySelector('[onclick*="bible-game"]');
        if (btnJuego) {
            btnJuego.addEventListener('click', cargarModuloJuego);
        }
    });
})();