function initCountdown() {
    const today = new Date();
    
    // Convertimos la fecha actual a formato comparable (ignorando horas para filtro inicial)
    // Pero para el countdown real necesitamos precisión
    
    // Buscar la próxima carrera (aquella cuya fecha de carrera + hora fin no haya pasado)
    const upcomingRaces = db_races.filter(r => {
        // Construimos fecha completa de la carrera
        const timeString = r.sessions.race.split(' ')[1]; // "06:00"
        const raceDateObj = new Date(`${r.date}T${timeString}:00`);
        // Le damos 2 horas de margen para que no desaparezca mientras corren
        raceDateObj.setHours(raceDateObj.getHours() + 2);
        
        return raceDateObj >= today;
    });
    
    if (upcomingRaces.length === 0) {
        nextRaceNameEl.innerText = "Temporada 2026 Finalizada";
        countdownEl.innerText = "00d 00h 00m 00s";
        return;
    }

    const nextRace = upcomingRaces[0];
    nextRaceNameEl.innerHTML = `<span class="flag-lg">${nextRace.flag}</span> ${nextRace.name}`;
    
    // Obtener fecha exacta
    const timeString = nextRace.sessions.race.split(' ')[1]; 
    const targetDate = new Date(`${nextRace.date}T${timeString}:00`);

    const interval = setInterval(() => {
        const now = new Date().getTime();
        const distance = targetDate.getTime() - now;

        if (distance < 0) {
            // Si la carrera empezó hace poco (menos de 2 horas), mostramos mensaje
            if (distance > -7200000) { 
                countdownEl.innerText = "¡EN PISTA!";
                countdownEl.style.color = "#00ff00"; // Verde brillante
            } else {
                clearInterval(interval);
                location.reload(); // Recargar para buscar la siguiente
            }
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        // Formato con ceros
        const d = days < 10 ? "0"+days : days;
        const h = hours < 10 ? "0"+hours : hours;
        const m = minutes < 10 ? "0"+minutes : minutes;
        const s = seconds < 10 ? "0"+seconds : seconds;

        countdownEl.innerText = `${d}d ${h}h ${m}m ${s}s`;
    }, 1000);
}