async function loadResultsForRace(round) {
    const race = db_races.find(r => r.round === round);
    if (!race || race.results) return;

    try {
        // Petición a la API (Nota: Ajustado a 2024 para pruebas ya que 2026 no existe aún)
        const year = 2024; 
        const response = await fetch(`https://api.jolpi.ca/ergast/f1/${year}/${round}/results.json`);
        const data = await response.json();
        const raceData = data.MRData.RaceTable.Races[0];

        const container = document.getElementById(`results-list-${round}`);
        if (!container) return;

        if (raceData && raceData.Results && raceData.Results.length > 0) {
            // Guardamos el tiempo del ganador (posición 1) para calcular gaps
            const winnerTimeStr = raceData.Results[0].Time ? raceData.Results[0].Time.time : null;

            race.results = raceData.Results.map((r, index) => {
                let timeDisplay = "";

                if (r.position === "1") {
                    // El ganador muestra su tiempo total
                    timeDisplay = r.Time ? r.Time.time : "Finalizado";
                } else if (r.Time) {
                    // Los demás muestran el GAP (+X.XXXs)
                    timeDisplay = r.Time.time; // La API de Ergast suele dar el gap directamente aquí
                } else {
                    // Si no terminó (Retirado, Accidente, +Vueltas)
                    timeDisplay = r.status;
                }

                return {
                    pos: r.position,
                    driver: r.Driver.code || r.Driver.familyName.substring(0, 3).toUpperCase(),
                    team: r.Constructor.name,
                    time: timeDisplay
                };
            });

            // Renderizado en el HTML
            container.innerHTML = race.results.map(r => `
                <li class="tv-item" style="justify-content: flex-start; gap: 10px;">
                    <span style="font-weight: 700; width: 22px; color: var(--text-dim); text-align: right; flex-shrink: 0;">${r.pos}</span>
                    <span style="font-weight: 700; color: var(--text-light); width: 45px; flex-shrink: 0;">${r.driver}</span>
                    <span style="color: ${getTeamColor(r.team)}; font-weight: 600; font-size: 0.85rem; flex-grow: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${r.team}</span>
                    <span style="font-family: monospace; font-size: 0.85rem; color: var(--text-light); text-align: right; min-width: 80px; flex-shrink: 0;">${r.time}</span>
                </li>
            `).join('');
        } else {
            container.innerHTML = `<li class="tv-item" style="justify-content: center; color: var(--text-dim); border:none; margin-top: 20px;">Resultados no disponibles</li>`;
        }
    } catch (e) {
        console.error(`Error en ronda ${round}:`, e);
        const container = document.getElementById(`results-list-${round}`);
        if (container) container.innerHTML = `<li class="tv-item" style="justify-content: center; color: var(--f1-red); border:none;">Error de conexión</li>`;
    }
}
