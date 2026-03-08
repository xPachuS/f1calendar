/**
 * Lógica principal para F1 Calendario 2026
 * DATOS OFICIALES: FORMULA1.COM + TV INFO + OPENF1 (TIEMPOS Y GAPS)
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

// Formatea milisegundos a formato de carrera (H:MM:SS.mmm)
function formatTime(ms) {
    if (!ms || isNaN(ms)) return "";
    const totalSeconds = ms / 1000;
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    const mls = Math.round((totalSeconds % 1) * 1000).toString().padStart(3, '0');
    
    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${mls}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}.${mls}`;
}

function translateStatus(status) {
    if (!status) return "";
    if (status.includes("Lap")) return status.replace("Laps", "Vts").replace("Lap", "Vt");
    const translations = {
        "Retired": "Retirado", "Collision": "Colisión", "Engine": "Motor",
        "Accident": "Accidente", "Finished": "Finalizado", "Power Unit": "Motor",
        "D.N.F": "DNF", "Spun off": "Trompo"
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
    } catch (e) { console.error("Error al cargar JSON locales:", e); }
}

// --- CONEXIÓN MEJORADA A OPENF1 ---
async function loadResultsForRace(round) {
    const race = db_races.find(r => r.round === round);
    if (!race || race.results) return;

    const container = document.getElementById(`results-list-${round}`);
    const yearToFetch = 2024; // Mantenemos 2024 para pruebas, cambia a 2026 en temporada

    try {
        // 1. Obtener la sesión de carrera correcta
        const sessionsReq = await fetch(`https://api.openf1.org/v1/sessions?year=${yearToFetch}&session_name=Race`);
        const sessionsData = await sessionsReq.json();
        
        // Ordenar por fecha para asegurar que la ronda coincida
        sessionsData.sort((a, b) => new Date(a.date_start) - new Date(b.date_start));
        const targetSession = sessionsData[round - 1];

        if (!targetSession) {
            container.innerHTML = `<li class="tv-item" style="justify-content:center; border:none;">Pendiente de datos</li>`;
            return;
        }

        // 2. Cargar resultados y pilotos
        const [resReq, driReq] = await Promise.all([
            fetch(`https://api.openf1.org/v1/session_result?session_key=${targetSession.session_key}`),
            fetch(`https://api.openf1.org/v1/drivers?session_key=${targetSession.session_key}`)
        ]);

        const results = await resReq.json();
        const drivers = await driReq.json();

        if (results && results.length > 0) {
            results.sort((a, b) => a.position - b.position);
            const winnerTime = results[0].time; // Tiempo base del ganador

            race.results = results.map(r => {
                const dInfo = drivers.find(d => d.driver_number === r.driver_number) || {};
                let timeLabel = "";

                if (r.position === 1 && r.time) {
                    timeLabel = formatTime(r.time);
                } else if (r.time && winnerTime) {
                    const gap = ((r.time - winnerTime) / 1000).toFixed(3);
                    timeLabel = `+${gap}s`;
                } else {
                    timeLabel = translateStatus(r.status);
                }

                return {
                    pos: r.position,
                    driver: dInfo.name_acronym || r.driver_number,
                    team: dInfo.team_name || "F1 Team",
                    time: timeLabel,
                    color: getTeamColor(dInfo.team_name)
                };
            });

            // Inyectar en el HTML
            container.innerHTML = race.results.map(r => `
                <li class="tv-item" style="justify-content: flex-start; gap: 10px;">
                    <span style="font-weight:700; width:20px; color:var(--text-dim); text-align:right;">${r.pos}</span>
                    <span style="font-weight:700; color:var(--text-light); width:40px;">${r.driver}</span>
                    <span style="color:${r.color}; font-weight:600; font-size:0.85rem; flex-grow:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${r.team}</span>
                    <span style="font-family:monospace; font-size:0.85rem; color:var(--text-light); text-align:right;">${r.time}</span>
                </li>
            `).join('');
        }
    } catch (e) {
        console.error("Error en OpenF1:", e);
        container.innerHTML = `<li class="tv-item" style="justify-content:center; color:var(--f1-red); border:none;">Error de red</li>`;
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
                    <ul class="tv-list" id="results-list-${race.round}">${isFinished ? '<li class="tv-item" style="justify-content:center; border:none; margin-top:20px;"><i class="fas fa-spinner fa-spin"></i> Cargando OpenF1...</li>' : tvListHTML}</ul>
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
