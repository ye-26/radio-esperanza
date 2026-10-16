document.addEventListener('DOMContentLoaded', () => {
    const startMenu = document.getElementById('start-menu');
    const btnStart = document.getElementById('btn-start');
    const desktopArea = document.getElementById('desktop-area');
    const taskbar = document.getElementById('taskbar');
    const taskbarApps = document.getElementById('taskbar-apps');
    const taskbarClock = document.getElementById('taskbar-clock');
    const windowsList = new Map();
    const protectedDocuments = new WeakSet();
    let activeWindowId = null, highestZIndex = 100, layoutFrame = 0;

    function installBasicProtection(targetDocument) {
        if (!targetDocument || protectedDocuments.has(targetDocument)) return;
        protectedDocuments.add(targetDocument);
        targetDocument.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        }, true);
        targetDocument.addEventListener('keydown', (event) => {
            const key = (event.key || '').toLowerCase();
            const control = event.ctrlKey || event.metaKey;
            const blocked = event.key === 'F12' ||
                (control && event.shiftKey && ['i', 'j', 'c'].includes(key)) ||
                (control && !event.shiftKey && key === 'u') ||
                (event.metaKey && event.altKey && ['i', 'j', 'u'].includes(key));
            if (blocked) {
                event.preventDefault();
                event.stopPropagation();
            }
        }, true);
    }

    installBasicProtection(document);

    function appIconImage(src, className, alt = '') {
        const image = document.createElement('img');
        image.src = src;
        image.className = className;
        image.alt = alt;
        image.draggable = false;
        image.setAttribute('draggable', 'false');
        return image;
    }

    const overflowButton = document.createElement('button');
    overflowButton.type = 'button'; overflowButton.id = 'taskbar-overflow-button';
    overflowButton.className = 'taskbar-btn'; overflowButton.title = 'Aplicaciones abiertas ocultas';
    overflowButton.setAttribute('aria-label', 'Mostrar aplicaciones abiertas ocultas');
    overflowButton.setAttribute('aria-expanded', 'false');
    const expandIcon = appIconImage('assets/win/expandir.svg', 'overflow-arrow-icon collapsed-icon');
    const collapseIcon = appIconImage('assets/win/no-expandir.svg', 'overflow-arrow-icon expanded-icon');
    overflowButton.append(expandIcon, collapseIcon);
    const overflowMenu = document.createElement('section');
    overflowMenu.id = 'taskbar-overflow-menu'; overflowMenu.setAttribute('role', 'dialog');
    overflowMenu.setAttribute('aria-label', 'Aplicaciones abiertas ocultas'); overflowMenu.hidden = true;
    overflowMenu.innerHTML = '<div class="overflow-menu-header"><span>Aplicaciones abiertas</span><button class="overflow-menu-close" type="button" aria-label="Cerrar menú de aplicaciones">×</button></div><div id="taskbar-overflow-apps"></div>';
    taskbar.insertBefore(overflowButton, taskbarClock); document.body.appendChild(overflowMenu);
    const overflowApps = overflowMenu.querySelector('#taskbar-overflow-apps');

    setTimeout(() => {
        const loader = document.getElementById('loading-screen');
        if (loader) { loader.style.opacity = '0'; setTimeout(() => loader.remove(), 800); }
        loadApplications(); updateClock(); setInterval(updateClock, 60000);
        if (typeof showDailyGreeting === 'function') showDailyGreeting();
    }, 1500);

    btnStart.addEventListener('click', () => {
        const opening = startMenu.classList.contains('hidden');
        startMenu.classList.toggle('hidden'); btnStart.setAttribute('aria-expanded', String(opening));
        setOverflowOpen(false);
    });
    overflowButton.addEventListener('click', () => setOverflowOpen(overflowMenu.hidden));
    overflowMenu.querySelector('.overflow-menu-close').addEventListener('click', () => setOverflowOpen(false));
    const iconContextSelector = '.menu-logo, .start-home-icon, .overflow-arrow-icon, .application-icon, .window-title-icon, .app-icon-image, .window-control-icon, .overflow-icon-image, .app-shortcut, .app-icon, .overflow-app, .window-title, .window-controls, #btn-start, #taskbar-overflow-button';
    document.addEventListener('contextmenu', (event) => {
        if (event.target.closest(iconContextSelector)) event.preventDefault();
    }, true);
    document.addEventListener('dragstart', (event) => {
        if (event.target.closest('img')) event.preventDefault();
    }, true);

    document.addEventListener('pointerdown', (event) => {
        if (!overflowMenu.hidden && !overflowMenu.contains(event.target) && !overflowButton.contains(event.target)) setOverflowOpen(false);
        if (!startMenu.contains(event.target) && !btnStart.contains(event.target)) {
            startMenu.classList.add('hidden'); btnStart.setAttribute('aria-expanded', 'false');
        }
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') { setOverflowOpen(false); startMenu.classList.add('hidden'); btnStart.setAttribute('aria-expanded', 'false'); }
    });

    const appSearch = document.getElementById('app-search');
    const appSearchSubmit = document.getElementById('app-search-submit');
    const appSearchClear = document.getElementById('app-search-clear');
    const startGrid = document.getElementById('start-grid');

    function normalizeSearch(value) {
        return value.toLocaleLowerCase('es-CO').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    }

    function filterApplications() {
        const query = normalizeSearch(appSearch.value);
        appSearchClear.hidden = !appSearch.value;
        startGrid.querySelectorAll('.app-shortcut').forEach((shortcut) => {
            shortcut.hidden = !normalizeSearch(shortcut.dataset.search).includes(query);
        });
    }

    appSearch.addEventListener('input', filterApplications);
    appSearch.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') { event.preventDefault(); filterApplications(); }
    });
    appSearchSubmit.addEventListener('click', () => { filterApplications(); appSearch.focus(); });
    appSearchClear.addEventListener('click', () => { appSearch.value = ''; filterApplications(); appSearch.focus(); });

    async function loadApplications() {
        try {
            const response = await fetch('config/pestañas.json');
            if (!response.ok) throw new Error('No se pudo cargar la lista de aplicaciones.');
            const apps = await response.json(), grid = document.getElementById('start-grid');
            grid.replaceChildren();
            apps.forEach((app) => {
                const shortcut = document.createElement('button'); shortcut.type = 'button'; shortcut.className = 'app-shortcut'; shortcut.dataset.search = app.titulo + ' ' + app.id;
                const icon = document.createElement('div'); icon.className = 'icon'; icon.appendChild(appIconImage(app.icono, 'application-icon')); icon.setAttribute('aria-hidden', 'true');
                const title = document.createElement('span'); title.textContent = app.titulo; shortcut.append(icon, title);
                shortcut.addEventListener('click', () => { openWindow(app); startMenu.classList.add('hidden'); btnStart.setAttribute('aria-expanded', 'false'); });
                grid.appendChild(shortcut);
            });
            filterApplications();
        } catch (error) { console.error(error); }
    }

    function openWindow(app) {
        if (windowsList.has(app.id)) { focusWindow(app.id); return; }
        const win = document.createElement('section'); win.className = 'window'; win.id = app.id; win.setAttribute('aria-label', app.titulo);
        win.style.zIndex = String(++highestZIndex);
        const offset = (windowsList.size * 30) % 150;
        win.style.top = Math.min(32 + offset, Math.max(0, desktopArea.clientHeight - 280)) + 'px';
        win.style.left = Math.min(32 + offset, Math.max(0, desktopArea.clientWidth - 300)) + 'px';
        const header = document.createElement('div'); header.className = 'window-header';
        const title = document.createElement('div'); title.className = 'window-title';
        title.append(appIconImage(app.icono, 'window-title-icon'), document.createTextNode(' ' + app.titulo));
        const controls = document.createElement('div'); controls.className = 'window-controls';
        const minimize = control('btn-minimize', 'Minimizar'), maximize = control('btn-maximize', 'Maximizar'), close = control('btn-close', 'Cerrar');
        controls.append(minimize, maximize, close); header.append(title, controls);
        const content = document.createElement('div'); content.className = 'window-content';
        const frame = document.createElement('iframe'); frame.src = app.rutaHTML; frame.title = app.titulo; frame.loading = 'lazy';
        frame.addEventListener('load', () => {
            try { installBasicProtection(frame.contentDocument); } catch (error) {}
        });
        content.appendChild(frame);
        win.append(header, content); desktopArea.appendChild(win);

        const taskButton = document.createElement('button'); taskButton.type = 'button';
        taskButton.className = 'taskbar-btn app-icon'; taskButton.id = 'taskbar-' + app.id;
        taskButton.appendChild(appIconImage(app.icono, 'app-icon-image')); taskButton.title = app.titulo;
        const overflowItem = document.createElement('button'); overflowItem.type = 'button'; overflowItem.className = 'overflow-app';
        const itemIcon = document.createElement('span'); itemIcon.className = 'overflow-app-icon'; itemIcon.appendChild(appIconImage(app.icono, 'overflow-icon-image')); itemIcon.setAttribute('aria-hidden', 'true');
        const itemCopy = document.createElement('span'); itemCopy.className = 'overflow-app-copy';
        const itemTitle = document.createElement('span'); itemTitle.className = 'overflow-app-title'; itemTitle.textContent = app.titulo;
        const itemStatus = document.createElement('span'); itemStatus.className = 'overflow-app-status'; itemCopy.append(itemTitle, itemStatus); overflowItem.append(itemIcon, itemCopy);
        const record = { app, element:win, taskButton, overflowItem, minimized:false, maximized:window.matchMedia('(max-width:768px)').matches, needsAttention:false, zIndex:highestZIndex };
        windowsList.set(app.id, record); win.classList.toggle('maximized', record.maximized);
        taskbarApps.appendChild(taskButton); overflowApps.appendChild(overflowItem);

        taskButton.addEventListener('click', () => activeWindowId === app.id && !record.minimized ? minimizeWindow(app.id) : focusWindow(app.id));
        overflowItem.addEventListener('click', () => { focusWindow(app.id); setOverflowOpen(false); });
        minimize.addEventListener('click', () => minimizeWindow(app.id));
        maximize.addEventListener('click', () => toggleMaximize(app.id));
        close.addEventListener('click', () => closeWindow(app.id));
        win.addEventListener('pointerdown', () => focusWindow(app.id)); makeDraggable(win, header);
        focusWindow(app.id); scheduleLayout();
    }

    function control(cls, label) {
        const button = document.createElement('button'); button.type = 'button'; button.className = cls;
        const paths = {
            'btn-minimize': 'assets/win/minimize.svg',
            'btn-maximize': 'assets/win/maximize-pantalla.svg',
            'btn-close': 'assets/win/close.svg'
        };
        button.appendChild(appIconImage(paths[cls], 'window-control-icon ' + (cls === 'btn-close' ? 'close-icon' : '')));
        button.title = label; button.setAttribute('aria-label', label); return button;
    }
    function focusWindow(id) {
        const record = windowsList.get(id); if (!record) return;
        record.minimized = false; record.zIndex = ++highestZIndex; record.element.style.zIndex = String(record.zIndex);
        activeWindowId = id; syncStates();
    }
    function mostRecent() {
        const next = Array.from(windowsList.entries()).filter(([, r]) => !r.minimized).sort((a,b) => b[1].zIndex-a[1].zIndex)[0];
        activeWindowId = next ? next[0] : null;
        if (next) { next[1].zIndex = ++highestZIndex; next[1].element.style.zIndex = String(next[1].zIndex); }
    }
    function minimizeWindow(id) {
        const r = windowsList.get(id); if (!r) return; r.minimized = true;
        if (activeWindowId === id) mostRecent(); syncStates();
    }
    function toggleMaximize(id) {
        const r = windowsList.get(id); if (!r) return; r.maximized = !r.maximized;
        r.element.classList.toggle('maximized', r.maximized); syncStates();
    }
    function closeWindow(id) {
        const r = windowsList.get(id); if (!r) return;
        r.element.remove(); r.taskButton.remove(); r.overflowItem.remove(); windowsList.delete(id);
        if (activeWindowId === id) mostRecent(); syncStates(); scheduleLayout();
    }
    function syncStates() {
        windowsList.forEach((r,id) => {
            const active = activeWindowId === id && !r.minimized;
            r.element.classList.toggle('minimized',r.minimized); r.element.classList.toggle('maximized',r.maximized);
            r.taskButton.classList.toggle('active',active); r.taskButton.classList.toggle('minimized',r.minimized);
            r.taskButton.classList.toggle('needs-attention',r.needsAttention);
            r.taskButton.setAttribute('aria-label',r.app.titulo+', '+stateLabel(r,active)); r.taskButton.setAttribute('aria-pressed',String(active));
            r.overflowItem.classList.toggle('active',active); r.overflowItem.classList.toggle('minimized',r.minimized);
            r.overflowItem.classList.toggle('needs-attention',r.needsAttention);
            r.overflowItem.setAttribute('aria-label',r.app.titulo+', '+stateLabel(r,active));
            r.overflowItem.querySelector('.overflow-app-status').textContent = stateLabel(r,active);
            const b = r.element.querySelector('.btn-maximize');
            b.querySelector('img').src = r.maximized ? 'assets/win/minimize-pantalla.svg' : 'assets/win/maximize-pantalla.svg';
            b.title = r.maximized ? 'Restaurar a ventana' : 'Maximizar pantalla';
            b.setAttribute('aria-label',b.title); b.setAttribute('aria-pressed',String(r.maximized));
        });
        if (!hasOverflow()) setOverflowOpen(false);
    }
    function stateLabel(r,active) { return r.needsAttention ? 'Necesita atención' : r.minimized ? 'Minimizada' : active ? 'Activa' : 'Abierta'; }
    function hasOverflow() { return overflowApps.querySelectorAll('.overflow-app:not([hidden])').length > 0; }
    function setOverflowOpen(open) {
        if (open && !hasOverflow()) open = false; overflowMenu.hidden = !open;
        overflowButton.setAttribute('aria-expanded',String(open));
        overflowButton.classList.toggle('expanded', open);
        if (open) overflowMenu.querySelector('.overflow-menu-close').focus();
    }

    function scheduleLayout() { if (!layoutFrame) layoutFrame = requestAnimationFrame(layoutTaskbar); }
    function layoutTaskbar() {
        layoutFrame = 0;
        const icons = Array.from(taskbarApps.querySelectorAll('.app-icon')), style = getComputedStyle(taskbar);
        const gap = parseFloat(style.columnGap)||0, pad = (parseFloat(style.paddingLeft)||0)+(parseFloat(style.paddingRight)||0);
        const free = Math.max(0,taskbar.clientWidth-pad-btnStart.offsetWidth-taskbarClock.offsetWidth-gap*2);
        const appGap = parseFloat(getComputedStyle(taskbarApps).columnGap)||0, arrowW = parseFloat(getComputedStyle(overflowButton).width)||40;
        const widths = icons.map(x => parseFloat(getComputedStyle(x).width)||45);
        const all = widths.reduce((a,b)=>a+b,0)+Math.max(0,icons.length-1)*appGap;
        let count = icons.length;
        if (all > free) {
            count = 0; const capacity = Math.max(0,free-arrowW-gap);
            for (let n=icons.length-1;n>=0;n--) {
                const need = widths.slice(0,n).reduce((a,b)=>a+b,0)+Math.max(0,n-1)*appGap;
                if (need<=capacity) { count=n; break; }
            }
        }
        icons.forEach((icon,i) => {
            const hidden = i>=count; icon.hidden=hidden;
            const r=windowsList.get(icon.id.slice(8)); if (r) r.overflowItem.hidden=!hidden;
        });
        const needed = count<icons.length; overflowButton.classList.toggle('visible',needed);
        overflowButton.tabIndex=needed?0:-1; overflowButton.setAttribute('aria-hidden',String(!needed));
        if (!needed) setOverflowOpen(false); syncStates();
    }

    function makeDraggable(win,header) {
        let id=null,sx=0,sy=0,ox=0,oy=0;
        header.addEventListener('pointerdown',e=>{
            if(e.target.closest('.window-controls')||win.classList.contains('maximized')||(e.pointerType==='mouse'&&e.button!==0)) return;
            e.preventDefault(); id=e.pointerId; sx=e.clientX; sy=e.clientY; ox=win.offsetLeft; oy=win.offsetTop; header.setPointerCapture(id);
        });
        header.addEventListener('pointermove',e=>{
            if(id!==e.pointerId) return;
            win.style.left=Math.min(Math.max(0,desktopArea.clientWidth-win.offsetWidth),Math.max(0,ox+e.clientX-sx))+'px';
            win.style.top=Math.min(Math.max(0,desktopArea.clientHeight-win.offsetHeight),Math.max(0,oy+e.clientY-sy))+'px';
        });
        const end=e=>{if(id===e.pointerId)id=null;}; header.addEventListener('pointerup',end); header.addEventListener('pointercancel',end);
        header.addEventListener('lostpointercapture',()=>{id=null;});
    }
    function constrainWindows() {
        windowsList.forEach(r=>{
            if(r.maximized||r.minimized)return;
            r.element.style.left=Math.min(Math.max(0,desktopArea.clientWidth-r.element.offsetWidth),Math.max(0,r.element.offsetLeft))+'px';
            r.element.style.top=Math.min(Math.max(0,desktopArea.clientHeight-r.element.offsetHeight),Math.max(0,r.element.offsetTop))+'px';
        });
    }
    function updateClock() {
        taskbarClock.textContent=new Intl.DateTimeFormat('en-US',{timeZone:'America/Bogota',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date());
    }
    const observer=new ResizeObserver(()=>{scheduleLayout();constrainWindows();});
    observer.observe(taskbar); observer.observe(desktopArea);
    window.addEventListener('resize',()=>{scheduleLayout();constrainWindows();},{passive:true});
    window.addEventListener('orientationchange',scheduleLayout,{passive:true});

    const logo=document.getElementById('logo-trigger');
    if((localStorage.getItem('re_theme')||'dark')==='light')document.body.classList.add('light-theme');
    if(logo)logo.addEventListener('click',()=>{
        document.body.classList.toggle('light-theme');
        localStorage.setItem('re_theme',document.body.classList.contains('light-theme')?'light':'dark');
    });
});
