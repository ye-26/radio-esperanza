async function showDailyGreeting() {
    try {
        const response = await fetch('config/mensajes.json');
        const mensajes = await response.json();
        const now = new Date();
        let day = now.getDay();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        if (hours > 18 || (hours === 18 && minutes >= 30)) {
            day = (day + 1) % 7;
        }
        const data = mensajes[day];
        if (!data) return;

        const popup = document.createElement('div');
        popup.className = 'greeting-popup';
        popup.id = 'greeting-popup';
        popup.innerHTML = `
            <div class="greeting-header" id="greeting-header">
                <span class="greeting-title">${data.titulo}</span>
                <button class="greeting-close" id="btn-close-greeting">X</button>
            </div>
            <div class="greeting-body">${data.mensaje}</div>
        `;

        document.body.appendChild(popup);

        document.getElementById('btn-close-greeting').addEventListener('click', () => {
            popup.remove();
        });
    } catch (error) {
        console.error(error);
    }
}
