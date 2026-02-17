/**
 * Lógica principal para F1 Calendario 2026
 * * FUNCIONALIDADES:
 * 1. Carga datos desde 'races.json'.
 * 2. Convierte Emojis de banderas a Imágenes (FlagCDN) para uniformidad.
 * 3. Gestiona la cuenta atrás en tiempo real.
 * 4. Filtra carreras (Todas / Próximas / Completadas).
 */

document.addEventListener('DOMContentLoaded', () => {
    loadRaces();
});

let db_races = []; // Variable global para los datos

// --- DICCIONARIO: TRADUCTOR DE EMOJI A CÓDIGO ISO ---
// Necesario para convertir el emoji del JSON en una URL de imagen válida
const emojiToIso = {
    "🇦🇺": "au", // Australia
    "🇨🇳": "cn", // China
    "🇯🇵": "jp", // Japón
    "🇧🇭": "bh", // Bahrein
    "🇸🇦": "sa", // Arabia Saudí
    "🇺🇸": "us", // USA (Miami, Austin, Vegas)
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
    "🇦🇪": "ae"  // Emiratos Árabes
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
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 2rem; border: 1px solid #ff4444; background: rgba(255,0,0,0.05); border-radius: 8px; color: #ffcccc;">
                <h2>⚠️ Error cargando datos</h2>
                <p>No se pudo leer el archivo <strong>races.json</strong>.</p>
                <p style="font-size: 0.9em; margin-top: 10px; color: #aaa;">
                    Asegúrate de ejecutar esto en un <strong>Servidor Local</strong> (Live Server), no abriendo el HTML directamente.
                </p>
            </div>
        `;
    }
}

// --- 2. RENDERIZADO DE TARJETAS ---
function renderRaces(filter) {
    const grid = document.getElementById('races-grid');
    grid.innerHTML = ''; // Limpiar grid
    
    const now = new Date();
    let racesToShow = db_races;

    // Filtros de tiempo
    if (filter === 'upcoming') {
        racesToShow = db_races.filter(race => new Date(race.date + "T23:59:59") >= now);
    } else if (filter === 'completed') {
        racesToShow = db_races.filter(race => new Date(race.date + "T23:59:59") < now);
    }

    racesToShow.forEach(race => {
        const card = document.createElement('div');
        card.className = 'race-card';
        
        // Destacar visualmente la próxima carrera inmediata
        if(isImmediateNext(race)) card.classList.add('next-race-highlight');

        // Formato de fecha español
        const humanDate = new Date(race.date).toLocaleDateString('es-ES', { 
            day: 'numeric', month: 'long' 
        });

        // Convertir Emoji a Código ISO para la imagen
        const isoCode = emojiToIso[race.flag] || 'xx'; 

        // HTML de la tarjeta
        // Nota: Usamos la clase 'flag-img' definida en el CSS para tamaño fijo
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

// Helper: ¿Es esta la próxima carrera activa?
function isImmediateNext(race) {
    const now = new Date();
    const timeStr = race.sessions.race.split(' ')[1]; // "16:00"
    const raceDateTime = new Date(`${race.date}T${timeStr}:00`);
    
    // Sumamos 2 horas de duración de carrera para que siga siendo "la actual" mientras corren
    raceDateTime.setHours(raceDateTime.getHours() + 2);
    
    // Si es futura Y es la más cercana (dentro de 2 semanas)
    return raceDateTime > now && raceDateTime < new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000));
}

// --- 3. LÓGICA DEL COUNTDOWN ---
function initCountdown() {
    const countdownEl = document.getElementById('countdown');
    const nextRaceNameEl = document.getElementById('next-race-name');
    
    const updateTimer = () => {
        const now = new Date();
        
        // Buscar la próxima carrera que no ha terminado
        const upcomingRace = db_races.find(r => {
            const timeStr = r.sessions.race.split(' ')[1];
            const raceEndObj = new Date(`${r.date}T${timeStr}:00`);
            raceEndObj.setHours(raceEndObj.getHours() + 2); 
            return raceEndObj > now;
        });

        if (!upcomingRace) {
            nextRaceNameEl.innerText = "Temporada Finalizada";
            countdownEl.innerText = "00d 00h 00m 00s";
            return;
        }

        // Obtener código de bandera para el Hero
        const isoCode = emojiToIso[upcomingRace.flag] || 'xx';
        
        // Renderizar nombre y bandera grande en el Hero
        // Nota: Usamos la clase 'hero-flag' definida en el CSS
        nextRaceNameEl.innerHTML = `
            <img src="https://flagcdn.com/w80/${isoCode}.png" class="hero-flag" alt="Bandera">
            <span>${upcomingRace.name}</span>
        `;

        // Cálculos de tiempo
        const timeStr = upcomingRace.sessions.race.split(' ')[1];
        const targetDate = new Date(`${upcomingRace.date}T${timeStr}:00`);
        const distance = targetDate.getTime() - now.getTime();

        // Si la carrera está en curso
        if (distance < 0 && distance > -7200000) {
            countdownEl.innerText = "¡EN PISTA AHORA!";
            countdownEl.style.color = "#44ff44"; 
            nextRaceNameEl.innerHTML += " <span style='color:#44ff44; font-size:0.6em; margin-left:10px;'>● EN VIVO</span>";
            return;
        } 
        
        // Matemáticas del tiempo
        const d = Math.floor(distance / (1000 * 60 * 60 * 24));
        const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((distance % (1000 * 60)) / 1000);

        // Padding con ceros
        const dd = d < 10 ? "0"+d : d;
        const hh = h < 10 ? "0"+h : h;
        const mm = m < 10 ? "0"+m : m;
        const ss = s < 10 ? "0"+s : s;

        countdownEl.innerText = `${dd}d ${hh}h ${mm}m ${ss}s`;
        countdownEl.style.color = "var(--f1-red)";
    };

    updateTimer();
    setInterval(updateTimer, 1000);
}

// --- 4. CONTROL DE BOTONES DE FILTRO ---
window.filterRaces = function(type) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    
    // Activar el botón correspondiente
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        if(btn.getAttribute('onclick').includes(type)) {
            btn.classList.add('active');
        }
    });

    renderRaces(type);
};
