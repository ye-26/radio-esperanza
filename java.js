// 🔒 PROTECCIÓN ANTI-COPIA
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('copy', e => e.preventDefault());

// 🕒 FUNCIÓN MAESTRA INFALIBLE PARA HORA DE COLOMBIA (UTC-5)
function getColombiaTime() {
  const now = new Date();
  // Sumamos el offset del navegador para conseguir UTC real, luego restamos 5 horas
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * -5));
}

// 🔘 TRUCO PARA PROBAR LAS ANIMACIONES: Clic al Logo
let manualOverride = false;
document.getElementById('logo-trigger').addEventListener('click', function() {
  manualOverride = true; // Pausa el reloj automático para que pruebes
  if (document.body.classList.contains('day-mode')) {
    document.body.classList.remove('day-mode');
    document.body.classList.add('night-mode');
  } else {
    document.body.classList.remove('night-mode');
    document.body.classList.add('day-mode');
  }
});

// ⚙️ FONDO DINÁMICO AUTOMÁTICO
function updateDynamicBackground() {
  if (manualOverride) return; // Si tocaste el logo, respeta el cambio manual
  
  const dateBogota = getColombiaTime();
  const hour = dateBogota.getHours();

  // Día: de 6:00 AM a 5:59 PM. Noche: Resto del tiempo.
  if (hour >= 6 && hour < 18) {
    document.body.classList.remove('night-mode');
    document.body.classList.add('day-mode');
  } else {
    document.body.classList.remove('day-mode');
    document.body.classList.add('night-mode');
  }
}
updateDynamicBackground();
setInterval(updateDynamicBackground, 60000); // Revisa cada minuto

// 📡 CONTROL DE TRANSMISIÓN
const horariosTransmision = [
  { dia: 0, inicio: "19:00", fin: "20:00" }, { dia: 1, inicio: "19:00", fin: "20:00" },
  { dia: 2, inicio: "19:00", fin: "20:00" }, { dia: 3, inicio: "19:00", fin: "20:00" },
  { dia: 4, inicio: "19:00", fin: "20:00" }, { dia: 5, inicio: "19:00", fin: "20:00" },
  { dia: 6, inicio: "19:00", fin: "20:00" }
];

function checkLiveStatus() {
  const dateBogota = getColombiaTime();
  const currentDay = dateBogota.getDay();
  const currentTime = dateBogota.getHours() * 60 + dateBogota.getMinutes();
  
  let isOnline = false;
  for (let slot of horariosTransmision) {
    if (slot.dia === currentDay) {
      const [startH, startM] = slot.inicio.split(':').map(Number);
      const [endH, endM] = slot.fin.split(':').map(Number);
      if (currentTime >= (startH * 60 + startM) && currentTime < (endH * 60 + endM)) {
        isOnline = true; break;
      }
    }
  }

  const badge = document.getElementById('status-badge');
  const text = document.getElementById('status-text');
  if (isOnline) {
    badge.className = 'badge-live online'; text.textContent = 'En Transmisión';
  } else {
    badge.className = 'badge-live offline'; text.textContent = 'Fuera de Línea';
  }
}

// ⏱️ RELOJ EN MÁSCARA Y PESTAÑAS
function switchTab(tabId, evt) {
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  if (evt && evt.currentTarget) evt.currentTarget.classList.add('active');
}

function updateClock() {
  const now = new Date();
  let hours = now.getHours();
  let minutes = now.getMinutes() < 10 ? '0' + now.getMinutes() : now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12; hours = hours ? hours : 12; 
  document.getElementById('clockDisplay').textContent = `⏱️ ${hours}:${minutes} ${ampm}`;
  checkLiveStatus();
}
setInterval(updateClock, 1000); updateClock(); 

// 🗓️ ZONAS HORARIAS PARA HORARIOS
const baseSchedule = [
  { name: "Anochecer con Cristo", days: [0, 1, 2, 3, 4, 5], time: "19:00" },
  { name: "Especiales Musicales en Vivo", days: [6], time: "17:30" },
];

function convertAndDisplaySchedule() {
  const container = document.getElementById('schedule-container');
  if (!container) return;
  let localZone = "America/Bogota";
  try { localZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Bogota"; } catch(e){}

  const formatterISO = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' });
  const bogotaDate = new Date(formatterISO.format(new Date()) + "T12:00:00-05:00");
  const refDates = {};
  for (let i = 0; i < 7; i++) {
    const targetDate = new Date(bogotaDate.getTime() + (i - bogotaDate.getDay()) * 86400000);
    refDates[i] = `${targetDate.getFullYear()}-${String(targetDate.getMonth()+1).padStart(2,'0')}-${String(targetDate.getDate()).padStart(2,'0')}`;
  }

  const pluralDays = { "domingo": "Domingos", "lunes": "Lunes", "martes": "Martes", "miércoles": "Miércoles", "jueves": "Jueves", "viernes": "Viernes", "sábado": "Sábados" };
  const dayIdx = { "domingo":0, "lunes":1, "martes":2, "miércoles":3, "jueves":4, "viernes":5, "sábado":6 };
  const formatterDay = new Intl.DateTimeFormat('es-ES', { weekday: 'long', timeZone: localZone });
  const formatterTime = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: localZone });

  let newHtml = "";
  baseSchedule.forEach(prog => {
    let timeGroups = {};
    prog.days.forEach(d => {
      const dateObj = new Date(`${refDates[d]}T${prog.time}:00-05:00`);
      let localDay = formatterDay.format(dateObj).toLowerCase().replace('miercoles','miércoles').replace('sabado','sábado');
      let localTime = formatterTime.format(dateObj).toUpperCase();
      if (/^\d:/.test(localTime)) localTime = "0" + localTime;
      if (!timeGroups[localTime]) timeGroups[localTime] = [];
      if (!timeGroups[localTime].includes(localDay)) timeGroups[localTime].push(localDay);
    });

    for (let time in timeGroups) {
      let days = timeGroups[time].sort((a,b) => dayIdx[a]-dayIdx[b]);
      let isRange = true;
      for (let i = 0; i < days.length - 1; i++) if (dayIdx[days[i+1]] - dayIdx[days[i]] !== 1) { isRange = false; break; }
      let daysStr = (isRange && days.length >= 3) ? `${pluralDays[days[0]]} a ${pluralDays[days[days.length-1]]}` :
                    (days.length === 2 && isRange) ? `${pluralDays[days[0]]} y ${pluralDays[days[1]]}` :
                    days.length === 1 ? pluralDays[days[0]] : days.map(d => pluralDays[d]).join(", ");
      newHtml += `<div class="schedule-item"><strong>${daysStr} - ${time}:</strong> ${prog.name}</div>`;
    }
  });
  container.innerHTML = newHtml;
  if (localZone !== "America/Bogota") document.getElementById('tz-indicator').textContent = "(Adaptado a tu hora local)";
}
document.addEventListener('DOMContentLoaded', convertAndDisplaySchedule);
