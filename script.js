/**
 * Lógica principal para F1 Calendario 2026
 * DATOS OFICIALES EXTRAÍDOS DE FORMULA1.COM + TV INFO
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
    "🇦🇪": "ae"
};

const sessionLabels = {
    "fp1": "Libres 1", "fp2": "Libres 2", "fp3": "Libres 3",
    "sprint_quali": "Clasif. Sprint", "sprint_race": "Carrera Sprint",
    "quali": "Clasificación", "race": "CARRERA"
};

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

// --- 2. RENDERIZADO DE TARJETAS ---
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

    // Preparamos la lista de TV (Generada una sola vez para eficiencia)
    const tvListHTML = db_tv.map(tv => `
        <li class="tv-item">
            <span class="tv-country">${tv.flag} ${tv.country}</span>
            <span class="tv-broadcaster">${tv.broadcaster}</span>
        </li>
    `).join('');

    filtered.forEach(race => {
        // Escena contenedora
        const scene = document.createElement('div');
        scene.className = 'race-card-scene';

        const humanDate = new Date(race.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
        const isoCode = emojiToIso[race.flag] || 'xx'; 
        const backgroundStyle = `linear-gradient(rgba(20, 20, 30, 0.75), rgba(20, 20, 30, 0.95)), url('${race.bg_image}')`;

        const sessionsHTML = Object.entries(race.sessions).map(([key, value]) => `
            <li class="session-item ${key === 'race' ? 'main-race' : ''}">
                <span>${sessionLabels[key] || key}</span>
                <span>${value}</span>
            </li>
        `).join('');

        // HTML INTERNO
        // La parte "card-front" es idéntica a tu diseño original
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
                        <div class="date-badge"><i class="far fa-calendar-alt"></i> ${humanDate}</div>
                        <ul class="sessions-list">${sessionsHTML}</ul>
                    </div>
                    <div class="flip-hint"><i class="fas fa-sync"></i></div>
                </div>

                <div class="card-face card-back">
                    <div class="back-header">
                        <h3>📺 Dónde ver</h3>
                        <p>Broadcasters Oficiales</p>
                    </div>
                    <ul class="tv-list">
                        ${tvListHTML}
                    </ul>
                </div>
            </div>
        `;
        
        if(isImmediateNext(race)) scene.querySelector('.card-front').classList.add('next-race-highlight');
        grid.appendChild(scene);
    });
}

function isImmediateNext(race) {
    const now = new Date();
    const raceDate = new Date(`${race.date}T${race.sessions.race.split(' ')[1]}:00`);
    const diffDays = (raceDate - now) / (1000 * 60 * 60 * 24);
    return diffDays > 0 && diffDays < 14;
}

// --- 3. COUNTDOWN Y FILTROS (Sin cambios) ---
function initCountdown() {
    const timer = document.getElementById('countdown');
    const name = document.getElementById('next-race-name');
    const update = () => {
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

window.filterRaces = (type) => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (event) event.target.classList.add('active');
    renderRaces(type);
};
