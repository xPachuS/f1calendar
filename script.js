/**
 * Lógica principal para F1 Calendario 2026
 * DATOS OFICIALES EXTRAÍDOS DE FORMULA1.COM + TV INFO + API DE RESULTADOS
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

// Función para obtener el color del equipo de forma dinámica
function getTeamColor(teamName) {
    const nameLower = teamName.toLowerCase();
    for (const [key, color] of Object.entries(teamColors)) {
        if (nameLower.includes(key)) return color;
    }
    return "var(--text-dim)";
}

// Función para traducir los estados de la API al español
function translateStatus(status) {
    if (!status) return "";
    
    // Traducción dinámica de vueltas (ej: "+1 Lap" -> "+1 Vuelta")
    if (status.includes("Lap")) {
        return status.replace("Laps", "Vueltas").replace("Lap", "Vuelta");
    }

    // Traducción de abandonos y estados comunes
    const translations = {
        "Retired": "Retirado",
        "Collision": "Colisión",
        "Engine": "Motor",
        "Gearbox": "Caja de cambios",
        "Accident": "Accidente",
        "Spun off": "Salida de pista",
        "Suspension": "Suspensión",
        "Brakes": "Frenos",
        "Hydraulics": "Hidráulica",
        "Electrical": "Eléctrico",
        "Puncture": "Pinchazo",
        "Power Unit": "Unidad de Potencia",
        "Clutch": "Embrague",
        "Transmission": "Transmisión",
        "Disqualified": "Descalificado",
        "Did not qualify": "No clasificado",
        "Finished": "Finalizado"
    };

    return translations[status] || status; // Devuelve la traducción, o el original si no está en la lista
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
        grid.innerHTML = `<div class="error-msg" style="color:white; text-align:center; grid-column:1/-1;">⚠️ Error cargando datos. Asegúrate de ejecutar en un servidor local.</div>`;
    }
}

// --- 2. CONEXIÓN A LA API DE F1 PARA RESULTADOS ---
async function loadResultsForRace(round) {
    const race = db_races.find(r => r.round === round);
    if (!race || race.results) return;

    try {
        // Petición a la API (Jolpi Ergast Fork)
        const response = await fetch(`https://api.jolpi.ca/ergast/f1/2026/${round}/results.json`);
        const data = await response.json();
        const raceData = data.MRData.RaceTable.Races[0];

        const container = document.getElementById(`results-list-${round}`);
        if (!container) return; 

        if (raceData && raceData.Results && raceData.Results.length > 0) {
            race.results = raceData.Results.map(r => ({
                pos: r.position,
                driver: r.Driver.code || r.Driver.familyName.substring(0, 3).toUpperCase(),
                team: r.Constructor.name,
                // Aplicamos la traducción aquí en caso de no tener "r.Time"
                time: r.Time ? r.Time.time : translateStatus(r.status) 
            }));

            container.innerHTML = race.results.map(r => `
                <li class="tv-item" style="justify-content: flex-start; gap: 10px;">
                    <span style="font-weight: 700; width: 20px; color: var(--text-dim); text-align: right; flex-shrink: 0;">${r.pos}</span>
                    <span style="font-weight: 700; color: var(--text-light); width: 40px; flex-shrink: 0;">${r.driver}</span>
                    <span style="color: ${getTeamColor(r.team)}; font-weight: 600; font-size: 0.85rem; flex-grow: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-shadow: 0 0 3px rgba(0,0,0,0.5);">${r.team}</span>
                    <span style="font-family: monospace; font-size: 0.85rem; color: var(--text-light); text-align: right; flex-shrink: 0;">${r.time}</span>
                </li>
            `).join('');
        } else {
            container.innerHTML = `<li class="tv-item" style="justify-content: center; color: var(--text-dim); border:none; margin-top: 20px;">Resultados no disponibles aún</li>`;
        }
    } catch (e) {
        console.error(`Error cargando los resultados de la ronda ${round}:`, e);
        const container = document.getElementById(`results-list-${round}`);
        if (container) {
            container.innerHTML = `<li class="tv-item" style="justify-content: center; color: var(--f1-red); border:none; margin-top: 20px;">Error de conexión</li>`;
        }
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
        return `
        <li class="tv-item">
            <div class="tv-country-wrapper">
                <img src="https://flagcdn.com/w40/${iso}.png" class="tv-flag-img" alt="${tv.country}">
                <span class="tv-country-name">${tv.country}</span>
            </div>
            <span class="tv-broadcaster">${tv.broadcaster}</span>
        </li>
        `;
    }).join('');

    filtered.forEach(race => {
        const scene = document.createElement('div');
        scene.className = 'race-card-scene';

        const isoCode = emojiToIso[race.flag] || 'xx'; 
        const backgroundStyle = `linear-gradient(rgba(20, 20, 30, 0.75), rgba(20, 20, 30, 0.95)), url('${race.bg_image}')`;

        const raceEndTime = new Date(`${race.date}T${race.sessions.race.split(' ')[1]}:00`);
        raceEndTime.setHours(raceEndTime.getHours() + 3);
        const isFinished = raceEndTime < now;

        let badgeHTML = '';
        if (isFinished) {
            badgeHTML = `<div class="date-badge" style="background: rgba(255, 255, 255, 0.05); color: #777;"><i class="fas fa-flag-checkered" style="color: #777;"></i> FINALIZADO</div>`;
        } else {
            const humanDate = new Date(race.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
            badgeHTML = `<div class="date-badge"><i class="far fa-calendar-alt"></i> ${humanDate}</div>`;
        }

        const sessionsHTML = Object.entries(race.sessions).map(([key, value]) => `
            <li class="session-item ${key === 'race' ? 'main-race' : ''}">
                <span>${sessionLabels[key] || key}</span>
                <span>${value}</span>
            </li>
        `).join('');

        let backFaceHTML = '';
        if (isFinished) {
            let resultsContent = '';
            
            if (race.results && race.results.length > 0) {
                resultsContent = race.results.map(r => `
                    <li class="tv-item" style="justify-content: flex-start; gap: 10px;">
                        <span style="font-weight: 700; width: 20px; color: var(--text-dim); text-align: right; flex-shrink: 0;">${r.pos}</span>
                        <span style="font-weight: 700; color: var(--text-light); width: 40px; flex-shrink: 0;">${r.driver}</span>
                        <span style="color: ${getTeamColor(r.team)}; font-weight: 600; font-size: 0.85rem; flex-grow: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-shadow: 0 0 3px rgba(0,0,0,0.5);">${r.team}</span>
                        <span style="font-family: monospace; font-size: 0.85rem; color: var(--text-light); text-align: right; flex-shrink: 0;">${r.time}</span>
                    </li>
                `).join('');
            } else {
                resultsContent = `
                    <li class="tv-item" style="justify-content: center; color: var(--text-dim); border:none; margin-top: 20px;">
                        <i class="fas fa-spinner fa-spin" style="margin-right: 8px;"></i> Obteniendo tiempos oficiales...
                    </li>
                `;
                loadResultsForRace(race.round);
            }

            backFaceHTML = `
                <div class="back-header">
                    <h3>🏁 Clasificación</h3>
                    <p>Podio y Tiempos Oficiales</p>
                </div>
                <ul class="tv-list" id="results-list-${race.round}">
                    ${resultsContent}
                </ul>
            `;
        } else {
            backFaceHTML = `
                <div class="back-header">
                    <h3>📺 Dónde ver</h3>
                    <p>Broadcasters Oficiales</p>
                </div>
                <ul class="tv-list">
                    ${tvListHTML}
                </ul>
            `;
        }

        scene.innerHTML = `
            <div class="race-card-flipper" onclick="this.classList.toggle('is-flipped')">
                <div class="card-face card-front">
                    <div class="card-header" style="background-image: ${backgroundStyle}">
                        <div class="header-top">
                            <span class="round-num">Ronda ${race.round}</span>
                            ${race.is_sprint ? '<span style="background:var(--f1-red); padding:2px 8px; margin-left:3px; border-radius:4px; font-size:0.9em; font-weight:700;">SPRINT</span>' : ''}
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
                    ${backFaceHTML}
                </div>
            </div>
        `;
        
        if(nextActiveRace && race.round === nextActiveRace.round) {
            scene.querySelector('.card-front').classList.add('next-race-highlight');
        }
        
        grid.appendChild(scene);
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
        timer.style.color = "var(--f1-red)";
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
