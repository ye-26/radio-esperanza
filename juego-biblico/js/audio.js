/**
 * Módulo de Audio Independiente para el Juego Bíblico
 * Respetuoso de las políticas de Autoplay del navegador.
 */
class JuegoAudio {
    constructor() {
        this.config = null;
        this.cacheAudio = {};
    }

    inicializar(configAudio) {
        this.config = configAudio;
    }

    // Carga bajo demanda y reproduce un efecto de sonido
    reproducirEfecto(nombre) {
        if (!this.config || !this.config.rutas[nombre]) return;

        const ruta = this.config.rutas[nombre];
        let audio = this.cacheAudio[nombre];

        if (!audio) {
            audio = new Audio(ruta);
            audio.volume = this.config.volumenEfectos || 0.8;
            this.cacheAudio[nombre] = audio;
        } else {
            audio.currentTime = 0;
        }

        audio.play().catch(err => {
            console.log(`Audio no reproducido (${nombre}): interacción de usuario requerida.`, err);
        });
    }
}

window.juegoAudioEngine = new JuegoAudio();