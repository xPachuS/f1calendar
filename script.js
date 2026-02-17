/**
 * Lógica principal para F1 Calendario 2026
 * Maneja carga de JSON, cuenta atrás, filtros y renderizado dinámico de sesiones.
 */

document.addEventListener('DOMContentLoaded', () => {
    loadRaces();
});

let db_races = []; // Almacenamiento global de los datos

// --- DICCIONARIO: TRADUCTOR DE EMOJI A CÓDIGO ISO PARA BANDERAS ---
const emojiToIso = {
    "🇦🇺": "au", "🇨🇳": "cn", "🇯🇵": "jp", "🇧🇭": "bh", "🇸🇦": "sa",
    "🇺🇸": "us", "🇨🇦": "ca", "🇲🇨": "mc", "🇪🇸": "es", "🇦🇹": "at",
    "🇬🇧": "gb", "🇧🇪": "be", "🇭🇺": "hu", "🇳🇱": "nl", "🇮🇹": "it",
    "🇦🇿": "az", "🇸🇬": "sg", "🇲🇽": "mx", "🇧🇷": "br", "🇶🇦": "qa",
    "🇦🇪": "ae"
};

// --- DICCIONARIO: NOMBRES AMIGABLES PARA LAS SESIONES ---
const sessionLabels = {
    "fp1": "Libres 1",
    "fp2": "Libres 2",
    "fp3": "Libres 3",
    "sprint_quali": "Clasif. Sprint",
    "sprint_race": "Carrera Sprint",
    "quali": "Clasificación",
    "race": "CARRERA"
};

// --- 1. CARGA DE DATOS ---
async function loadRaces() {
    const grid = document.getElementById('races-grid');
    
    try {
        const response = await fetch('races.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        db_races = await response.json();
        
        renderRaces('all'); 
        initCountdown();    
        
    } catch (error) {
        console.error("Error cargando carreras:", error);
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 2rem; border: 1px solid #ff4444; background: rgba(255,0,0,0.05); border-radius: 8px; color: #ffcccc;">
                <h2>⚠️ Error cargando datos</h2>
                <p>Asegúrate de usar un Servidor Local (ej. Live Server en VS Code).</p>
            </div>
        `;
    }
}

// --- 2. RENDERIZADO DE TARJETAS ---
function renderRaces(filter) {
    const grid = document.getElementById('races-grid');
    grid.innerHTML = ''; 
    
    const now = new Date();
    let racesToShow = db_races;

    if (filter === 'upcoming') {
        racesToShow = db_races.filter(race => new Date(race.date + "T23:59:59") >= now);
    } else if (filter === 'completed') {
        racesToShow = db_races.filter(race => new Date(race.date + "T23:59:59") < now);
    }

    racesToShow.forEach(race => {
        const card = document.createElement('div');
        card.className = 'race-card';
        if(isImmediateNext(race)) card.classList.add('next-race-highlight');

        const humanDate = new Date(race.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
        const isoCode = emojiToIso[race.flag] || 'xx'; 

        // Estilo de fondo: Degradado para legibilidad + Imagen del país
        const backgroundStyle = `linear-gradient(rgba(20, 20, 30, 0.7), rgba(20, 20, 30, 0.9)), url('${race.bg_image}')`;

        // Generar lista de sesiones dinámicamente (Líneas separadas)
        const sessionsHTML = Object.entries(race.sessions).map(([key, value]) => {
            return `
                <li class="session-item ${key === 'race' ? 'main-race' : ''}">
                    <span>${sessionLabels[key] || key}</span>
                    <span>${value}</span>
                </li>`;
        }).join('');

        card.innerHTML = `
            <div class="card-header" style="background-image: ${backgroundStyle}">
                <div class="header-info">
                    <span class="round-num">Ronda ${race.round}</span>
                    ${race.is_sprint ? '<span class="sprint-badge">SPRINT</span>' : ''}
                </div>
                <img src="https://flagcdn.com/w80/${isoCode}.png" alt="${race.flag}" class="flag-img">
            </div>
            <div class="card-body">
                <h3>${race.name}</h3>
                <span class="circuit-name"><i class="fas fa-road"></i> ${race.circuit}</span>
                <div class="date-badge"><i class="far fa-calendar-alt"></i> ${humanDate}</div>
                
                <ul class="sessions-list">
                    ${sessionsHTML}
                </ul>
            </div>
        `;
        grid.appendChild(card);
    });
}

function isImmediateNext(race) {
    const now = new Date();
    const timeStr = race.sessions.race.split(' ')[1]; 
    const raceDateTime = new Date(`${race.date}T${timeStr}:00`);
    raceDateTime.setHours(raceDateTime.getHours() + 2); // Margen post-carrera
    return raceDateTime > now && raceDateTime < new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000));
}

// --- 3. LÓGICA DEL COUNTDOWN ---
function initCountdown() {
    const countdownEl = document.getElementById('countdown');
    const nextRaceNameEl = document.getElementById('next-race-name');
    
    const updateTimer = () => {
        const now = new Date();
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

        const isoCode = emojiToIso[upcomingRace.flag] || 'xx';
        nextRaceNameEl.innerHTML = `
            <img src="https://flagcdn.com/w80/${isoCode}.png" class="hero-flag" alt="Bandera">
            <span>${upcomingRace.name}</span>
        `;

        const timeStr = upcomingRace.sessions.race.split(' ')[1];
        const targetDate = new Date(`${upcomingRace.date}T${timeStr}:00`);
        const distance = targetDate.getTime() - now.getTime();

        if (distance < 0 && distance > -7200000) {
            countdownEl.innerText = "¡EN PISTA!";
            countdownEl.style.color = "#44ff44"; 
            nextRaceNameEl.innerHTML += " <span style='color:#44ff44; font-size:0.6em; margin-left:10px;'>● EN VIVO</span>";
            return;
        } 
        
        const d = Math.floor(distance / (1000 * 60 * 60 * 24));
        const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((distance % (1000 * 60)) / 1000);

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

// --- 4. CONTROL DE FILTROS ---
window.filterRaces = function(type) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        if(btn.getAttribute('onclick').includes(type)) btn.classList.add('active');
    });
    renderRaces(type);
};
