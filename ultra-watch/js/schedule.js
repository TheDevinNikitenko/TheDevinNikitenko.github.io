import { schedule } from './stage_schedule.js';

// =========================
// GLOBAL STATE
// =========================
let activeDayKey = null;
let fallbackCountdownInterval = null;
const countdownIntervals = {};

// =========================
// DATE HELPERS
// =========================
function getESTDateString(date = new Date()) {
    return new Date(date.toLocaleString("en-US", { timeZone: "America/New_York" }))
        .toISOString()
        .split("T")[0];
}

function getFirstScheduleDay() {
    return Object.keys(schedule).sort()[0];
}

function setActiveDay() {
    const todayEST = getESTDateString();

    if (schedule[todayEST]) {
        activeDayKey = todayEST;
    } else {
        activeDayKey = getFirstScheduleDay();
        startFallbackCountdown();
    }
}

// =========================
// CLOCK (TOP BAR)
// =========================
function updateTime() {
    const now = new Date();
    const est = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));

    const timeStr = est.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    const dateStr = est.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });

    const el = document.getElementById('current-time');
    if (el) {
        el.textContent = `EST ${timeStr} · ${dateStr}`;
    }
}

// =========================
// FALLBACK COUNTDOWN (BEFORE FESTIVAL)
// =========================
function startFallbackCountdown() {
    const el = document.getElementById("current-time");
    if (!el) return;

    if (fallbackCountdownInterval) {
        clearInterval(fallbackCountdownInterval);
    }

    fallbackCountdownInterval = setInterval(() => {
        const now = new Date();
        const estNow = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));

        const start = new Date(activeDayKey + "T16:00:00");
        const diff = start - estNow;

        if (diff <= 0) {
            clearInterval(fallbackCountdownInterval);
            setActiveDay();
            renderSchedule();
            return;
        }

        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);

        el.textContent = `Festival starts in ${h}h ${m}m ${s}s`;
    }, 1000);
}

// =========================
// COUNTDOWN TIMER
// =========================
function startCountdown(artistEl, endTime) {
    if (countdownIntervals[artistEl.id]) {
        clearInterval(countdownIntervals[artistEl.id]);
    }

    function update() {
        const now = new Date();
        const estNow = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));

        const [h, m] = endTime.split(":").map(Number);
        const end = new Date(estNow);
        end.setHours(h, m, 0, 0);

        if (end < estNow) end.setDate(end.getDate() + 1);

        const diff = end - estNow;

        const el = artistEl.querySelector(".countdown");

        if (diff <= 0) {
            if (el) el.textContent = "ENDING";
            checkForSetChanges();
            return;
        }

        const hh = Math.floor(diff / 3600000);
        const mm = Math.floor((diff % 3600000) / 60000);
        const ss = Math.floor((diff % 60000) / 1000);

        if (el) {
            el.textContent = `${hh.toString().padStart(2,'0')}:${mm.toString().padStart(2,'0')}:${ss.toString().padStart(2,'0')}`;
        }
    }

    update();
    countdownIntervals[artistEl.id] = setInterval(update, 1000);
}

// =========================
// SET CHANGE DETECTION
// =========================
function checkForSetChanges() {
    const now = new Date();
    const est = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const currentTime = est.getHours() * 60 + est.getMinutes();

    const daySchedule = schedule[activeDayKey];

    document.querySelectorAll('.stage').forEach(stageEl => {
        const stageName = stageEl.querySelector('.stage-name').textContent;
        const artists = daySchedule[stageName];
        const artistEls = stageEl.querySelectorAll('.artist');

        artists.forEach((artist, i) => {
            const [sh, sm] = artist.start.split(":").map(Number);
            const [eh, em] = artist.end.split(":").map(Number);

            const start = sh * 60 + sm;
            const end = eh * 60 + em;

            const el = artistEls[i];

            if (currentTime >= start && currentTime < end) {
                if (!el.classList.contains("current-artist")) {
                    const prev = stageEl.querySelector(".current-artist");

                    if (prev) {
                        prev.classList.remove("current-artist");
                        prev.querySelector(".countdown")?.remove();
                    }

                    el.classList.add("current-artist");

                    const c = document.createElement("div");
                    c.className = "countdown";
                    el.appendChild(c);

                    startCountdown(el, artist.end);
                }
            }
        });
    });
}

// =========================
// RENDER
// =========================
function renderSchedule() {
    const container = document.getElementById("stages-container");
    if (!container) return;

    Object.values(countdownIntervals).forEach(clearInterval);
    container.innerHTML = "";

    const daySchedule = schedule[activeDayKey];

    // ✅ FIX: proper label targeting (getElementsByClassName returns HTMLCollection)
    const label = document.querySelector(".stage-tracker-title");
    if (label) {
        const dateObj = new Date(activeDayKey + "T00:00:00");
        const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });
        label.innerHTML = `ULTRA 2026 • ${dayName} SCHEDULE`;
    }

    const now = new Date();
    const est = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const currentTime = est.getHours() * 60 + est.getMinutes();

    for (const [stageName, artists] of Object.entries(daySchedule)) {
        const stageEl = document.createElement("div");
        stageEl.className = "stage";

        // ✅ RESTORED: stage-header wrapper
        const stageHeader = document.createElement("div");
        stageHeader.className = "stage-header";

        const header = document.createElement("h2");
        header.className = "stage-name";
        header.textContent = stageName;

        stageHeader.appendChild(header);
        stageEl.appendChild(stageHeader);

        // ✅ RESTORED: artist-list class
        const list = document.createElement("ul");
        list.className = "artist-list";

        artists.forEach((artist, i) => {
            const [sh, sm] = artist.start.split(":").map(Number);
            const [eh, em] = artist.end.split(":").map(Number);

            const start = sh * 60 + sm;
            const end = eh * 60 + em;

            const isCurrent = currentTime >= start && currentTime < end;

            const li = document.createElement("li");
            li.className = `artist ${isCurrent ? "current-artist" : ""}`;
            li.id = `${stageName.replace(/\s+/g, '-')}-${artist.name.replace(/\s+/g, '-')}`;

            // ✅ RESTORED: artist-info wrapper (important for layout)
            const artistInfo = document.createElement("div");
            artistInfo.className = "artist-info";

            const nameSpan = document.createElement("span");
            nameSpan.className = "artist-name";
            nameSpan.textContent = artist.name;

            const artistNameBR = document.createElement("br");

            const timeSpan = document.createElement("span");
            timeSpan.className = "artist-time";
            timeSpan.textContent = `${artist.start} - ${artist.end}`;

            artistInfo.appendChild(nameSpan);
            artistInfo.append(artistNameBR);
            artistInfo.appendChild(timeSpan);
            li.appendChild(artistInfo);

            // ✅ Countdown stays the same
            if (isCurrent) {
                const c = document.createElement("div");
                c.className = "countdown";
                li.appendChild(c);
                startCountdown(li, artist.end);
            }

            list.appendChild(li);
        });

        stageEl.appendChild(list);
        container.appendChild(stageEl);
    }
}

function renderDayTabs() {
    const tabsContainer = document.getElementById("day-tabs");
    if (!tabsContainer) return;

    tabsContainer.innerHTML = "";

    const days = Object.keys(schedule).sort();

    days.forEach(dayKey => {
        const dateObj = new Date(dayKey + "T00:00:00");
        const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });

        const tab = document.createElement("button");
        tab.className = `day-tab ${dayKey === activeDayKey ? "active" : ""}`;
        tab.textContent = dayName;

        tab.onclick = () => {
            activeDayKey = dayKey;

            // stop fallback countdown if switching manually
            if (fallbackCountdownInterval) {
                clearInterval(fallbackCountdownInterval);
            }

            renderDayTabs();
            renderSchedule();
        };

        tabsContainer.appendChild(tab);
    });
}

// =========================
// INIT
// =========================
document.addEventListener("DOMContentLoaded", () => {
    setActiveDay();
    updateTime();
    renderDayTabs();   // 👈 ADD THIS
    renderSchedule();

    setInterval(updateTime, 1000);
    setInterval(checkForSetChanges, 1000);
});