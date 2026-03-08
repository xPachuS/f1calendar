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

function getTeamColor(teamName) {
    if (!teamName) return "var(--text-dim)";
    const nameLower = teamName.toLowerCase();
    for (const [key, color] of Object.entries(teamColors)) {
        if (nameLower.includes(key)) return color;
    }
    return "var(--text-dim)";
}

function getPosColor(pos) {
    if (pos === "1") return "#FFD700"; 
    if (pos === "2") return "#C0C0C0"; 
    if (pos === "3") return "#CD7F32"; 
    return "var(--text-dim)";           
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
        grid.innerHTML = `<div class="error-msg" style="color:white; text-align:center; grid-column:1/-1;">⚠️ Error cargando datos.</div>`;
    }
}

// --- 2. CONEXIÓN A LA API PARA RESULTADOS DE CARRERA ---
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
            race.results = raceData.Results.map(r => ({
                pos: r.position || "-",
                driver: r.Driver.code || "???",
                team: r.Constructor.name || "Independiente",
                time: r.Time ? r.Time.time : r.status 
            }));

            container.innerHTML = race.results.map(r => `
                <li class="tv-item" style="justify-content: flex-start; gap: 10px;">
                    <span style="font-weight: 800; width: 20px; color: ${getPosColor(r.pos)}; text-align: right;">${r.pos}</span>
                    <span style="font-weight: 700; color: var(--text-light); width: 40px;">${r.driver}</span>
                    <span style="color: ${getTeamColor(r.team)}; font-weight: 600; font-size: 0.85rem; flex-grow: 1;">${r.team}</span>
                    <span style="font-family: monospace; font-size: 0.85rem;">${r.time}</span>
                </li>
            `).join('');
        } else {
            container.innerHTML = `<li class="tv-item" style="justify-content: center; color: var(--text-dim); border:none; margin-top: 20px;">Resultados no disponibles</li>`;
        }
    } catch (e) {
        console.error(e);
    }
}

// --- 3. RENDERIZADO DE TARJETAS ---
function renderRaces(filter) {
    document.getElementById('races-grid').style.display = 'grid';
    document.getElementById('standings-container').style.display = 'none';

    const grid = document.getElementById('races-grid');
    grid.innerHTML = ''; 
    const now = new Date();
    
    let filtered = db_races;
    if (filter === 'upcoming') {
        filtered = db_races.filter(r => new Date(r.date + "T23:59:59") >= now);
    } else if (filter === 'completed') {
        filtered = db_races.filter(r => new Date(r.date + "T23:59:59") < now);
    }

    const tvListHTML = db_tv.map(tv => {
        const iso = emojiToIso[tv.flag] || 'xx'; 
        return `
        <li class="tv-item">
            <div class="tv-country-wrapper">
                <img src="https://flagcdn.com/w40/${iso}.png" class="tv-flag-img">
                <span class="tv-country-name">${tv.country}</span>
            </div>
            <span class="tv-broadcaster">${tv.broadcaster}</span>
        </li>`;
    }).join('');

    filtered.forEach(race => {
        const scene = document.createElement('div');
        scene.className = 'race-card-scene';
        const isoCode = emojiToIso[race.flag] || 'xx'; 
        const isFinished = new Date(race.date + "T23:59:59") < now;

        const sessionsHTML = Object.entries(race.sessions).map(([key, value]) => `
            <li class="session-item ${key === 'race' ? 'main-race' : ''}">
                <span>${sessionLabels[key] || key}</span>
                <span>${value}</span>
            </li>`).join('');

        let backFaceHTML = isFinished ? 
            `<div class="back-header"><h3>🏁 Clasificación</h3></div><ul class="tv-list" id="results-list-${race.round}"><li class="tv-item">Cargando...</li></ul>` :
            `<div class="back-header"><h3>📺 Dónde ver</h3></div><ul class="tv-list">${tvListHTML}</ul>`;

        if (isFinished) loadResultsForRace(race.round);

        scene.innerHTML = `
            <div class="race-card-flipper" onclick="this.classList.toggle('is-flipped')">
                <div class="card-face card-front">
                    <div class="card-header" style="background-image: linear-gradient(rgba(20,20,30,0.7), rgba(20,20,30,0.9)), url('${race.bg_image}')">
                        <span class="round-num">Ronda ${race.round}</span>
                        <img src="https://flagcdn.com/w80/${isoCode}.png" class="flag-img">
                    </div>
                    <div class="card-body">
                        <h3>${race.name}</h3>
                        <span class="circuit-name">${race.circuit}</span>
                        <div class="date-badge">${race.date}</div>
                        <ul class="sessions-list">${sessionsHTML}</ul>
                    </div>
                </div>
                <div class="card-face card-back">${backFaceHTML}</div>
            </div>`;
        grid.appendChild(scene);
    });
}

// --- 4. COUNTDOWN ---
function initCountdown() {
    const timer = document.getElementById('countdown');
    const name = document.getElementById('next-race-name');

    const update = () => {
        const now = new Date();
        const next = db_races.find(r => new Date(r.date + "T23:59:59") > now);

        if (!next) {
            name.innerText = "Temporada Finalizada";
            return;
        }

        const iso = emojiToIso[next.flag];
        name.innerHTML = `<img src="https://flagcdn.com/w80/${iso}.png" class="hero-flag"> <span>${next.name}</span>`;
        
        const diff = new Date(next.date + "T00:00:00") - now;
        if (diff < 0) { timer.innerText = "¡GP EN CURSO!"; return; }

        const d = Math.floor(diff / 86400000).toString().padStart(2, '0');
        const h = Math.floor((diff % 86400000) / 3600000).toString().padStart(2, '0');
        const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
        const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
        timer.innerText = `${d}d ${h}h ${m}m ${s}s`;
    };
    setInterval(update, 1000);
    update();
}

// --- 5. CLASIFICACIONES MUNDIALES (CORREGIDO CONTRA UNDEFINED) ---
async function showStandings(type) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (event) event.target.classList.add('active');
    
    document.getElementById('races-grid').style.display = 'none';
    const container = document.getElementById('standings-container');
    const content = document.getElementById('standings-content');
    container.style.display = 'block';
    content.innerHTML = `<div style="text-align:center; padding:40px;"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>`;

    try {
        const endpoint = type === 'drivers' ? 'driverStandings' : 'constructorStandings';
        const response = await fetch(`https://api.jolpi.ca/ergast/f1/2026/${endpoint}.json`);
        const data = await response.json();
        
        // Verificamos que existan datos, si no, mostramos tabla vacía o con ceros
        const standingsList = data.MRData.StandingsTable.StandingsLists[0];
        const list = standingsList ? (type === 'drivers' ? standingsList.DriverStandings : standingsList.ConstructorStandings) : [];

        let html = `<h3>${type === 'drivers' ? 'Mundial de Pilotos' : 'Escuderías'}</h3>`;
        html += `<table class="standings-table"><thead><tr><th>Pos</th><th>${type === 'drivers' ? 'Piloto' : 'Equipo'}</th>${type === 'drivers' ? '<th>Equipo</th>' : ''}<th>Pts</th></tr></thead><tbody>`;

        if (list.length === 0) {
            html += `<tr><td colspan="4" style="text-align:center; padding:20px;">No hay datos disponibles para 2026 todavía.</td></tr>`;
        } else {
            list.forEach(item => {
                const pos = item.position || "0";
                const pts = item.points || "0";
                if (type === 'drivers') {
                    const name = `${item.Driver.givenName} ${item.Driver.familyName}`;
                    const team = item.Constructors[0]?.name || "N/A";
                    html += `<tr><td>${pos}</td><td>${name}</td><td style="color:${getTeamColor(team)}">${team}</td><td class="points-cell">${pts}</td></tr>`;
                } else {
                    const team = item.Constructor.name || "N/A";
                    html += `<tr><td>${pos}</td><td style="color:${getTeamColor(team)}">${team}</td><td class="points-cell">${pts}</td></tr>`;
                }
            });
        }
        content.innerHTML = html + `</tbody></table>`;
    } catch (e) {
        content.innerHTML = `<p style="text-align:center;">API no disponible. Mostrando valores temporales (0 pts).</p>`;
    }
}

window.filterRaces = (type) => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (event) event.target.classList.add('active');
    renderRaces(type);
};
