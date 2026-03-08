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
    "audi": "#F20000",       // Audi
    "sauber": "#52E252",     // Mantenemos de respaldo
    "haas": "#FFFFFF",      
    "cadillac": "#FFB81C"    // Cadillac
};

// DICCIONARIO: LOGOS DE LAS ESCUDERÍAS (URLs directas SVG)
const teamLogos = {
    "red bull": "https://static.wikia.nocookie.net/logopedia/images/5/54/Red_Bull_Racing_2005.svg",
    "ferrari": "https://upload.wikimedia.org/wikipedia/en/c/c0/Scuderia_Ferrari_Logo.svg",
    "mercedes": "https://upload.wikimedia.org/wikipedia/commons/9/90/Mercedes-Logo.svg",
    "mclaren": "https://upload.wikimedia.org/wikipedia/en/6/66/McLaren_Racing_logo.svg",
    "aston martin": "https://upload.wikimedia.org/wikipedia/commons/b/b6/Aston_Martin_Aramco_Cognizant_F1_Team_Logo.svg",
    "alpine": "https://upload.wikimedia.org/wikipedia/commons/7/7e/Alpine_F1_Team_Logo.svg",
    "williams": "https://upload.wikimedia.org/wikipedia/commons/f/f8/Williams_Racing_2024_logo.svg",
    "rb": "https://upload.wikimedia.org/wikipedia/en/a/ae/Visa_Cash_App_RB_F1_Team_logo.svg",
    "audi": "https://upload.wikimedia.org/wikipedia/commons/9/9f/Audi_logo.svg",
    "sauber": "https://upload.wikimedia.org/wikipedia/commons/0/07/Kick_Sauber_logo.svg",
    "haas": "https://upload.wikimedia.org/wikipedia/commons/e/e0/Haas_F1_Team_logo.svg",
    "cadillac": "https://upload.wikimedia.org/wikipedia/commons/3/30/Cadillac_logo.svg"
};

// Función para obtener el color del equipo de forma dinámica
function getTeamColor(teamName) {
    const nameLower = teamName.toLowerCase();
    for (const [key, color] of Object.entries(teamColors)) {
        if (nameLower.includes(key)) return color;
    }
    return "var(--text-dim)";
}

// Función para obtener el logo del equipo
function getTeamLogo(teamName) {
    const nameLower = teamName.toLowerCase();
    for (const [key, url] of Object.entries(teamLogos)) {
        if (nameLower.includes(key)) return url;
    }
    return ""; // Devuelve vacío si no encuentra el equipo
}

// Función auxiliar para obtener el color de la posición (Podio)
function getPosColor(pos) {
    if (pos === "1" || pos === 1) return "#FFD700"; 
    if (pos === "2" || pos === 2) return "#C0C0C0"; 
    if (pos === "3" || pos === 3) return "#CD7F32"; 
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
        grid.innerHTML = `<div class="error-msg" style="color:white; text-align:center; grid-column:1/-1;">⚠️ Error cargando datos. Asegúrate de ejecutar en un servidor local.</div>`;
    }
}

// --- 2. CONEXIÓN A LA API DE F1 PARA RESULTADOS ---
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
                pos: r.position,
                driver: r.Driver.code || r.Driver.familyName.substring(0, 3).toUpperCase(),
                team: r.Constructor.name,
                time: r.Time ? r.Time.time : r.status 
            }));

            container.innerHTML = race.results.map(r => `
                <li class="tv-item" style="justify-content: flex-start; gap: 10px;">
                    <span style="font-weight: 800; width: 20px; color: ${getPosColor(r.pos)}; text-align: right; flex-shrink: 0;">${r.pos}</span>
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
    }
}

// --- 3. RENDERIZADO DE TARJETAS ---
function renderRaces(filter) {
    document.getElementById('races-grid').style.display = 'grid';
    document.getElementById('standings-container').style.display = 'none';

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
                        <span style="font-weight: 800; width: 20px; color: ${getPosColor(r.pos)}; text-align: right; flex-shrink: 0;">${r.pos}</span>
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

// --- 5. LÓGICA DE CLASIFICACIONES (MUNDIAL) ---
async function showStandings(type) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (event) event.target.classList.add('active');
    
    const raceGrid = document.getElementById('races-grid');
    const standingsContainer = document.getElementById('standings-container');
    const standingsContent = document.getElementById('standings-content');
    
    raceGrid.style.display = 'none';
    standingsContainer.style.display = 'block';
    standingsContent.innerHTML = `<div style="text-align:center; padding:40px;"><i class="fas fa-spinner fa-spin"></i> Cargando clasificación oficial 2026...</div>`;

    try {
        const endpoint = type === 'drivers' ? 'driverStandings' : 'constructorStandings';
        const response = await fetch(`https://api.jolpi.ca/ergast/f1/2026/${endpoint}.json`);
        const data = await response.json();
        
        const list = type === 'drivers' 
            ? data.MRData.StandingsTable.StandingsLists[0].DriverStandings 
            : data.MRData.StandingsTable.StandingsLists[0].ConstructorStandings;

        let html = `<h3>${type === 'drivers' ? 'Mundial de Pilotos' : 'Campeonato de Escuderías'}</h3>`;
        html += `<table class="standings-table">
            <thead>
                <tr>
                    <th>Pos</th>
                    <th>${type === 'drivers' ? 'Piloto' : 'Escudería'}</th>
                    ${type === 'drivers' ? '<th>Equipo</th>' : ''}
                    <th style="text-align:right">Pts</th>
                </tr>
            </thead>
            <tbody>`;

        list.forEach((item, index) => {
            const posicionReal = index + 1; 

            if (type === 'drivers') {
                const teamName = item.Constructors[0].name;
                
                // NO se inserta logo aquí
                html += `
                <tr>
                    <td class="pos-cell">${posicionReal}</td>
                    <td style="font-weight:700">${item.Driver.givenName} ${item.Driver.familyName}</td>
                    <td style="color:${getTeamColor(teamName)}">
                        ${teamName}
                    </td>
                    <td class="points-cell">${item.points}</td>
                </tr>`;
            } else {
                const teamName = item.Constructor.name;
                const logoUrl = getTeamLogo(teamName);
                // SÍ se inserta logo aquí
                const logoHtml = logoUrl ? `<img src="${logoUrl}" class="team-logo" alt="Logo">` : '';

                html += `
                <tr>
                    <td class="pos-cell">${posicionReal}</td>
                    <td style="font-weight:700; color:${getTeamColor(teamName)}">
                        ${logoHtml}
                        ${teamName}
                    </td>
                    <td class="points-cell">${item.points}</td>
                </tr>`;
            }
        });

        html += `</tbody></table>`;
        standingsContent.innerHTML = html;

    } catch (error) {
        console.error("Error cargando standings:", error);
        standingsContent.innerHTML = `<p style="color:red; text-align:center;">Error al conectar con la API de resultados.</p>`;
    }
}

// Función global para los botones de filtro
window.filterRaces = (type) => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (event) event.target.classList.add('active');
    renderRaces(type);
};


