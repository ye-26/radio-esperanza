/**
 * Módulo de Programación Centralizado - Radio Esperanza
 * Versión optimizada y robusta para entornos estáticos (GitHub Pages / Local)
 */

// 1. FUENTE DE DATOS CENTRALIZADA (Puedes editar esto fácilmente cuando quieras cambiar horarios o eventos)
const baseProgramacionDatos = {
  "horarios_normales": [
    {
      "name": "Anochecer con Cristo",
      "days_array": [0, 1, 2, 3, 4, 5], // Domingo a Viernes
      "hora": "19:00"
    },
    {
      "name": "Especiales Musicales en Vivo",
      "days_array": [6], // Sábados
      "hora": "17:30"
    }
  ]
};

// Obtener la hora actual de Colombia
function getColombiaTime() {
 const now = new Date();
 const colTimeStr = now.toLocaleString("en-US", { timeZone: "America/Bogota" });
 return new Date(colTimeStr);
}


// Control de Estado en Vivo (Prioriza Evento Especial sobre Transmisión/Fuera de línea)
function checkLiveStatus() {
  const dateBogota = getColombiaTime();
  const currentDay = dateBogota.getDay();
  const currentTimeMinutes = dateBogota.getHours() * 60 + dateBogota.getMinutes();
  
  const año = dateBogota.getFullYear();
  const mes = String(dateBogota.getMonth() + 1).padStart(2, '0');
  const dia = String(dateBogota.getDate()).padStart(2, '0');
  const fechaActual = `${año}-${mes}-${dia}`;
  
  const horas = String(dateBogota.getHours()).padStart(2, '0');
  const minutos = String(dateBogota.getMinutes()).padStart(2, '0');
  const horaActualStr = `${horas}:${minutos}`;

  const badge = document.getElementById('status-badge');
  const text = document.getElementById('status-text');
  if (!badge || !text) return;

  // 1. PRIORIDAD: Evento Especial activo
  const eventoActivo = baseProgramacionDatos.eventos_especiales.find(ev => {
    return ev.fecha === fechaActual && 
           horaActualStr >= ev.hora_inicio && 
           horaActualStr <= ev.hora_fin;
  });

  if (eventoActivo) {
    badge.className = 'badge-live evento-especial';
    badge.style.background = 'rgba(255, 152, 0, 0.2)';
    badge.style.border = '1px solid rgba(255, 152, 0, 0.5)';
    badge.style.color = '#ffb74d';
    text.textContent = `Evento Especial: ${eventoActivo.titulo}`;
    return;
  } else {
    badge.style.background = '';
    badge.style.border = '';
    badge.style.color = '';
  }

  // 2. PRIORIDAD: Horarios Normales
  let isOnline = false;
  for (let slot of baseProgramacionDatos.horarios_normales) {
    const diasValidos = slot.days_array !== undefined ? slot.days_array : [slot.dia];
    if (diasValidos.includes(currentDay)) {
      const [startH, startM] = slot.hora.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = startMinutes + 120; // Margen de duración

      if (currentTimeMinutes >= startMinutes && currentTimeMinutes < endMinutes) {
        isOnline = true; 
        break;
      }
    }
  }

  if (isOnline) {
    badge.className = 'badge-live online'; 
    text.textContent = 'En Transmisión';
  } else {
    badge.className = 'badge-live offline'; 
    text.textContent = 'Fuera de Línea';
  }
}

// Renderizar Horarios Normales (Adaptados a la hora local del visitante)
function convertAndDisplaySchedule() {
  const container = document.getElementById('schedule-container') || document.getElementById('contenido-horarios');
  if (!container || !baseProgramacionDatos.horarios_normales.length) return;
  
  let localZone = "America/Bogota";
  try { 
    localZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Bogota"; 
  } catch(e){}

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

  let newHtml = "<div style='display:flex; flex-direction:column; gap:10px;'>";
  baseProgramacionDatos.horarios_normales.forEach(prog => {
    let timeGroups = {};
    const diasAnalizar = prog.days_array !== undefined ? prog.days_array : [prog.dia];
    
    diasAnalizar.forEach(d => {
      const dateObj = new Date(`${refDates[d]}T${prog.hora}:00-05:00`);
      
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
      
      newHtml += `
        <div class="tarjeta-archivo" style="flex-direction:column; align-items:flex-start; padding: 12px 16px;">
          <div style="font-weight: bold; font-size: 0.95rem; color: #ffffff; margin-bottom: 4px;">${prog.name}</div>
          <div style="font-size: 0.8rem; color: #b388ff;">⏰ ${daysStr} - ${time}</div>
        </div>
      `;
    }
  });
  newHtml += "</div>";
  
  container.innerHTML = newHtml;
  
  const tzIndicator = document.getElementById('tz-indicator');
  if (tzIndicator && localZone !== "America/Bogota") {
    tzIndicator.textContent = "(Horarios adaptados a tu hora local)";
  }
}

// Renderizar Eventos Especiales
function renderizarEventosEspeciales() {
  const contEventos = document.getElementById('contenido-eventos');
  if (!contEventos) return;

  if (!baseProgramacionDatos.eventos_especiales || baseProgramacionDatos.eventos_especiales.length === 0) {
    contEventos.innerHTML = '<div class="estado-vacio-recursos" style="text-align:center; padding:20px; color:#a0a0a0;">No hay eventos especiales programados.</div>';
    return;
  }

  let html = '<div style="display:flex; flex-direction:column; gap:10px;">';
  baseProgramacionDatos.eventos_especiales.forEach(ev => {
    html += `
      <div class="tarjeta-archivo" style="border-left: 4px solid #ff9800; flex-direction:column; align-items:flex-start; padding: 14px;">
        <div style="color: #ffb74d; font-weight: bold; font-size: 1rem; margin-bottom: 5px;">${ev.titulo}</div>
        <div style="font-size: 0.75rem; color: #d1c4e9; margin-bottom: 6px;">
          <span style="background: rgba(255,152,0,0.2); padding: 2px 6px; border-radius: 4px;">📅 ${ev.fecha}</span>
          <span style="margin-left:8px;">⏰ ${ev.hora_inicio} a ${ev.hora_fin}</span>
        </div>
        <div style="font-size: 0.8rem; color: #e0e0e0; line-height: 1.3;">${ev.descripcion}</div>
      </div>
    `;
  });
  html += '</div>';
  contEventos.innerHTML = html;
}

// Inicialización de la interfaz y pestañas internas de Programación
document.addEventListener('DOMContentLoaded', () => {
  // Ejecutar renderizado inmediato
  convertAndDisplaySchedule();
  renderizarEventosEspeciales();
  checkLiveStatus();

  // Control de los botones internos (Ver horarios vs Ver eventos)
  const btnHorarios = document.getElementById('btn-ver-horarios');
  const btnEventos = document.getElementById('btn-ver-eventos');
  const contHorarios = document.getElementById('contenido-horarios') || document.getElementById('schedule-container');
  const contEventos = document.getElementById('contenido-eventos');

  if (btnHorarios && btnEventos) {
    btnHorarios.addEventListener('click', () => {
      btnHorarios.style.background = '';
      btnEventos.style.background = 'rgba(255, 152, 0, 0.1)';
      if (contHorarios) contHorarios.style.display = 'block';
      if (contEventos) contEventos.style.display = 'none';
    });

    btnEventos.addEventListener('click', () => {
      btnEventos.style.background = 'rgba(255, 152, 0, 0.4)';
      btnHorarios.style.background = 'rgba(255, 255, 255, 0.05)';
      if (contHorarios) contHorarios.style.display = 'none';
      if (contEventos) contEventos.style.display = 'block';
    });
  }
});
