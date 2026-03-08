/**
 * Lógica principal para F1 Calendario 2026
 * DATOS OFICIALES: FORMULA1.COM + TV INFO + JOLPI/ERGAST API
 */

document.addEventListener('DOMContentLoaded', () => {
    loadData();
});

let db_races = []; 
let db_tv = []; 

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
    if (!status || status === "Finished") return "";
    if (status.includes("Lap")) return status.replace("Laps", "Vts").replace("Lap", "Vt");
    const translations = {
        "Retired": "Retirado", "Collision": "Colisión", "Engine": "Motor",
        "Accident": "Accidente", "Power Unit": "Motor", "D.N.F": "DNF",
        "Spun off": "Trompo", "Transmission": "Caja"
    };
    return translations[status] || status; 
}

async function loadData() {
    try {
        const [racesRes, tvRes] = await Promise.all([fetch('races.json'), fetch('tv.json')]);
        db_races = await racesRes.json();
        db_tv = await tvRes.json();
        renderRaces('all'); 
        initCountdown();    
    } catch (e) { console.error("Error al cargar JSON:", e); }
}

// --- CONEXIÓN A JOLPI / ERGAST API ---
async function loadResultsForRace(round) {
    const race = db_races.find(r => r.round === round);
    if (!race || race.results) return;

    const container = document.getElementById(`results-list-${round}`);
    const yearToFetch = 2026;

    try {
        const response = await fetch(`https://api.jolpi.ca/ergast/f1/${yearToFetch}/${round}/results.json`);
        const data = await response.json();
        const raceData = data.MRData.RaceTable.Races[0];

        if (raceData && raceData.Results) {
            race.results = raceData.Results.map(r => {
                // Jolpi ya nos da el tiempo formateado o el gap en r.Time.time
                let timeDisplay = "";
                if (r.Time && r.Time.time) {
                    timeDisplay = r.Time.time;
                } else {
                    timeDisplay = translateStatus(r.status);
                }

                return {
                    pos: r.position,
                    driver: r.Driver.code || r.Driver.familyName.substring(0,3).toUpperCase(),
                    team: r.Constructor.name,
                    time: timeDisplay,
                    color: getTeamColor(r.Constructor.name)
                };
            });

            container.innerHTML = race.results.map(r => `
                <li class="tv-item" style="display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 10px; padding: 5px 0;">
                    <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
                        <span style="font-weight:700; width:22px; color:var(--text-dim); text-align:right;">${r.pos}</span>
                        <span style="font-weight:700; color:var(--text-light); width:35px;">${r.driver}</span>
                        <span style="color:${r.color}; font-weight:600; font-size:0.8rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${r.team}</span>
                    </div>
                    <span style="font-family:monospace; font-size:0.85rem; color:var(--text-light); text-align:right; min-width: 80px;">${r.time}</span>
                </li>
            `).join('');
        }
    } catch (e) {
        console.error("Error Jolpi API:", e);
        container.innerHTML = `<li style="text-align:center; list-style:none; padding-top:10px;">Error al cargar datos</li>`;
    }
}

function renderRaces(filter) {
    const grid = document.getElementById('races-grid');
    grid.innerHTML = ''; 
    const now = new Date();
    
    const nextActiveRace = db_races.find(r => {
        const rEnd = new Date(`${r.date}T${r.sessions.race.split(' ')[1]}:00`);
        rEnd.setHours(rEnd.getHours() + 3);
        return rEnd >= now;
    });

    let filtered = db_races;
    if (filter === 'upcoming') filtered = db_races.filter(r => {
        const rEnd = new Date(`${r.date}T${r.sessions.race.split(' ')[1]}:00`);
        rEnd.setHours(rEnd.getHours() + 3);
        return rEnd >= now;
    });
    else if (filter === 'completed') filtered = db_races.filter(r => {
        const rEnd = new Date(`${r.date}T${r.sessions.race.split(' ')[1]}:00`);
        rEnd.setHours(rEnd.getHours() + 3);
        return rEnd < now;
    });

    const tvListHTML = db_tv.map(tv => {
        const iso = emojiToIso[tv.flag] || 'xx'; 
        return `<li class="tv-item">
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
        const rEnd = new Date(`${race.date}T${race.sessions.race.split(' ')[1]}:00`);
        rEnd.setHours(rEnd.getHours() + 3);
        const isFinished = rEnd < now;

        let badgeHTML = isFinished 
            ? `<div class="date-badge" style="background: rgba(255, 255, 255, 0.05); color: #777;"><i class="fas fa-flag-checkered"></i> FINALIZADO</div>`
            : `<div class="date-badge"><i class="far fa-calendar-alt"></i> ${new Date(race.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</div>`;

        const sessionsHTML = Object.entries(race.sessions).map(([key, val]) => `
            <li class="session-item ${key === 'race' ? 'main-race' : ''}">
                <span>${sessionLabels[key] || key}</span><span>${val}</span>
            </li>`).join('');

        scene.innerHTML = `
            <div class="race-card-flipper" onclick="this.classList.toggle('is-flipped')">
                <div class="card-face card-front">
                    <div class="card-header" style="background-image: linear-gradient(rgba(20,20,30,0.75), rgba(20,20,30,0.95)), url('${race.bg_image}')">
                        <div class="header-top"><span class="round-num">Ronda ${race.round}</span>${race.is_sprint ? '<span style="background:var(--f1-red); padding:2px 8px; border-radius:4px; font-size:0.9em; font-weight:700; margin-left:5px;">SPRINT</span>' : ''}</div>
                        <img src="https://flagcdn.com/w80/${isoCode}.png" class="flag-img">
                    </div>
                    <div class="card-body">
                        <h3>${race.name}</h3><span class="circuit-name"><i class="fas fa-road"></i> ${race.circuit}</span>
                        ${badgeHTML}<ul class="sessions-list">${sessionsHTML}</ul>
                    </div>
                </div>
                <div class="card-face card-back">
                    <div class="back-header"><h3>${isFinished ? '🏁 Clasificación' : '📺 Dónde ver'}</h3><p>${isFinished ? 'Tiempos Oficiales' : 'Broadcasters Oficiales'}</p></div>
                    <ul class="tv-list" id="results-list-${race.round}">${isFinished ? '<li style="text-align:center; padding-top:20px; list-style:none;"><i class="fas fa-spinner fa-spin"></i> Cargando...</li>' : tvListHTML}</ul>
                </div>
            </div>`;
        
        if(nextActiveRace && race.round === nextActiveRace.round) scene.querySelector('.card-front').classList.add('next-race-highlight');
        grid.appendChild(scene);
        if (isFinished && !race.results) loadResultsForRace(race.round);
    });
}

function initCountdown() {
    const timer = document.getElementById('countdown');
    const name = document.getElementById('next-race-name');
    setInterval(() => {
        const now = new Date();
        const next = db_races.find(r => {
            const rt = new Date(`${r.date}T${r.sessions.race.split(' ')[1]}:00`);
            rt.setHours(rt.getHours() + 3); return rt > now;
        });
        if (!next) return;
        const iso = emojiToIso[next.flag];
        name.innerHTML = `<img src="https://flagcdn.com/w80/${iso}.png" style="width:50px; border-radius:4px; vertical-align:middle; margin-right:10px;"> <span>${next.name}</span>`;
        const target = new Date(`${next.date}T${next.sessions.race.split(' ')[1]}:00`);
        const dist = target - now;
        if (dist < 0) { timer.innerText = "¡EN VIVO!"; timer.style.color = "#44ff44"; return; }
        const d = Math.floor(dist / 86400000).toString().padStart(2, '0');
        const h = Math.floor((dist % 86400000) / 3600000).toString().padStart(2, '0');
        const m = Math.floor((dist % 3600000) / 60000).toString().padStart(2, '0');
        const s = Math.floor((dist % 60000) / 1000).toString().padStart(2, '0');
        timer.innerText = `${d}d ${h}h ${m}m ${s}s`;
    }, 1000);
}

window.filterRaces = (type) => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (event) event.target.classList.add('active');
    renderRaces(type);
};
