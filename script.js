/**
 * Lógica principal para F1 Calendario 2026
 * DATOS OFICIALES: FORMULA1.COM + TV INFO + JOLPI/ERGAST API
 */

document.addEventListener('DOMContentLoaded', () => {
    loadData();
});

let db_races = []; 
let db_tv = []; 

// DICCIONARIO: TRADUCTOR DE EMOJI A CÓDIGO ISO (FlagCDN)
const emojiToIso = {
    "🇦🇺": "au", "🇨🇳": "cn", "🇯🇵": "jp", "🇧🇭": "bh", "🇸🇦": "sa",
    "🇺🇸": "us", "🇨🇦": "ca", "🇲🇨": "mc", "🇪🇸": "es", "🇦🇹": "at",
    "🇬🇧": "gb", "🇧🇪": "be", "🇭🇺": "hu", "🇳🇱": "nl", "🇮🇹": "it",
    "🇦🇿": "az", "🇸🇬": "sg", "🇲🇽": "mx", "🇧🇷": "br", "🇶🇦": "qa",
    "🇦🇪": "ae", "🇫🇷": "fr", "🇩🇪": "de", "🇦🇷": "ar", "🇫🇮": "fi"
};

const sessionLabels = {
    "fp1": "Libres 1",
    "fp2": "Libres 2",
    "fp3": "Libres 3",
    "sprint_quali": "Clasif. Sprint",
    "sprint_race": "Carrera Sprint",
    "quali": "Clasificación",
    "race": "CARRERA"
};

// DICCIONARIO: COLORES OFICIALES DE LAS ESCUDERÍAS
const teamColors = {
    "red bull": "#3671C6",
    "ferrari": "#E8002D",
    "mercedes": "#00D2BE",
    "mclaren": "#FF8000",
    "aston martin": "#229971",
    "alpine": "#0090FF",
    "williams": "#005AFF",
    "rb": "#6692FF",       
    "sauber": "#52E252",   
    "haas": "#FFFFFF"      
};

function getTeamColor(teamName) {
    if(!teamName) return "var(--text-dim)";
    const nameLower = teamName.toLowerCase();
    for (const [key, color] of Object.entries(teamColors)) {
        if (nameLower.includes(key)) return color;
    }
    return "var(--text-dim)";
}

// Función para traducir los estados de la API (Retirados, vueltas perdidas, etc.)
function translateStatus(status) {
    if (!status) return "";
    if (status.includes("Lap")) return status.replace("Laps", "Vts").replace("Lap", "Vt");
    
    const translations = {
        "Finished": "Finalizado",
        "Retired": "Retirado",
        "Collision": "Colisión",
        "Engine": "Motor",
        "Accident": "Accidente",
        "Power Unit": "Motor",
        "Spun off": "Trompo",
        "Transmission": "Caja"
    };
    return translations[status] || status;
}

// --- 1. CARGA DE DATOS ---
async function loadData() {
    const grid = document.getElementById('races-grid');
    try {
        const [racesRes, tvRes] = await Promise.all([
            fetch('races.json'),
            fetch('tv.json')
        ]);

        if (!racesRes.ok || !tvRes.ok) throw new Error("Error cargando archivos JSON");

        db_races = await racesRes.json();
        db_tv = await tvRes.json();

        renderRaces('all'); 
        initCountdown();    
    } catch (error) {
        console.error("Error:", error);
        grid.innerHTML = `<div class="error-msg" style="color:white; text-align:center; grid-column:1/-1;">⚠️ Error cargando datos locales.</div>`;
    }
}

// --- 2. CONEXIÓN A LA API DE F1 PARA RESULTADOS 2026 ---
async function loadResultsForRace(round) {
    const race = db_races.find(r => r.round === round);
    if (!race || race.results) return;

    try {
        const response = await fetch(`https://api.jolpi.ca/ergast/f1/2026/${round}/results.json`);
        const data = await response.json();
        const raceData = data.MRData.RaceTable.Races[0];

        const container = document.getElementById(`results-list-${round}`);
        if (!container) return;

        if (raceData && raceData.Results && raceData.Results.length > 0) {
            race.results = raceData.Results.map(r => {
                let timeLabel = "";

                // Si hay tiempo (Ganador o Gap), lo usamos. Si no, usamos el status traducido.
                if (r.Time && r.Time.time) {
                    timeLabel = r.Time.time;
                } else {
                    timeLabel = translateStatus(r.status);
                }

                return {
                    pos: r.position,
                    driver: r.Driver.code || r.Driver.familyName.substring(0, 3).toUpperCase(),
                    team: r.Constructor.name,
                    time: timeLabel
                };
            });

            // Renderizado con formato de torre de tiempos profesional
            container.innerHTML = race.results.map(r => `
                <li class="tv-item" style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
                        <span style="font-weight: 700; width: 22px; color: var(--text-dim); text-align: right; flex-shrink: 0;">${r.pos}</span>
                        <span style="font-weight: 700; color: var(--text-light); width: 38px; flex-shrink: 0;">${r.driver}</span>
                        <span style="color: ${getTeamColor(r.team)}; font-weight: 600; font-size: 0.8rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${r.team}</span>
                    </div>
                    <span style="font-family: 'Courier New', monospace; font-size: 0.85rem; color: var(--text-light); text-align: right; min-width: 85px; flex-shrink: 0;">${r.time}</span>
                </li>
            `).join('');
        } else {
            container.innerHTML = `<li class="tv-item" style="justify-content: center; color: var(--text-dim); border:none; margin-top: 20px;">Resultados no disponibles aún</li>`;
        }
    } catch (e) {
        console.error(`Error cargando los resultados de la ronda ${round}:`, e);
    }
}

// --- 3. RENDERIZADO DE TARJETAS ---
function renderRaces(filter) {
    const grid = document.getElementById('races-grid');
    grid.innerHTML = ''; 
    const now = new Date();
    
    const nextActiveRace = db_races.find(r => {
        const raceEndTime = new Date(`${r.date}T${r.sessions.race.split(' ')[1]}:00`);
        raceEndTime.setHours(raceEndTime.getHours() + 3);
        return raceEndTime >= now;
    });

    let filtered = db_races;
    if (filter === 'upcoming') {
        filtered = db_races.filter(r => {
            const raceEndTime = new Date(`${r.date}T${r.sessions.race.split(' ')[1]}:00`);
            raceEndTime.setHours(raceEndTime.getHours() + 3);
            return raceEndTime >= now;
        });
    } else if (filter === 'completed') {
        filtered = db_races.filter(r => {
            const raceEndTime = new Date(`${r.date}T${r.sessions.race.split(' ')[1]}:00`);
            raceEndTime.setHours(raceEndTime.getHours() + 3);
            return raceEndTime < now;
        });
    }

    const tvListHTML = db_tv.map(tv => {
        const iso = emojiToIso[tv.flag] || 'xx'; 
        return `<li class="tv-item">
            <div class="tv-country-wrapper">
                <img src="https://flagcdn.com/w40/${iso}.png" class="tv-flag-img" alt="${tv.country}">
                <span class="tv-country-name">${tv.country}</span>
            </div>
            <span class="tv-broadcaster">${tv.broadcaster}</span>
        </li>`;
    }).join('');

    filtered.forEach(race => {
        const scene = document.createElement('div');
        scene.className = 'race-card-scene';

        const isoCode = emojiToIso[race.flag] || 'xx'; 
        const backgroundStyle = `linear-gradient(rgba(20, 20, 30, 0.75), rgba(20, 20, 30, 0.95)), url('${race.bg_image}')`;

        const raceEndTime = new Date(`${race.date}T${race.sessions.race.split(' ')[1]}:00`);
        raceEndTime.setHours(raceEndTime.getHours() + 3);
        const isFinished = raceEndTime < now;

        let badgeHTML = isFinished 
            ? `<div class="date-badge" style="background: rgba(255, 255, 255, 0.05); color: #777;"><i class="fas fa-flag-checkered" style="color: #777;"></i> FINALIZADO</div>`
            : `<div class="date-badge"><i class="far fa-calendar-alt"></i> ${new Date(race.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</div>`;

        const sessionsHTML = Object.entries(race.sessions).map(([key, value]) => `
            <li class="session-item ${key === 'race' ? 'main-race' : ''}">
                <span>${sessionLabels[key] || key}</span>
                <span>${value}</span>
            </li>`).join('');

        scene.innerHTML = `
            <div class="race-card-flipper" onclick="this.classList.toggle('is-flipped')">
                <div class="card-face card-front">
                    <div class="card-header" style="background-image: ${backgroundStyle}">
                        <div class="header-top">
                            <span class="round-num">Ronda ${race.round}</span>
                            ${race.is_sprint ? '<span style="background:var(--f1-red); padding:2px 8px; border-radius:4px; font-size:0.9em; font-weight:700; margin-left:5px;">SPRINT</span>' : ''}
                        </div>
                        <img src="https://flagcdn.com/w80/${isoCode}.png" class="flag-img" alt="Flag">
                    </div>
                    <div class="card-body">
                        <h3>${race.name}</h3>
                        <span class="circuit-name"><i class="fas fa-road"></i> ${race.circuit}</span>
                        ${badgeHTML}
                        <ul class="sessions-list">${sessionsHTML}</ul>
                    </div>
                    <div class="flip-hint"><i class="fas fa-sync"></i></div>
                </div>

                <div class="card-face card-back">
                    <div class="back-header">
                        <h3>${isFinished ? '🏁 Clasificación' : '📺 Dónde ver'}</h3>
                        <p>${isFinished ? 'Tiempos Oficiales 2026' : 'Broadcasters Oficiales'}</p>
                    </div>
                    <ul class="tv-list" id="results-list-${race.round}">
                        ${isFinished ? '<li class="tv-item" style="justify-content: center; border:none; margin-top:20px;"><i class="fas fa-spinner fa-spin"></i> Cargando clasificación...</li>' : tvListHTML}
                    </ul>
                </div>
            </div>`;
        
        if(nextActiveRace && race.round === nextActiveRace.round) {
            scene.querySelector('.card-front').classList.add('next-race-highlight');
        }
        
        grid.appendChild(scene);
        // Si la carrera ha terminado, pedimos los resultados a la API
        if (isFinished && !race.results) {
            loadResultsForRace(race.round);
        }
    });
}

// --- 4. LÓGICA DEL COUNTDOWN ---
function initCountdown() {
    const timer = document.getElementById('countdown');
    const name = document.getElementById('next-race-name');

    const update = () => {
        const now = new Date();
        const next = db_races.find(r => {
            const rTime = new Date(`${r.date}T${r.sessions.race.split(' ')[1]}:00`);
            rTime.setHours(rTime.getHours() + 3); 
            return rTime > now;
        });

        if (!next) {
            name.innerText = "Temporada 2026 Finalizada";
            timer.innerText = "00d 00h 00m 00s";
            return;
        }

        const iso = emojiToIso[next.flag];
        name.innerHTML = `<img src="https://flagcdn.com/w80/${iso}.png" class="hero-flag" style="width:60px; height:40px; object-fit:cover; border-radius:4px;"> <span>${next.name}</span>`;

        const target = new Date(`${next.date}T${next.sessions.race.split(' ')[1]}:00`);
        const dist = target - now;

        if (dist < 0) {
            timer.innerText = "¡EN VIVO!";
            timer.style.color = "#44ff44";
            return;
        }

        const d = Math.floor(dist / 86400000).toString().padStart(2, '0');
        const h = Math.floor((dist % 86400000) / 3600000).toString().padStart(2, '0');
        const m = Math.floor((dist % 3600000) / 60000).toString().padStart(2, '0');
        const s = Math.floor((dist % 60000) / 1000).toString().padStart(2, '0');

        timer.innerText = `${d}d ${h}h ${m}m ${s}s`;
    };

    update();
    setInterval(update, 1000);
}

// Función global para los botones de filtro
window.filterRaces = (type) => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (event) event.target.classList.add('active');
    renderRaces(type);
};
