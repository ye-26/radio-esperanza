/**
 * Módulo de Audio para la sección "Acerca de"
 * Carga bajo demanda, respeta la caché y se detiene automáticamente al cambiar de pestaña.
 */
(function() {
    let audioAcercaDe = null;
    // IMPORTANTE: Cambia esta ruta si tu audio está en otra carpeta
    const RUTA_AUDIO = 'Acerca-De/acerca-audio.mp3'; 

    function manejarAudio(estaActiva) {
        if (estaActiva) {
            // Carga bajo demanda: solo se crea si el usuario entró a la pestaña
            if (!audioAcercaDe) {
                audioAcercaDe = new Audio(RUTA_AUDIO);
                audioAcercaDe.loop = true;
                audioAcercaDe.volume = 0.6; // Ajusta el volumen si lo deseas
            }
            // Reproducir. El catch evita errores en la consola si el navegador bloquea el autoplay inicial.
            audioAcercaDe.play().catch(e => console.log("El usuario debe interactuar primero:", e));
        } else {
            // Detener inmediatamente y reiniciar
            if (audioAcercaDe) {
                audioAcercaDe.pause();
                audioAcercaDe.currentTime = 0;
            }
        }
    }

    // Observar la pestaña sin modificar el sistema de navegación original
    document.addEventListener('DOMContentLoaded', () => {
        // Asume que tu sección se llama 'about' o 'seccion-acerca' según la estructura actual
        const seccionAcerca = document.getElementById('about') || document.getElementById('about');
        
        if (seccionAcerca) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.attributeName === 'class') {
                        const estaActiva = seccionAcerca.classList.contains('active');
                        manejarAudio(estaActiva);
                    }
                });
            });
            // Escucha los cambios de clase (cuando switchTab le pone o quita 'active')
            observer.observe(seccionAcerca, { attributes: true });
        }
    });
})();
