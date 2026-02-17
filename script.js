/**
 * Lógica principal para F1 Calendario 2026
 * Maneja carga de JSON, cuenta atrás, filtros y renderizado dinámico.
 */

document.addEventListener('DOMContentLoaded', () => {
    loadRaces();
});

let db_races = []; 

// MAPEO DE EMOJIS A CÓDIGOS ISO (FlagCDN)
const emojiToIso = {
    "🇦🇺": "au", "🇨🇳": "cn", "🇯🇵": "jp", "🇧🇭": "bh", "🇸🇦": "sa",
    "🇺🇸": "us", "🇨🇦": "ca", "🇲🇨": "mc", "🇪🇸": "es", "🇦🇹": "at",
    "🇬🇧": "gb", "🇧🇪": "be", "🇭🇺": "hu", "🇳🇱": "nl", "🇮🇹": "it",
    "🇦🇿": "az", "🇸🇬": "sg", "🇲🇽": "mx", "🇧🇷": "br", "🇶🇦": "qa",
    "🇦🇪": "ae"
};

// TRADUCTOR DE SESIONES
const sessionLabels = {
    "fp1": "Libres 1",
    "fp2": "Libres 2",
    "fp3": "Libres 3",
    "sprint_quali": "Clasif. Sprint",
    "sprint_race": "Carrera Sprint",
    "quali": "Clasificación",
    "race": "CARRERA"
};

// 1. CARGA DE DATOS
async function loadRaces() {
    const grid = document.getElementById('races-grid');
    try {
        const response = await fetch('races.json');
        if (!response.ok) throw new Error("No se pudo cargar el archivo races.json");
        db_races = await response.json();
        renderRaces('all'); 
        initCountdown();    
    } catch (error) {
        console.error(error);
        grid.innerHTML = `<div class="error-msg" style="color:white; text-align:center; grid-column:1/-1;">⚠️ Error: ${error.message}</div>`;
    }
}

// 2. RENDERIZADO DE TARJETAS
function renderRaces(filter) {
    const grid = document.getElementById('races-grid');
    grid.innerHTML = ''; 
    const now = new Date();
    
    let filtered = db_races;
    if (filter === 'upcoming') {
        filtered = db_races.filter(r => new Date(r.date + "T23:59:59") >= now);
    } else if (filter === 'completed') {
        filtered = db_races.filter(r => new Date(r.date + "T23:59:59") < now);
    }

    filtered.forEach(race => {
        const card = document.createElement('div');
        card.className = 'race-card';
        if(isImmediateNext(race)) card.classList.add('next-race-highlight');

        const humanDate = new Date(race.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
        const isoCode = emojiToIso[race.flag] || 'xx'; 

        // Fondo dinámico del header
        const backgroundStyle = `linear-gradient(rgba(20, 20, 30, 0.75), rgba(20, 20, 30, 0.95)), url('${race.bg_image}')`;

        // Generar lista de sesiones
        const sessionsHTML = Object.entries(race.sessions).map(([key, value]) => `
            <li class="session-item ${key === 'race' ? 'main-race' : ''}">
                <span>${sessionLabels[key] || key}</span>
                <span>${value}</span>
            </li>
        `).join('');

        card.innerHTML = `
            <div class="card-header" style="background-image: ${backgroundStyle}; background-size: cover; background-position: center;">
                <div class="header-top" style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                    <div style="display: flex; flex-direction: column;">
                        <span class="round-num" style="color: #e10600; font-weight: bold; font-size: 0.8em;">RONDA ${race.round}</span>
                        ${race.is_sprint ? '<span class="sprint-tag" style="background: #e10600; color: white; font-size: 0.6em; padding: 2px 5px; border-radius: 3px; margin-top: 5px; width: fit-content;">SPRINT</span>' : ''}
                    </div>
                    <img src="https://flagcdn.com/w80/${isoCode}.png" class="flag-img" alt="Flag" style="width: 40px; border-radius: 3px;">
                </div>
            </div>
            <div class="card-body" style="padding: 1.5rem; position: relative;">
                <div class="title-row" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                    <h3 style="margin: 0; font-size: 1.4em; max-width: 70%;">${race.name}</h3>
                    <img src="${race.circuit_image}" class="circuit-thumb" alt="Layout" style="width: 60px; filter: brightness(0) invert(1); opacity: 0.8;">
                </div>
                <span class="circuit-name" style="color: #a0a0a0; font-size: 0.9em; display: block; margin-bottom: 10px;">
                    <i class="fas fa-road"></i> ${race.circuit}
                </span>
                <div class="date-badge" style="background: rgba(255,255,255,0.1); padding: 5px 10px; border-radius: 5px; font-size: 0.85em; display: inline-block; margin-bottom: 15px;">
                    <i class="far fa-calendar-alt"></i> ${humanDate}
                </div>
                <ul class="sessions-list" style="list-style: none; padding: 0; border-top: 1px solid #38383f; padding-top: 10px;">
                    ${sessionsHTML}
                </ul>
            </div>
        `;
        grid.appendChild(card);
    });
}

function isImmediateNext(race) {
    const now = new Date();
    const raceDate = new Date(`${race.date}T${race.sessions.race.split(' ')[1]}:00`);
    const diffDays = (raceDate - now) / (1000 * 60 * 60 * 24);
    return diffDays > 0 && diffDays < 14;
}

// 3. COUNTDOWN
function initCountdown() {
    const timer = document.getElementById('countdown');
    const name = document.getElementById('next-race-name');

    const run = () => {
        const now = new Date();
        const next = db_races.find(r => {
            const rTime = new Date(`${r.date}T${r.sessions.race.split(' ')[1]}:00`);
            rTime.setHours(rTime.getHours() + 2);
            return rTime > now;
        });

        if (!next) {
            name.innerText = "Temporada 2026 Finalizada";
            timer.innerText = "00d 00h 00m 00s";
            return;
        }

        const iso = emojiToIso[next.flag];
        name.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; gap: 15px;">
                <img src="https://flagcdn.com/w80/${iso}.png" class="hero-flag" style="width: 50px; border-radius: 5px;">
                <span>${next.name}</span>
                <img src="${next.circuit_image}" style="width: 50px; filter: brightness(0) invert(1);">
            </div>
        `;

        const target = new Date(`${next.date}T${next.sessions.race.split(' ')[1]}:00`);
        const dist = target - now;

        if (dist < 0) {
            timer.innerText = "¡EN VIVO!";
            timer.style.color = "#44ff44";
            return;
        }

        const d = Math.floor(dist / 86400000);
        const h = Math.floor((dist % 86400000) / 3600000);
        const m = Math.floor((dist % 3600000) / 60000);
        const s = Math.floor((dist % 60000) / 1000);

        timer.innerText = `${d.toString().padStart(2,'0')}d ${h.toString().padStart(2,'0')}h ${m.toString().padStart(2,'0')}m ${s.toString().padStart(2,'0')}s`;
    };

    run();
    setInterval(run, 1000);
}

// 4. FILTROS
window.filterRaces = (type) => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (event) event.target.classList.add('active');
    renderRaces(type);
};
