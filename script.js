/**
 * Lógica principal para F1 Calendario 2026
 * * CARACTERÍSTICAS:
 * 1. Lee el archivo 'races.json'.
 * 2. Convierte los Emojis del JSON a imágenes reales de banderas.
 * 3. Calcula la cuenta atrás precisa (ajustada a zona horaria local).
 * 4. Filtra entre carreras Próximas y Completadas.
 */

document.addEventListener('DOMContentLoaded', () => {
    loadRaces();
});

let db_races = []; // Variable global para almacenar los datos

// --- DICCIONARIO: TRADUCTOR DE EMOJI A CÓDIGO ISO ---
// Esto permite usar tu JSON con emojis y mostrar fotos reales de banderas
const emojiToIso = {
    "🇦🇺": "au", // Australia
    "🇨🇳": "cn", // China
    "🇯🇵": "jp", // Japón
    "🇧🇭": "bh", // Bahrein
    "🇸🇦": "sa", // Arabia Saudí
    "🇺🇸": "us", // Estados Unidos (Miami, Austin, Vegas)
    "🇨🇦": "ca", // Canadá
    "🇲🇨": "mc", // Mónaco
    "🇪🇸": "es", // España (Barcelona, Madrid)
    "🇦🇹": "at", // Austria
    "🇬🇧": "gb", // Gran Bretaña
    "🇧🇪": "be", // Bélgica
    "🇭🇺": "hu", // Hungría
    "🇳🇱": "nl", // Países Bajos
    "🇮🇹": "it", // Italia
    "🇦🇿": "az", // Azerbaiyán
    "🇸🇬": "sg", // Singapur
    "🇲🇽": "mx", // México
    "🇧🇷": "br", // Brasil
    "🇶🇦": "qa", // Qatar
    "🇦🇪": "ae"  // Emiratos Árabes (Abu Dhabi)
};

// --- 1. CARGA DE DATOS ---
async function loadRaces() {
    const grid = document.getElementById('races-grid');
    
    try {
        const response = await fetch('races.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        db_races = await response.json();
        
        // Inicializar la aplicación
        renderRaces('all'); 
        initCountdown();    
        
    } catch (error) {
        console.error("Error cargando carreras:", error);
        // Mensaje de error amigable
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 2rem; border: 1px solid #ff4444; background: rgba(255,0,0,0.05); border-radius: 8px; color: #ffcccc;">
                <h2>⚠️ Error cargando datos</h2>
                <p>No se pudo leer <strong>races.json</strong>.</p>
                <p style="font-size: 0.9em; margin-top: 10px; color: #aaa;">
                    Recuerda: Para que esto funcione, necesitas abrir el archivo HTML usando un <strong>Servidor Local</strong> 
                    (como la extensión 'Live Server' en VS Code), no haciendo doble clic en el archivo.
                </p>
            </div>
        `;
    }
}

// --- 2. RENDERIZADO DE TARJETAS ---
function renderRaces(filter) {
    const grid = document.getElementById('races-grid');
    grid.innerHTML = ''; // Limpiar contenido anterior
    
    const now = new Date();
    let racesToShow = db_races;

    // Lógica de filtrado
    if (filter === 'upcoming') {
        racesToShow = db_races.filter(race => {
            // Se considera "futura" si no ha terminado el día de la carrera
            return new Date(race.date + "T23:59:59") >= now;
        });
    } else if (filter === 'completed') {
        racesToShow = db_races.filter(race => {
            return new Date(race.date + "T23:59:59") < now;
        });
    }

    racesToShow.forEach(race => {
        const card = document.createElement('div');
        card.className = 'race-card';
        
        // Destacar la próxima carrera inmediata
        if(isImmediateNext(race)) card.classList.add('next-race-highlight');

        // Formatear fecha (Ej: "8 de marzo")
        const humanDate = new Date(race.date).toLocaleDateString('es-ES', { 
            day: 'numeric', month: 'long' 
        });

        // Obtener código ISO para la imagen, o usar 'xx' si no existe
        const isoCode = emojiToIso[race.flag] || 'xx'; 

        card.innerHTML = `
            <div class="card-header">
                <span class="round-num">Ronda ${race.round}</span>
                <img src="https://flagcdn.com/w80/${isoCode}.png" alt="${race.flag}" class="flag-img" title="Bandera">
            </div>
            <div class="card-body">
                <h3>${race.name}</h3>
                <span class="circuit-name"><i class="fas fa-road"></i> ${race.circuit}</span>
                <div class="date-badge"><i class="far fa-calendar-alt"></i> ${humanDate}</div>
                
                <ul class="sessions-list">
                    <li class="session-item"><span>L1 / L2</span> <span>${race.sessions.fp1} / ${race.sessions.fp2}</span></li>
                    <li class="session-item"><span>Quali</span> <span>${race.sessions.quali}</span></li>
                    <li class="session-item main-race"><span>CARRERA</span> <span>${race.sessions.race}</span></li>
                </ul>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Helper: Detecta si es la carrera activa o la siguiente inmediata (para el borde rojo)
function isImmediateNext(race) {
    const now = new Date();
    const timeStr = race.sessions.race.split(' ')[1]; // Extraer hora "06:00"
    const raceDateTime = new Date(`${race.date}T${timeStr}:00`);
    
    // Margen de 2 horas post-inicio
    raceDateTime.setHours(raceDateTime.getHours() + 2);
    
    // Si la fecha es futura Y está dentro de las próximas 2 semanas
    return raceDateTime > now && raceDateTime < new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000));
}

// --- 3. LÓGICA DEL COUNTDOWN ---
function initCountdown() {
    const countdownEl = document.getElementById('countdown');
    const nextRaceNameEl = document.getElementById('next-race-name');
    
    const updateTimer = () => {
        const now = new Date();
        
        // Buscar la primera carrera que NO ha terminado
        const upcomingRace = db_races.find(r => {
            const timeStr = r.sessions.race.split(' ')[1];
            const raceEndObj = new Date(`${r.date}T${timeStr}:00`);
            raceEndObj.setHours(raceEndObj.getHours() + 2); // +2 horas de duración estimada
            return raceEndObj > now;
        });

        if (!upcomingRace) {
            nextRaceNameEl.innerText = "Temporada Finalizada";
            countdownEl.innerText = "00d 00h 00m 00s";
            return;
        }

        // Mostrar bandera e info en la cabecera
        const isoCode = emojiToIso[upcomingRace.flag] || 'xx';
        
        nextRaceNameEl.innerHTML = `
            <img src="https://flagcdn.com/w40/${isoCode}.png" style="height: 30px; border-radius: 4px; box-shadow: 0 0 5px rgba(0,0,0,0.5);">
            <span>${upcomingRace.name}</span>
        `;

        // Calcular tiempo restante
        const timeStr = upcomingRace.sessions.race.split(' ')[1];
        const targetDate = new Date(`${upcomingRace.date}T${timeStr}:00`);
        const distance = targetDate.getTime() - now.getTime();

        // Si la carrera ya empezó pero no ha terminado (distancia negativa pequeña)
        if (distance < 0 && distance > -7200000) {
            countdownEl.innerText = "¡EN PISTA AHORA!";
            countdownEl.style.color = "#44ff44"; // Verde neón
            nextRaceNameEl.innerHTML += " <span style='color:#44ff44; font-size:0.6em; vertical-align:middle; margin-left:10px;'>● EN VIVO</span>";
            return;
        } 
        
        // Cálculos de días, horas, etc.
        const d = Math.floor(distance / (1000 * 60 * 60 * 24));
        const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((distance % (1000 * 60)) / 1000);

        // Formato con ceros a la izquierda (01d 05h...)
        const dd = d < 10 ? "0"+d : d;
        const hh = h < 10 ? "0"+h : h;
        const mm = m < 10 ? "0"+m : m;
        const ss = s < 10 ? "0"+s : s;

        countdownEl.innerText = `${dd}d ${hh}h ${mm}m ${ss}s`;
        countdownEl.style.color = "var(--f1-red)";
    };

    // Actualizar inmediatamente y luego cada segundo
    updateTimer();
    setInterval(updateTimer, 1000);
}

// --- 4. FILTROS DE BOTONES ---
window.filterRaces = function(type) {
    // Actualizar estilo de los botones
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    
    // Buscar qué botón se pulsó y activarlo
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        if(btn.getAttribute('onclick').includes(type)) {
            btn.classList.add('active');
        }
    });

    renderRaces(type);
};
