const schedule = {
    "Mainstage": [
    { name: "JEV", start: "12:15", end: "13:05" },
    { name: "MYKRIS", start: "13:05", end: "14:10" },
    { name: "ODD MOB", start: "14:10", end: "15:15" },
    { name: "SONNY FODERA", start: "15:15", end: "16:20" },
    { name: "STEVE AOKI", start: "16:20", end: "17:25" },
    { name: "SPECIAL GUEST", start: "17:25", end: "18:30" },
    { name: "GRYFFIN", start: "18:30", end: "19:35" },
    { name: "ZEDD", start: "19:35", end: "20:45" },
    { name: "MARTIN GARRIX", start: "20:45", end: "00:00" }
],
"Worldwide": [
    { name: "JULIAN CROSS", start: "12:00", end: "13:00" },
    { name: "SOTA", start: "13:00", end: "14:00" },
    { name: "FLUX PAVILION B2B DOCTOR P", start: "14:00", end: "15:15" },
    { name: "ALLEYCVT B2B JESSICA AUDIFFRED", start: "15:15", end: "16:30" },
    { name: "ANDY C", start: "16:30", end: "17:30" },
    { name: "DIMENSION", start: "17:30", end: "18:30" },
    { name: "PEEKABOO", start: "18:30", end: "19:30" },
    { name: "NIGHTMRE B2B SULLIVAN KING", start: "19:30", end: "20:45" },
    { name: "DEADMAU5", start: "20:45", end: "00:00" }
],
"Megastructure": [
    { name: "RAFAEL CERATO", start: "12:00", end: "15:00" },
    { name: "CHLOE CAILLET", start: "15:00", end: "16:30" },
    { name: "MAU P", start: "16:30", end: "18:00" },
    { name: "FOUR TET", start: "18:00", end: "19:30" },
    { name: "SOLOMUN", start: "19:30", end: "23:59" },
],
"Cove": [
    { name: "NUSHA", start: "12:00", end: "13:00" },
    { name: "JULIET FOX", start: "13:00", end: "14:30" },
    { name: "CHARLIE SPARKS", start: "14:30", end: "16:00" },
    { name: "POPOF X SPACE 92", start: "16:00", end: "17:30" },
    { name: "999999999", start: "17:30", end: "19:00" },
    { name: "I HATE MODELS", start: "19:00", end: "20:30" },
    { name: "NICO MORENO", start: "20:30", end: "23:59" },
],
"Live Stage": [
    { name: "AFROBETA", start: "16:00", end: "16:50" },
    { name: "INFECTED MUSHROOM", start: "16:50", end: "18:10" },
    { name: "SAID THE SKY", start: "18:10", end: "19:30" },
    { name: "LSZEE", start: "19:30", end: "21:00" },
    { name: "ABOVE & BEYOND", start: "21:00", end: "23:59" },
],
};

// Store countdown intervals for cleanup
const countdownIntervals = {};

function updateTime() {
    const now = new Date();
    const options = { 
        timeZone: 'America/New_York',
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
    };
    const timeElement = document.getElementById('current-time');
    if (timeElement) {
        timeElement.textContent = 
            `EST ${now.toLocaleTimeString('en-US', options)} · ${now.toLocaleDateString('en-US', { 
                timeZone: 'America/New_York',
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
            })}`;
    }
}

function transferHighlight(stageName, currentArtistEl, nextArtistEl) {
    // Clear existing countdown for current artist
    if (countdownIntervals[currentArtistEl.id]) {
        clearInterval(countdownIntervals[currentArtistEl.id]);
        delete countdownIntervals[currentArtistEl.id];
    }

    // Add transfer animation to stage
    const stageEl = currentArtistEl.closest('.stage');
    stageEl.classList.add('stage-change');
    setTimeout(() => stageEl.classList.remove('stage-change'), 1000);
    
    // Add transfer animation to artists
    currentArtistEl.classList.add('highlight-transfer');
    nextArtistEl.classList.add('highlight-transfer');
    
    // Remove animations after they complete
    setTimeout(() => {
        currentArtistEl.classList.remove('highlight-transfer');
        nextArtistEl.classList.remove('highlight-transfer');
    }, 800);
    
    // Update classes
    currentArtistEl.classList.remove('current-artist');
    currentArtistEl.querySelector('.countdown')?.remove();
    
    nextArtistEl.classList.add('current-artist');
    
    // Create and start countdown for new current artist
    const endTime = nextArtistEl.querySelector('.artist-time').textContent.split(' - ')[1];
    const countdownEl = document.createElement('div');
    countdownEl.className = 'countdown';
    nextArtistEl.appendChild(countdownEl);
    startCountdown(nextArtistEl, endTime);
}

function checkForSetChanges() {
    const now = new Date();
    const estTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const currentHours = estTime.getHours();
    const currentMinutes = estTime.getMinutes();
    const currentTime = currentHours * 60 + currentMinutes;
    
    document.querySelectorAll('.stage').forEach(stageEl => {
        const stageName = stageEl.querySelector('.stage-name').textContent;
        const artists = schedule[stageName];
        const artistEls = stageEl.querySelectorAll('.artist');
        
        artists.forEach((artist, index) => {
            const [startH, startM] = artist.start.split(':').map(Number);
            const [endH, endM] = artist.end.split(':').map(Number);
            const startTime = startH * 60 + startM;
            const endTime = endH * 60 + endM;
            
            const artistEl = artistEls[index];
            const isCurrent = currentTime >= startTime && currentTime < endTime;
            
            // Check if this artist just became current
            if (isCurrent && !artistEl.classList.contains('current-artist')) {
                const currentArtistEl = stageEl.querySelector('.current-artist');
                if (currentArtistEl) {
                    transferHighlight(stageName, currentArtistEl, artistEl);
                } else {
                    // First artist of the day
                    artistEl.classList.add('current-artist');
                    const countdownEl = document.createElement('div');
                    countdownEl.className = 'countdown';
                    artistEl.appendChild(countdownEl);
                    startCountdown(artistEl, artist.end);
                }
            }
        });
    });
}

function startCountdown(artistEl, endTime) {
    // Clear any existing interval for this artist
    if (countdownIntervals[artistEl.id]) {
        clearInterval(countdownIntervals[artistEl.id]);
        delete countdownIntervals[artistEl.id];
    }

    function update() {
        const now = new Date();
        const estNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
        const [endH, endM] = endTime.split(':').map(Number);
        const endDate = new Date(estNow);
        endDate.setHours(endH, endM, 0, 0);

        if (endDate < estNow) {
            endDate.setDate(endDate.getDate() + 1);
        }

        const diff = endDate - estNow;
        
        if (diff <= 0) {
            const countdownEl = artistEl.querySelector('.countdown');
            if (countdownEl) {
                countdownEl.textContent = "ENDING";
            }
            checkForSetChanges(); // Trigger highlight transfer
            return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        const countdownEl = artistEl.querySelector('.countdown');
        if (countdownEl) {
            countdownEl.textContent = 
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    update();
    countdownIntervals[artistEl.id] = setInterval(update, 1000);
}

// Initialize with faster check interval
document.addEventListener('DOMContentLoaded', () => {
    updateTime();
    renderSchedule();
    setInterval(updateTime, 1000);
    setInterval(checkForSetChanges, 1000);
});
function renderSchedule() {
    const now = new Date();
    const estTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const currentHours = estTime.getHours();
    const currentMinutes = estTime.getMinutes();
    const currentTime = currentHours * 60 + currentMinutes;
    
    const container = document.getElementById('stages-container');
    if (!container) {
        console.error("Could not find stages container element");
        return;
    }
    
    // Clear existing countdown intervals
    Object.values(countdownIntervals).forEach(interval => clearInterval(interval));
    container.innerHTML = '';
    
    for (const [stageName, artists] of Object.entries(schedule)) {
        const stageEl = document.createElement('div');
        stageEl.className = 'stage';
        
        const stageHeader = document.createElement('div');
        stageHeader.className = 'stage-header';
        
        const stageNameEl = document.createElement('h2');
        stageNameEl.className = 'stage-name';
        stageNameEl.textContent = stageName;
        stageHeader.appendChild(stageNameEl);
        
        stageEl.appendChild(stageHeader);
        
        const artistList = document.createElement('ul');
        artistList.className = 'artist-list';
        
        artists.forEach((artist, index) => {
            const [startH, startM] = artist.start.split(':').map(Number);
            const [endH, endM] = artist.end.split(':').map(Number);
            const startTime = startH * 60 + startM;
            const endTime = endH * 60 + endM;
            
            const isCurrent = currentTime >= startTime && currentTime < endTime;
            const isNext = index > 0 ? (currentTime >= artists[index-1].end.split(':').map(Number).reduce((h, m) => h * 60 + m) && 
                                      currentTime < startTime) : currentTime < startTime;
            
            const artistEl = document.createElement('li');
            artistEl.className = `artist ${isCurrent ? 'current-artist' : ''}`;
            artistEl.id = `${stageName.replace(/\s+/g, '-')}-${artist.name.replace(/\s+/g, '-')}`;
            
            const artistInfo = document.createElement('div');
            artistInfo.className = 'artist-info';
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'artist-name';
            nameSpan.textContent = artist.name;
            
            const timeSpan = document.createElement('span');
            timeSpan.className = 'artist-time';
            timeSpan.textContent = `${artist.start} - ${artist.end}`;
            
            artistInfo.appendChild(nameSpan);
            artistInfo.appendChild(timeSpan);
            
            artistEl.appendChild(artistInfo);
            
            // Add countdown for current and next artists
            if (isCurrent) {
                const countdownEl = document.createElement('div');
                countdownEl.className = 'countdown';
                artistEl.appendChild(countdownEl);
                startCountdown(artistEl, artist.end);
            } else if (isNext) {
                const countdownEl = document.createElement('div');
                countdownEl.className = 'countdown';
                artistEl.appendChild(countdownEl);
                startCountdown(artistEl, artist.start);
            }
            
            artistList.appendChild(artistEl);
        });
        
        stageEl.appendChild(artistList);
        container.appendChild(stageEl);
    }
}

// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    updateTime();
    renderSchedule();
    setInterval(updateTime, 1000);
    // No need for separate renderSchedule interval - countdowns update themselves
});