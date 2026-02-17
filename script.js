/**
 * Lógica principal para F1 Calendario 2026
 * Maneja carga de datos JSON, renderizado de tarjetas con imágenes y cuenta atrás.
 */

document.addEventListener('DOMContentLoaded', () => {
    loadRaces();
});

let db_races = []; // Almacenamiento global de las carreras

// --- 1. CARGA DE DATOS ---
async function loadRaces() {
    const grid = document.getElementById('races-grid');
    
    try {
        // Petición al archivo JSON local
        const response = await fetch('races.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        db_races = await response.json();
        
        // Inicializar la aplicación una vez tenemos datos
        renderRaces('all'); // Mostrar todas por defecto
        initCountdown();    // Iniciar el reloj
        
    } catch (error) {
        console.error("Error cargando carreras:", error);
        
        // Mensaje de ayuda para el usuario si falla (común por CORS en local)
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 2rem; background: rgba(255,0,0,0.1); border-radius: 10px; border: 1px solid red;">
                <h2 style="color: #ff4444; margin-bottom: 10px;">⚠️ Error cargando datos</h2>
                <p>No se pudo cargar el archivo <strong>races.json</strong>.</p>
                <p style="font-size: 0.9em; color: #aaa; margin-top: 10px;">
                    <strong>Nota Importante:</strong> Por seguridad, los navegadores bloquean la lectura de archivos JSON si abres el HTML directamente con doble clic (protocolo file://).
                    <br><br>
                    Para que funcione, necesitas usar un <strong>Servidor Local</strong> (como 'Live Server' en VS Code o Python http.server).
                </p>
            </div>
        `;
    }
}

// --- 2. RENDERIZADO DE TARJETAS ---
function renderRaces(filter) {
    const grid = document.getElementById('races-grid');
    grid.innerHTML = ''; // Limpiar grid actual
    
    const now = new Date();
    let racesToShow = db_races;

    // Lógica de filtrado
    if (filter === 'upcoming') {
        // Mostramos carreras cuya fecha (final del día) sea mayor o igual a hoy
        racesToShow = db_races.filter(race => {
            const raceDate = new Date(race.date + "T23:59:59");
            return raceDate >= now;
        });
    } else if (filter === 'completed') {
        // Carreras pasadas
        racesToShow = db_races.filter(race => {
            const raceDate = new Date(race.date + "T23:59:59");
            return raceDate < now;
        });
    }

    // Generar HTML
    racesToShow.forEach(race => {
        const card = document.createElement('div');
        card.className = 'race-card';
        
        // Comprobar si es la INMEDIATA siguiente para destacarla
        if(isImmediateNext(race)) {
            card.classList.add('next-race-highlight');
        }

        // Parsear fecha para mostrarla bonita (Ej: 8 de marzo)
        const humanDate = new Date(race.date).toLocaleDateString('es-ES', { 
            day: 'numeric', 
            month: 'long' 
        });

        // NOTA: Aquí generamos la imagen de la bandera usando el código (race.flag)
        card.innerHTML = `
            <div class="card-header">
                <span class="round-num">Ronda ${race.round}</span>
                <img src="https://flagcdn.com/w80/${race.flag}.png" alt="Bandera ${race.flag}" class="flag-img">
            </div>
            <div class="card-body">
                <h3>${race.name}</h3>
                <span class="circuit-name"><i class="fas fa-road"></i> ${race.circuit}</span>
                <div class="date-badge"><i class="far fa-calendar-alt"></i> ${humanDate}</div>
                
                <ul class="sessions-list">
                    <li class="session-item"><span>L1 / L2</span> <span>${race.sessions.fp1} / ${race.sessions.fp2}</span></li>
                    <li class="session-item"><span>Clasificación</span> <span>${race.sessions.quali}</span></li>
                    <li class="session-item main-race"><span>CARRERA</span> <span>${race.sessions.race}</span></li>
                </ul>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Helper para detectar la próxima carrera visualmente en el grid
function isImmediateNext(race) {
    const now = new Date();
    // Reconstruir fecha exacta de la carrera
    const timeStr = race.sessions.race.split(' ')[1]; // "16:00"
    const raceDateTime = new Date(`${race.date}T${timeStr}:00`);
    
    // Le damos 2 horas de margen (mientras dura la carrera sigue siendo "la actual")
    raceDateTime.setHours(raceDateTime.getHours() + 2);
    
    // Si la fecha es futura y es la primera en la lista que cumple...
    return raceDateTime > now && raceDateTime < new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000));
}

// --- 3. LÓGICA DEL COUNTDOWN ---
function initCountdown() {
    const countdownEl = document.getElementById('countdown');
    const nextRaceNameEl = document.getElementById('next-race-name');
    
    const updateTimer = () => {
        const now = new Date();
        
        // 1. Encontrar la próxima carrera
        const upcomingRace = db_races.find(r => {
            const timeStr = r.sessions.race.split(' ')[1]; // Extraer hora "06:00"
            const raceEndObj = new Date(`${r.date}T${timeStr}:00`);
            raceEndObj.setHours(raceEndObj.getHours() + 2); // Asumimos 2h de carrera
            return raceEndObj > now;
        });

        if (!upcomingRace) {
            nextRaceNameEl.innerText = "Temporada Finalizada";
            countdownEl.innerText = "00d 00h 00m 00s";
            return;
        }

        // 2. Mostrar datos de la próxima (Con bandera pequeña)
        nextRaceNameEl.innerHTML = `
            <img src="https://flagcdn.com/w40/${upcomingRace.flag}.png" style="vertical-align: middle; margin-right: 10px; border-radius: 4px;">
            ${upcomingRace.name}
        `;

        // 3. Calcular tiempo restante
        const timeStr = upcomingRace.sessions.race.split(' ')[1];
        const targetDate = new Date(`${upcomingRace.date}T${timeStr}:00`);
        const distance = targetDate.getTime() - now.getTime();

        // Si estamos en medio de la carrera (distancia negativa pero menor a 2h)
        if (distance < 0 && distance > -7200000) {
            countdownEl.innerText = "¡EN PISTA AHORA MISMO!";
            countdownEl.style.color = "#44ff44"; // Verde
            return;
        } 
        
        // Cálculos matemáticos
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        // Formateo con ceros a la izquierda
        const d = days < 10 ? "0"+days : days;
        const h = hours < 10 ? "0"+hours : hours;
        const m = minutes < 10 ? "0"+minutes : minutes;
        const s = seconds < 10 ? "0"+seconds : seconds;

        countdownEl.innerText = `${d}d ${h}h ${m}m ${s}s`;
        countdownEl.style.color = "var(--f1-red)"; // Reset color
    };

    // Ejecutar inmediatamente y luego cada segundo
    updateTimer();
    setInterval(updateTimer, 1000);
}

// --- 4. FILTROS (Vinculados al objeto window para el HTML) ---
window.filterRaces = function(type) {
    // Gestión de clases CSS 'active'
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    
    // Identificar botón pulsado
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        if(btn.getAttribute('onclick').includes(type)) {
            btn.classList.add('active');
        }
    });

    renderRaces(type);
};
