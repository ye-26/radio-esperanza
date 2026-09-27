/**
 * Módulo de Audio para la sección "Acerca de"
 * Corrección de ruta para compatibilidad con GitHub Pages
 */
(function() {
    let audioAcercaDe = null;
    
    // CORRECCIÓN: Uso de ruta relativa estricta (./) respetando mayúsculas y minúsculas
    const RUTA_AUDIO = './AcercaDe/acerca-audio.mp3'; 

    function manejarAudio(estaActiva) {
        if (estaActiva) {
            // Carga bajo demanda
            if (!audioAcercaDe) {
                audioAcercaDe = new Audio(RUTA_AUDIO);
                audioAcercaDe.loop = true;
                audioAcercaDe.volume = 0.6; 
            }
            // Reproducir (silencia errores si el navegador bloquea el autoplay)
            audioAcercaDe.play().catch(e => console.log("Interacción requerida para audio", e));
        } else {
            // Detener y reiniciar al salir
            if (audioAcercaDe) {
                audioAcercaDe.pause();
                audioAcercaDe.currentTime = 0;
            }
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        // Asume el ID de tu sección Acerca de. Revisa tu HTML si el ID es diferente.
        const seccionAcerca = document.getElementById('about') || document.getElementById('seccion-acerca') || document.querySelector('[onclick*="about"]')?.closest('.tab-content'); 
        
        if (seccionAcerca) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.attributeName === 'class') {
                        const estaActiva = seccionAcerca.classList.contains('active');
                        manejarAudio(estaActiva);
                    }
                });
            });
            observer.observe(seccionAcerca, { attributes: true });
        }
    });
})();
