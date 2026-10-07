document.addEventListener('DOMContentLoaded', () => {
    const startMenu = document.getElementById('start-menu');
    const btnStart = document.getElementById('btn-start');
    const desktopArea = document.getElementById('desktop-area');
    const taskbarApps = document.getElementById('taskbar-apps');
    
    let windowsList = {};
    let highestZIndex = 100;

    // --- 1. CARGA INICIAL ---
    setTimeout(() => {
        document.getElementById('loading-screen').style.opacity = '0';
        setTimeout(() => document.getElementById('loading-screen').remove(), 800);
        loadApplications();
        updateClock();
        setInterval(updateClock, 60000);
    }, 1500);

    // --- 2. MENÚ DE INICIO ---
    btnStart.addEventListener('click', () => {
        startMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!startMenu.contains(e.target) && !btnStart.contains(e.target)) {
            startMenu.classList.add('hidden');
        }
    });

    async function loadApplications() {
        try {
            const response = await fetch('config/pestañas.json');
            const apps = await response.json();
            const grid = document.getElementById('start-grid');
            
            apps.forEach(app => {
                const shortcut = document.createElement('div');
                shortcut.className = 'app-shortcut';
                shortcut.innerHTML = `<div class="icon">${app.icono}</div><span>${app.titulo}</span>`;
                shortcut.addEventListener('click', () => {
                    openWindow(app);
                    startMenu.classList.add('hidden');
                });
                grid.appendChild(shortcut);
            });
        } catch (error) {
            console.error("Error cargando aplicaciones:", error);
        }
    }

    // --- 3. GESTOR DE VENTANAS ---
    function openWindow(app) {
        
        if (windowsList[app.id]) {
            const win = windowsList[app.id].element;
            win.classList.remove('minimized');
            bringToFront(win);
            updateTaskbarActive(app.id);
            return;
        }

        // Crear nueva ventana
        const win = document.createElement('div');
        win.className = 'window';
        win.id = app.id;
        highestZIndex++;
        win.style.zIndex = highestZIndex;

        // Offset 
        const offset = (Object.keys(windowsList).length * 30) % 150;
        win.style.top = `${50 + offset}px`;
        win.style.left = `${50 + offset}px`;

        win.innerHTML = `
            <div class="window-header" id="header-${app.id}">
                <div class="window-title">${app.icono} ${app.titulo}</div>
                <div class="window-controls">
                    <button class="btn-minimize">_</button>
                    <button class="btn-maximize">□</button>
                    <button class="btn-close">X</button>
                </div>
            </div>
            <div class="window-content">
                <!-- Usamos iframe para encapsular CSS/JS de cada módulo y no romper el OS -->
                <iframe src="${app.rutaHTML}" title="${app.titulo}"></iframe>
            </div>
        `;

        desktopArea.appendChild(win);

        // Registro
        windowsList[app.id] = { element: win, minimized: false, maximized: false };

        // Controles
        setupWindowControls(win, app.id);
        makeDraggable(win, document.getElementById(`header-${app.id}`));
        createTaskbarIcon(app);
        bringToFront(win);
    }

    function setupWindowControls(win, id) {
        win.addEventListener('mousedown', () => bringToFront(win));
        
        const btnClose = win.querySelector('.btn-close');
        const btnMinimize = win.querySelector('.btn-minimize');
        const btnMaximize = win.querySelector('.btn-maximize');

        btnClose.addEventListener('click', () => {
            win.remove();
            document.getElementById(`taskbar-${id}`).remove();
            delete windowsList[id];
        });

        btnMinimize.addEventListener('click', () => {
            win.classList.add('minimized');
            windowsList[id].minimized = true;
            document.getElementById(`taskbar-${id}`).classList.remove('active');
        });

        btnMaximize.addEventListener('click', () => {
            win.classList.toggle('maximized');
            windowsList[id].maximized = win.classList.contains('maximized');
        });
    }

    function bringToFront(win) {
        highestZIndex++;
        win.style.zIndex = highestZIndex;
        updateTaskbarActive(win.id);
    }

    // --- 4. BARRA DE TAREAS ---
    function createTaskbarIcon(app) {
        const btn = document.createElement('button');
        btn.className = 'taskbar-btn app-icon active';
        btn.id = `taskbar-${app.id}`;
        btn.innerHTML = app.icono;
        btn.title = app.titulo;
        
        btn.addEventListener('click', () => {
            const win = windowsList[app.id].element;
            if (win.classList.contains('minimized') || parseInt(win.style.zIndex) !== highestZIndex) {
                win.classList.remove('minimized');
                bringToFront(win);
            } else {
                win.classList.add('minimized');
                btn.classList.remove('active');
            }
        });
        taskbarApps.appendChild(btn);
    }

    function updateTaskbarActive(activeId) {
        document.querySelectorAll('.app-icon').forEach(icon => icon.classList.remove('active'));
        const activeBtn = document.getElementById(`taskbar-${activeId}`);
        if (activeBtn) activeBtn.classList.add('active');
    }

    // --- 5. DRAG & DROP---
    function makeDraggable(win, header) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        
        header.onmousedown = dragMouseDown;
        header.ontouchstart = dragTouchStart;

        function dragMouseDown(e) {
            if(win.classList.contains('maximized')) return;
            e.preventDefault();
            pos3 = e.clientX; pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function dragTouchStart(e) {
            if(win.classList.contains('maximized')) return;
            const touch = e.touches[0];
            pos3 = touch.clientX; pos4 = touch.clientY;
            document.ontouchend = closeDragElement;
            document.ontouchmove = elementTouchDrag;
        }

        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY;
            pos3 = e.clientX; pos4 = e.clientY;
            win.style.top = (win.offsetTop - pos2) + "px";
            win.style.left = (win.offsetLeft - pos1) + "px";
        }

        function elementTouchDrag(e) {
            const touch = e.touches[0];
            pos1 = pos3 - touch.clientX; pos2 = pos4 - touch.clientY;
            pos3 = touch.clientX; pos4 = touch.clientY;
            win.style.top = (win.offsetTop - pos2) + "px";
            win.style.left = (win.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            document.onmouseup = null; document.onmousemove = null;
            document.ontouchend = null; document.ontouchmove = null;
        }
    }

    // --- 6. UTILIDADES ---
    function updateClock() {
        
        const options = { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' };
        const timeString = new Intl.DateTimeFormat('es-CO', options).format(new Date());
        document.getElementById('taskbar-clock').innerText = timeString;
    }
    // Lógica de Almacenamiento
const logoTrigger = document.getElementById('logo-trigger');
const currentTheme = localStorage.getItem('re_theme') || 'dark';

// Aplicar tema
if (currentTheme === 'light') {
    document.body.classList.add('light-theme');
}

// Evento táctil
logoTrigger.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    
    // Guardar preferencias
    const theme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
    localStorage.setItem('re_theme', theme);
});
});
