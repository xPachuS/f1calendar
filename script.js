/**
 * Lógica principal para F1 Calendario 2026
 * DATOS OFICIALES EXTRAÍDOS DE FORMULA1.COM + TV INFO + API DE OPENF1
 */

document.addEventListener('DOMContentLoaded', () => {
    loadData();
});

let db_races = []; 
let db_tv = []; 

// DICCIONARIO: TRADUCTOR DE EMOJI A CÓDIGO ISO
const emojiToIso = {
    "🇦🇺": "au", "🇨🇳": "cn", "🇯🇵": "jp", "🇧🇭": "bh", "🇸🇦": "sa",
    "🇺🇸": "us", "🇨🇦": "ca", "🇲🇨": "mc", "🇪🇸": "es", "🇦🇹": "at",
    "🇬🇧": "gb", "🇧🇪": "be", "🇭🇺": "hu", "🇳🇱": "nl", "🇮🇹": "it",
    "🇦🇿": "az", "🇸🇬": "sg", "🇲🇽": "mx", "🇧🇷": "br", "🇶🇦": "qa",
    "🇦🇪": "ae", "🇫🇷": "fr", "🇩🇪": "de", "🇦🇷": "ar", "🇫🇮": "fi"
};

const sessionLabels = {
    "fp1": "Libres 1", "fp2": "Libres 2", "fp3": "Libres 3",
    "sprint_quali": "Clasif. Sprint", "sprint_race": "Carrera Sprint",
    "quali": "Clasificación", "race": "CARRERA"
};

// DICCIONARIO: COLORES OFICIALES
const teamColors = {
    "red bull": "#3671C6", "ferrari": "#E8002D", "mercedes": "#00D2BE",
    "mclaren": "#FF8000", "aston martin": "#229971", "alpine": "#0090FF",
    "williams": "#005AFF", "rb": "#6692FF", "sauber": "#52E252", "haas": "#FFFFFF"
};

function getTeamColor(teamName) {
    if(!teamName) return "var(--text-dim)";
    const nameLower = teamName.toLowerCase();
    for (const [key, color] of Object.entries(teamColors)) {
        if (nameLower.includes(key)) return color;
    }
    return "var(--text-dim)";
}

function translateStatus(status) {
    if (!status) return "";
    if (status.includes("Lap")) return status.replace("Laps", "Vueltas").replace("Lap", "Vuelta");
    const translations = {
        "Retired": "Retirado", "Collision": "Colisión", "Engine": "Motor",
        "Gearbox": "Caja", "Accident": "Accidente", "Spun off": "Salida pista",
        "Suspension": "Suspensión", "Brakes": "Frenos", "Hydraulics": "Hidráulica",
        "Electrical": "Eléctrico", "Puncture": "Pinchazo", "Power Unit": "Motor",
        "Finished": "Finalizado"
    };
    return translations[status] || status; 
}

// --- 1. CARGA DE DATOS ---
async function loadData() {
    try {
        const [racesRes, tvRes] = await Promise.all([fetch('races.json'), fetch('tv.json')]);
        db_races = await racesRes.json();
        db_tv = await tvRes.json();
        renderRaces('all'); 
        initCountdown();    
    } catch (error) {
        console.error("Error:", error);
    }
}

// --- 2. CONEXIÓN A OPENF1 API ---
async function loadResultsForRace(round) {
    const race = db_races.find(r => r.round === round);
    if (!race || race.results) return;

    try {
        const yearToFetch = 2024; // Cambiar a 2026 en temporada
        const container = document.getElementById(`results-list-${round}`);
        
        const sessionsReq = await fetch(`https://api.openf1.org/v1/sessions?year=${yearToFetch}&session_name=Race`);
        const sessionsData = await sessionsReq.json();
        sessionsData.sort((a, b) => new Date(a.date_start) - new Date(b.date_start));
        
        const targetSession = sessionsData[round - 1]; 
        if (!targetSession) return;

        const sessionKey = targetSession.session_key;

        const [resultReq, driversReq] = await Promise.all([
            fetch(`https://api.openf1.org/v1/session_result?session_key=${sessionKey}`),
            fetch(`https://api.openf1.org/v1/drivers?session_key=${sessionKey}`)
        ]);

        const resultData = await resultReq.json();
        const driversData = await driversReq.json();

        if (resultData && resultData.length > 0) {
            race.results = resultData.map(r => {
                const driverInfo = driversData.find(d => d.driver_number === r.driver_number) || {};
                
                // Lógica de tiempo: Si es P1 muestra tiempo total, si no, el intervalo
                let displayTime = "";
                if (r.position === 1 && r.time) {
                    // Convertir segundos de la API a formato H:MM:SS
                    const date = new Date(null);
                    date.setSeconds(r.time);
                    displayTime = date.toISOString().substr(11, 8);
                } else if (r.time) {
                    displayTime = `+${r.time.toFixed(3)}s`;
                } else {
                    displayTime = translateStatus(r.status);
                }

                return {
                    pos: r.position,
                    driver: driverInfo.name_acronym || "---",
                    team: driverInfo.team_name || "---",
                    time: displayTime
                };
            }).sort((a, b) => a.pos - b.pos);

            container.innerHTML = race.results.map(r => `
                <li class="tv-item" style="justify-content: flex-start; gap: 10px;">
                    <span style="font-weight: 700; width: 20px; color: var(--text-dim); text-align: right;">${r.pos}</span>
                    <span style="font-weight: 700; color: var(--text-light); width: 40px;">${r.driver}</span>
                    <span style="color: ${getTeamColor(r.team)}; font-weight: 600; font-size: 0.85rem; flex-grow: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${r.team}</span>
                    <span style="font-family: monospace; font-size: 0.85rem; color: var(--text-light);">${r.time}</span>
                </li>
            `).join('');
        }
    } catch (e) {
        console.error(e);
    }
}

// --- 3. RENDERIZADO ---
function renderRaces(filter) {
    const grid = document.getElementById('races-grid');
    grid.innerHTML = ''; 
    const now = new Date();
    
    // Lógica de filtrado
    let filtered = db_races;
    if (filter === 'upcoming') {
        filtered = db_races.filter(r => {
            const end = new Date(`${r.date}T${r.sessions.race.split(' ')[1]}:00`);
            end.setHours(end.getHours() + 3);
            return end >= now;
        });
    } else if (filter === 'completed') {
        filtered = db_races.filter(r => {
            const end = new Date(`${r.date}T${r.sessions.race.split(' ')[1]}:00`);
            end.setHours(end.getHours() + 3);
            return end < now;
        });
    }

    filtered.forEach(race => {
        const scene = document.createElement('div');
        scene.className = 'race-card-scene';
        const isoCode = emojiToIso[race.flag] || 'xx'; 
        const end = new Date(`${race.date}T${race.sessions.race.split(' ')[1]}:00`);
        end.setHours(end.getHours() + 3);
        const isFinished = end < now;

        scene.innerHTML = `
            <div class="race-card-flipper" onclick="this.classList.toggle('is-flipped')">
                <div class="card-face card-front">
                    <div class="card-header" style="background-image: linear-gradient(rgba(20,20,30,0.7), rgba(20,20,30,0.9)), url('${race.bg_image}')">
                        <span class="round-num">Ronda ${race.round}</span>
                        <img src="https://flagcdn.com/w80/${isoCode}.png" class="flag-img">
                    </div>
                    <div class="card-body">
                        <h3>${race.name}</h3>
                        <p><i class="fas fa-road"></i> ${race.circuit}</p>
                        <div class="date-badge">${isFinished ? 'FINALIZADO' : race.date}</div>
                    </div>
                </div>
                <div class="card-face card-back">
                    <div class="back-header"><h3>🏁 Resultados</h3></div>
                    <ul class="tv-list" id="results-list-${race.round}">
                        <li class="tv-item" style="justify-content:center;"><i class="fas fa-spinner fa-spin"></i></li>
                    </ul>
                </div>
            </div>`;
        
        grid.appendChild(scene);
        if (isFinished) loadResultsForRace(race.round);
    });
}

function initCountdown() {
    const timer = document.getElementById('countdown');
    const update = () => {
        const now = new Date();
        const next = db_races.find(r => new Date(`${r.date}T${r.sessions.race.split(' ')[1]}:00`) > now);
        if (!next) return;
        const dist = new Date(`${next.date}T${next.sessions.race.split(' ')[1]}:00`) - now;
        const d = Math.floor(dist / 86400000).toString().padStart(2, '0');
        const h = Math.floor((dist % 86400000) / 3600000).toString().padStart(2, '0');
        const m = Math.floor((dist % 3600000) / 60000).toString().padStart(2, '0');
        const s = Math.floor((dist % 60000) / 1000).toString().padStart(2, '0');
        timer.innerText = `${d}d ${h}h ${m}m ${s}s`;
    };
    setInterval(update, 1000);
    update();
}

window.filterRaces = (type) => renderRaces(type);
