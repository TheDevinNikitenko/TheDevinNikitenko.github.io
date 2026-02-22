/* WX Broadcast Dashboard — WMS Radar/Satellite (works like your other project)
   - Dark basemap: CARTO dark_all
   - Radar overlay: IEM NEXRAD WMS-T (time-enabled)
   - Satellite overlay: IEM GOES-East WMS (IR by default)
   - Storm mode: higher opacity + zoom
   - Forecast: Open-Meteo
   - Alerts: NWS Alerts + list + modal + copy JSON
*/

const state = {
  units: "imperial",          // imperial | metric
  theme: "dark",              // dark | light
  talent: false,
  frozen: false,
  mock: false,
  location: { name: "Massapequa, NY", lat: 40.6807, lon: -73.4743 }
};

let chart;
let map;

// basemap
let darkBaseLayer;

// overlays
let radarWms = null;
let satWms = null;
let overlayMode = "radar"; // "radar" | "sat"
let stormOn = false;

// alerts
let lastAlerts = [];
let selectedAlert = null;

const $ = (id) => document.getElementById(id);

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

function toast(msg){
  const el = document.createElement("div");
  el.textContent = msg;
  el.style.position = "fixed";
  el.style.left = "50%";
  el.style.bottom = "18px";
  el.style.transform = "translateX(-50%)";
  el.style.padding = "10px 14px";
  el.style.borderRadius = "14px";
  el.style.border = "1px solid var(--line)";
  el.style.background = "rgba(0,0,0,0.55)";
  el.style.color = "white";
  el.style.fontWeight = "800";
  el.style.zIndex = "9999";
  document.body.appendChild(el);
  setTimeout(()=> el.remove(), 1400);
}

function nowClock() {
  const d = new Date();
  const el = $("clock");
  if (!el) return;
  el.textContent = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit"
  }).format(d);
}
setInterval(nowClock, 1000);
nowClock();

function fmtTime(ts, tz) {
  const d = new Date(ts);
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz || undefined
  }).format(d);
}

function fmtDay(ts, tz) {
  const d = new Date(ts);
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    timeZone: tz || undefined
  }).format(d);
}

function setTheme(theme){
  state.theme = theme;
  document.documentElement.dataset.theme = theme;

  const btn = $("btnTheme");
  if (btn){
    btn.setAttribute("aria-pressed", theme === "light" ? "true" : "false");
    btn.textContent = theme === "light" ? "Light" : "Dark";
  }
  refreshChartTheme();
}

function setTalent(on){
  state.talent = on;
  document.body.classList.toggle("talent", on);
  const btn = $("btnTalent");
  if (btn) btn.setAttribute("aria-pressed", on ? "true" : "false");
}

function toUnitLabel(){
  return state.units === "imperial" ? "°F / mph" : "°C / km/h";
}

function wxCodeToText(code){
  const map = {
    0:"Clear", 1:"Mostly Clear", 2:"Partly Cloudy", 3:"Overcast",
    45:"Fog", 48:"Rime Fog",
    51:"Light Drizzle", 53:"Drizzle", 55:"Heavy Drizzle",
    61:"Light Rain", 63:"Rain", 65:"Heavy Rain",
    71:"Light Snow", 73:"Snow", 75:"Heavy Snow",
    80:"Rain Showers", 81:"Showers", 82:"Violent Showers",
    95:"Thunderstorm", 96:"T-Storm + Hail", 99:"Severe Hail"
  };
  return map[code] || `WX ${code}`;
}

function impactIndex({ wind, precip, code }) {
  let score = 0;
  score += clamp((wind || 0) * 2.2, 0, 45);
  score += clamp((precip || 0) * 12, 0, 45);
  if ([95,96,99].includes(code)) score += 25;
  if ([65,75,82].includes(code)) score += 15;
  return clamp(Math.round(score), 0, 100);
}

function impactCopy(score, wxText){
  if (score < 20) return `Low impact: ${wxText}.`;
  if (score < 45) return `Moderate impact: plan for changing conditions (${wxText}).`;
  if (score < 70) return `High impact: weather may disrupt travel (${wxText}).`;
  return `Severe impact: hazardous conditions likely (${wxText}).`;
}

/* ----------------------------
   Data Fetching
---------------------------- */

async function geocode(query){
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error("Geocode failed");
  const data = await res.json();
  if (!data?.length) throw new Error("No results");
  return {
    name: data[0].display_name,
    lat: Number(data[0].lat),
    lon: Number(data[0].lon)
  };
}

async function fetchForecast(lat, lon){
  const metric = state.units === "metric";
  const tempUnit = metric ? "celsius" : "fahrenheit";
  const windUnit = metric ? "kmh" : "mph";
  const precipUnit = "inch";

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", lat);
  url.searchParams.set("longitude", lon);

  url.searchParams.set("current", [
    "temperature_2m",
    "relative_humidity_2m",
    "apparent_temperature",
    "weather_code",
    "wind_speed_10m",
    "wind_direction_10m",
    "precipitation"
  ].join(","));

  url.searchParams.set("hourly", [
    "temperature_2m",
    "precipitation_probability",
    "precipitation",
    "weather_code",
    "wind_speed_10m"
  ].join(","));

  url.searchParams.set("daily", [
    "temperature_2m_max",
    "temperature_2m_min",
    "precipitation_probability_max",
    "weather_code",
    "sunrise",
    "sunset",
    "uv_index_max"
  ].join(","));

  url.searchParams.set("temperature_unit", tempUnit);
  url.searchParams.set("wind_speed_unit", windUnit);
  url.searchParams.set("precipitation_unit", precipUnit);
  url.searchParams.set("timezone", "auto");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Forecast fetch failed");
  return res.json();
}

async function fetchAlerts(lat, lon){
  const url = `https://api.weather.gov/alerts/active?point=${lat},${lon}`;
  const res = await fetch(url, { headers: { "Accept": "application/geo+json" } });
  if (!res.ok) throw new Error("Alerts fetch failed");
  return res.json();
}

/* ----------------------------
   Map + WMS Overlays (Radar/Sat)
---------------------------- */

function initMap(){
  const el = $("map");
  if (!el) return;

  map = L.map("map", { zoomControl: true, preferCanvas: true })
    .setView([state.location.lat, state.location.lon], 8);

  // Dark base
  darkBaseLayer = L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    { maxZoom: 20, attribution: "&copy; OpenStreetMap &copy; CARTO" }
  ).addTo(map);

  // iPad gesture friendliness
  map.scrollWheelZoom.disable();
  map.dragging.enable();
  map.touchZoom.enable();
  map.doubleClickZoom.enable();

  ensureWmsOverlays();
  setTimeout(() => map.invalidateSize(true), 60);
}

function createRadarWmsLayer(){
  const WMS_URL = "https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0q-t.cgi";

  return L.tileLayer.wms(WMS_URL, {
    layers: "nexrad-n0q-wmst",
    format: "image/png",
    transparent: true,
    opacity: stormOn ? 0.85 : 0.65,
    version: "1.3.0",
    zIndex: 300,
    uppercase: true
  });
}

function createSatelliteWmsLayer(){
  // GOES East WMS
  const WMS_URL = "https://mesonet.agron.iastate.edu/cgi-bin/wms/goes_east.cgi";

  // IR tends to be more reliable/usable than VIS for “storm mode” and night
  return L.tileLayer.wms(WMS_URL, {
    layers: "goes_east_vis",   // try ir first; if you prefer visible: "goes_east_vis"
    format: "image/png",
    transparent: true,
    opacity: stormOn ? 0.75 : 0.55,
    version: "1.3.0",
    zIndex: 290,
    uppercase: true
  });
}

function ensureWmsOverlays(){
  if (!map) return;

  if (!radarWms) radarWms = createRadarWmsLayer();
  if (!satWms) satWms = createSatelliteWmsLayer();

  if (map.hasLayer(radarWms)) map.removeLayer(radarWms);
  if (map.hasLayer(satWms)) map.removeLayer(satWms);

  const active = (overlayMode === "sat") ? satWms : radarWms;
  active.addTo(map);
  active.bringToFront?.();

  setTimeout(() => map.invalidateSize(true), 50);
}

function setOverlayMode(mode){
  overlayMode = (mode === "sat") ? "sat" : "radar";
  ensureWmsOverlays();
}

function refreshOverlay(){
  // Force the WMS to re-request images (cache bust)
  const ts = Date.now();

  if (radarWms) radarWms.setParams({ _ts: ts }, false);
  if (satWms) satWms.setParams({ _ts: ts }, false);

  // Some browsers keep old tiles around; this helps
  ensureWmsOverlays();
}

function stormMode(on){
  stormOn = on;

  if (!radarWms) radarWms = createRadarWmsLayer();
  if (!satWms) satWms = createSatelliteWmsLayer();

  radarWms.setOpacity(on ? 0.85 : 0.65);
  satWms.setOpacity(on ? 0.75 : 0.55);

  if (on && map) map.setZoom(Math.max(map.getZoom(), 9));
  toast(on ? "Storm Mode ON" : "Storm Mode OFF");
}

/* ----------------------------
   Alerts UI
---------------------------- */

function setMarquee(items){
  const el = $("alertsMarquee");
  if (!el) return;

  const text = items.length
    ? items.join("   •   ")
    : "No active alerts. Monitor conditions and verify warnings on-air.";

  el.textContent = `${text}   •   ${text}`;
}

function escapeHtml(str){
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function renderAlertsUI(alertGeoJson){
  const feats = alertGeoJson?.features || [];
  lastAlerts = feats;

  const items = feats.slice(0, 6).map(f => {
    const p = f.properties || {};
    const headline = p.headline || p.event || "Alert";
    const area = p.areaDesc ? `(${p.areaDesc.split(";")[0]})` : "";
    return `${headline} ${area}`.trim();
  });
  setMarquee(items);

  const list = $("alertsList");
  if (!list) return;

  if (!feats.length){
    list.innerHTML = `<div class="muted" style="padding:12px 14px;">No active alerts.</div>`;
    return;
  }

  list.innerHTML = feats.slice(0, 25).map((f, idx) => {
    const p = f.properties || {};
    const sev = (p.severity || "Unknown").toLowerCase();
    const sevClass =
      sev === "extreme" ? "sevPill--extreme" :
      sev === "severe" ? "sevPill--severe" :
      sev === "moderate" ? "sevPill--moderate" : "sevPill--minor";

    const title = p.event || "Alert";
    const area = p.areaDesc || "—";
    const ends = p.ends ? new Date(p.ends).toLocaleString() : "—";
    const headline = (p.headline || p.description || "").replace(/\s+/g, " ").trim().slice(0, 160);

    return `
      <div class="alertItem">
        <div class="alertItem__top">
          <div>
            <div class="alertItem__event">${escapeHtml(title)}</div>
            <div class="alertItem__meta">${escapeHtml(area)}</div>
          </div>
          <div style="display:grid; gap:8px; justify-items:end;">
            <span class="sevPill ${sevClass}">${escapeHtml((p.severity || "Unknown").toUpperCase())}</span>
            <button class="btn btn--tiny btn--ghost" data-alert-view="${idx}">View</button>
          </div>
        </div>
        <div class="alertItem__desc">${escapeHtml(headline || "Tap View to open full alert.")}</div>
        <div class="alertItem__meta">Ends: ${escapeHtml(String(ends))}</div>
      </div>
    `;
  }).join("");

  list.querySelectorAll("[data-alert-view]").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.getAttribute("data-alert-view"));
      openAlertModal(lastAlerts[idx]);
    });
  });
}

function openAlertModal(feature){
  selectedAlert = feature;
  const p = feature?.properties || {};

  const modal = $("alertModal");
  if (!modal) return;

  $("alertModalTitle").textContent = p.event || "Alert";
  $("alertModalSub").textContent =
    `${p.severity || "Unknown"} • ${p.urgency || "—"} • ${p.certainty || "—"}`;

  const kv = [
    ["Headline", p.headline || "—"],
    ["Area", p.areaDesc || "—"],
    ["Effective", p.effective ? new Date(p.effective).toLocaleString() : "—"],
    ["Expires", p.expires ? new Date(p.expires).toLocaleString() : "—"],
    ["Ends", p.ends ? new Date(p.ends).toLocaleString() : "—"],
    ["Sender", p.senderName || "—"],
    ["Instructions", p.instruction || "—"],
    ["More Info", p.web || "—"]
  ];

  const grid = $("alertKeyGrid");
  if (grid){
    grid.innerHTML = kv.map(([k,v]) => `
      <div class="keyCard">
        <div class="keyCard__k">${escapeHtml(k)}</div>
        <div class="keyCard__v">${escapeHtml(String(v))}</div>
      </div>
    `).join("");
  }

  const pre = $("alertJsonBox");
  if (pre){
    pre.textContent = JSON.stringify(feature, null, 2);
  }

  modal.setAttribute("aria-hidden", "false");
}

function closeAlertModal(){
  const modal = $("alertModal");
  if (!modal) return;
  modal.setAttribute("aria-hidden", "true");
  selectedAlert = null;
}

/* ----------------------------
   Lower Third
---------------------------- */

function updateLowerThird(current, locName){
  const wxText = wxCodeToText(current.weather_code);
  const temp = Math.round(current.temperature_2m);
  const wind = Math.round(current.wind_speed_10m || 0);

  const t = $("ltTitle");
  const l = $("ltLine");
  if (!t || !l) return;

  t.textContent = "WEATHER UPDATE";
  l.textContent = `${locName} — ${temp}°, ${wxText}. Wind ${wind}.`;
}

function copyLowerThird(){
  const t = $("ltTitle")?.textContent || "";
  const l = $("ltLine")?.textContent || "";
  const text = `${t}\n${l}`.trim();
  navigator.clipboard?.writeText(text).catch(()=>{});
  toast("Lower third copied");
}

/* ----------------------------
   Chart
---------------------------- */

function getTickColor(){
  const isLight = document.documentElement.dataset.theme === "light";
  return isLight ? "rgba(0,0,0,0.60)" : "rgba(255,255,255,0.65)";
}

function initChart(){
  const ctx = $("hourlyChart");
  if (!ctx) return;

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        { label: "Temp", data: [], tension: 0.35, pointRadius: 0 },
        { label: "Precip (in)", data: [], tension: 0.35, pointRadius: 0 },
        { label: "Wind", data: [], tension: 0.35, pointRadius: 0 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { labels: { color: getTickColor() } },
        tooltip: { enabled: true }
      },
      scales: {
        x: { ticks: { color: getTickColor() } },
        y: { ticks: { color: getTickColor() } }
      }
    }
  });
}

function refreshChartTheme(){
  if (!chart) return;
  const c = getTickColor();
  chart.options.plugins.legend.labels.color = c;
  chart.options.scales.x.ticks.color = c;
  chart.options.scales.y.ticks.color = c;
  chart.update();
}

/* ----------------------------
   Renderers
---------------------------- */

function renderHourlyCards(hourly, tz){
  const wrap = $("hourlyCards");
  if (!wrap) return;
  wrap.innerHTML = "";

  const n = 12;
  for (let i=0; i<n; i++){
    const t = hourly.time[i];
    const temp = Math.round(hourly.temperature_2m[i]);
    const pop = Math.round(hourly.precipitation_probability[i] ?? 0);
    const wind = Math.round(hourly.wind_speed_10m[i] ?? 0);
    const wx = wxCodeToText(hourly.weather_code[i]);

    const card = document.createElement("div");
    card.className = "hourCard";
    card.innerHTML = `
      <div class="hourCard__t">${escapeHtml(fmtTime(t, tz))}</div>
      <div class="hourCard__wx">${escapeHtml(wx)}</div>
      <div class="hourCard__row"><span>Temp</span><span>${temp}°</span></div>
      <div class="hourCard__row"><span>PoP</span><span>${pop}%</span></div>
      <div class="hourCard__row"><span>Wind</span><span>${wind}</span></div>
    `;
    wrap.appendChild(card);
  }
}

function renderDaily(daily, tz){
  const list = $("dailyList");
  if (!list) return;
  list.innerHTML = "";

  for (let i=0; i<Math.min(daily.time.length, 7); i++){
    const day = fmtDay(daily.time[i], tz);
    const hi = Math.round(daily.temperature_2m_max[i]);
    const lo = Math.round(daily.temperature_2m_min[i]);
    const pop = Math.round(daily.precipitation_probability_max[i] ?? 0);
    const wx = wxCodeToText(daily.weather_code[i]);

    const row = document.createElement("div");
    row.className = "dayRow";
    row.innerHTML = `
      <div class="dayRow__top">
        <div class="dayRow__name">${escapeHtml(day)}</div>
        <div class="dayRow__temps">${hi}° / ${lo}°</div>
      </div>
      <div class="dayRow__desc">${escapeHtml(wx)} • Precip chance up to ${pop}%</div>
    `;
    list.appendChild(row);
  }
}

function autoStory(daily){
  const el = $("storyText");
  if (!el) return;

  const hi0 = Math.round(daily.temperature_2m_max[0]);
  const lo0 = Math.round(daily.temperature_2m_min[0]);
  const pop0 = Math.round(daily.precipitation_probability_max[0] ?? 0);
  const wx0 = wxCodeToText(daily.weather_code[0]);

  const pop1 = Math.round(daily.precipitation_probability_max[1] ?? 0);
  const wx1 = wxCodeToText(daily.weather_code[1]);

  const msg =
    `Today: ${wx0} with highs near ${hi0}° and lows around ${lo0}°. ` +
    (pop0 >= 40 ? `Rain chances are notable (${pop0}%). ` : `Limited rain chances (${pop0}%). `) +
    `Tomorrow: ${wx1} with precip chances around ${pop1}%. ` +
    `Main takeaway: focus on timing/impacts and any active alerts.`;

  el.textContent = msg;
}

function applyKpis(data){
  const tz = data.timezone;

  $("sunrise") && ($("sunrise").textContent = fmtTime(data.daily.sunrise[0], tz));
  $("sunset") && ($("sunset").textContent = fmtTime(data.daily.sunset[0], tz));
  $("uv") && ($("uv").textContent = Math.round(data.daily.uv_index_max[0] ?? 0));

  $("vis") && ($("vis").textContent = "—");
  $("pres") && ($("pres").textContent = "—");
  $("clouds") && ($("clouds").textContent = "—");
}

function applyCurrent(data){
  const c = data.current;
  const tz = data.timezone;

  const wxText = wxCodeToText(c.weather_code);
  const temp = Math.round(c.temperature_2m);
  const feels = Math.round(c.apparent_temperature ?? temp);
  const wind = Math.round(c.wind_speed_10m ?? 0);
  const hum = Math.round(c.relative_humidity_2m ?? 0);
  const prec = Number(c.precipitation ?? 0).toFixed(2);

  $("locName") && ($("locName").textContent = state.location.name);
  $("locCoords") && ($("locCoords").textContent = `${state.location.lat.toFixed(4)}, ${state.location.lon.toFixed(4)}`);

  $("badgeWx") && ($("badgeWx").textContent = wxText);
  $("badgeFeels") && ($("badgeFeels").textContent = `Feels ${feels}°`);
  $("badgeUpdated") && ($("badgeUpdated").textContent = `Updated ${fmtTime(data.current.time, tz)}`);

  $("tempNow") && ($("tempNow").textContent = `${temp}°`);
  $("windNow") && ($("windNow").textContent = `${wind} ${state.units === "imperial" ? "mph" : "km/h"}`);
  $("humNow") && ($("humNow").textContent = `${hum}%`);
  $("precNow") && ($("precNow").textContent = `${prec} in`);

  const score = impactIndex({ wind, precip: Number(prec), code: c.weather_code });
  $("impactFill") && ($("impactFill").style.width = `${score}%`);
  $("impactDesc") && ($("impactDesc").textContent = impactCopy(score, wxText));

  updateLowerThird(c, state.location.name);
}

function applyHourly(data){
  if (!chart) return;

  const tz = data.timezone;
  const h = data.hourly;

  const labels = h.time.slice(0, 24).map(t => fmtTime(t, tz));
  const temps = h.temperature_2m.slice(0, 24).map(x => Math.round(x));
  const prec = h.precipitation.slice(0, 24).map(x => Number(x.toFixed(2)));
  const wind = h.wind_speed_10m.slice(0, 24).map(x => Math.round(x));

  chart.data.labels = labels;
  chart.data.datasets[0].data = temps;
  chart.data.datasets[1].data = prec;
  chart.data.datasets[2].data = wind;
  chart.update();

  renderHourlyCards(h, tz);
}

/* ----------------------------
   Mock fallback
---------------------------- */

function mockData(){
  const now = new Date();
  const hourlyTimes = Array.from({length: 48}, (_,i)=> new Date(now.getTime() + i*3600000).toISOString());
  const dailyTimes = Array.from({length: 7}, (_,i)=> new Date(now.getTime() + i*86400000).toISOString().slice(0,10));

  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    current: {
      time: new Date().toISOString(),
      temperature_2m: 43,
      relative_humidity_2m: 58,
      apparent_temperature: 39,
      weather_code: 63,
      wind_speed_10m: 18,
      wind_direction_10m: 280,
      precipitation: 0.06
    },
    hourly: {
      time: hourlyTimes,
      temperature_2m: hourlyTimes.map((_,i)=> 42 + Math.round(Math.sin(i/4)*4)),
      precipitation_probability: hourlyTimes.map((_,i)=> (i%6===0?55:25)),
      precipitation: hourlyTimes.map((_,i)=> (i%6===0?0.08:0.01)),
      weather_code: hourlyTimes.map((_,i)=> (i%10===0?95:63)),
      wind_speed_10m: hourlyTimes.map((_,i)=> 14 + (i%8))
    },
    daily: {
      time: dailyTimes,
      temperature_2m_max: [45,48,52,49,46,44,47],
      temperature_2m_min: [34,36,38,37,35,33,34],
      precipitation_probability_max: [70,40,20,55,65,30,25],
      weather_code: [63,61,2,80,65,3,1],
      sunrise: dailyTimes.map(()=> new Date(new Date().setHours(6,35,0,0)).toISOString()),
      sunset: dailyTimes.map(()=> new Date(new Date().setHours(17,35,0,0)).toISOString()),
      uv_index_max: [2,3,4,3,2,2,3]
    }
  };
}

/* ----------------------------
   Main update loop
---------------------------- */

async function updateAll(){
  if (state.frozen) { toast("Data frozen"); return; }

  $("btnUnits") && ($("btnUnits").textContent = toUnitLabel());

  try{
    const data = state.mock
      ? mockData()
      : await fetchForecast(state.location.lat, state.location.lon);

    if (!chart) initChart();
    applyCurrent(data);
    applyHourly(data);
    applyKpis(data);
    renderDaily(data.daily, data.timezone);
    autoStory(data.daily);

    if (!map) initMap();
    map.setView([state.location.lat, state.location.lon], Math.max(map.getZoom(), 8));

    // Alerts
    if (!state.mock){
      try{
        const a = await fetchAlerts(state.location.lat, state.location.lon);
        await renderAlertsUI(a);
      }catch{
        setMarquee(["Alerts unavailable for this location (or outside US)."]);
        $("alertsList") && ($("alertsList").innerHTML = `<div class="muted" style="padding:12px 14px;">Alerts unavailable.</div>`);
      }
    }else{
      setMarquee([
        "MOCK: Flood Watch possible this evening",
        "MOCK: Strong wind gusts overnight",
        "MOCK: Travel impacts during commute"
      ]);
      $("alertsList") && ($("alertsList").innerHTML = `<div class="muted" style="padding:12px 14px;">Mock mode: alerts list not loaded.</div>`);
    }

  }catch(err){
    console.error(err);
    toast("API error — switching to mock");
    state.mock = true;
    updateAll();
  }
}

/* ----------------------------
   Search & Location
---------------------------- */

function parseLatLon(q){
  const m = q.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!m) return null;
  return { lat: Number(m[1]), lon: Number(m[2]), name: `Lat ${m[1]}, Lon ${m[2]}` };
}

async function doSearch(){
  const q = $("q")?.value.trim();
  if (!q) return;

  const ll = parseLatLon(q);
  if (ll){
    state.location = { ...ll };
    state.mock = false;
    await updateAll();
    return;
  }

  try{
    const loc = await geocode(q);
    state.location = loc;
    state.mock = false;
    await updateAll();
  }catch{
    toast("No results — try 'City, State' or 'lat,lng'");
  }
}

async function doLocate(){
  if (!navigator.geolocation){
    toast("Geolocation not available");
    return;
  }
  navigator.geolocation.getCurrentPosition(async (pos)=>{
    state.location = {
      name: "Device Location",
      lat: pos.coords.latitude,
      lon: pos.coords.longitude
    };
    state.mock = false;
    await updateAll();
  }, ()=>{
    toast("Location denied");
  }, { enableHighAccuracy: true, timeout: 8000 });
}

/* ----------------------------
   Misc controls
---------------------------- */

function toggleFullscreen(){
  if (!document.fullscreenElement){
    document.documentElement.requestFullscreen?.().catch(()=>{});
  }else{
    document.exitFullscreen?.();
  }
}

function resetLayout(){
  setTheme("dark");
  setTalent(false);
  state.units = "imperial";
  state.frozen = false;
  state.mock = false;
  toast("Reset");
  updateAll();
}

/* ----------------------------
   Events wiring
---------------------------- */

function initEvents(){
  $("btnSearch")?.addEventListener("click", doSearch);
  $("q")?.addEventListener("keydown", (e)=>{ if (e.key === "Enter") doSearch(); });
  $("btnLocate")?.addEventListener("click", doLocate);

  $("btnTalent")?.addEventListener("click", ()=> setTalent(!state.talent));

  $("btnTheme")?.addEventListener("click", ()=>{
    const next = (state.theme === "dark") ? "light" : "dark";
    setTheme(next);
    toast(next === "light" ? "Light theme" : "Dark theme");
  });

  $("btnFullscreen")?.addEventListener("click", toggleFullscreen);

  $("btnUnits")?.addEventListener("click", ()=>{
    state.units = (state.units === "imperial") ? "metric" : "imperial";
    toast(toUnitLabel());
    updateAll();
  });

  $("btnRefresh")?.addEventListener("click", ()=>{
    refreshOverlay();
    updateAll();
  });

  $("btnCopyLowerThird")?.addEventListener("click", copyLowerThird);

  $("btnRadar")?.addEventListener("click", ()=>{ setOverlayMode("radar"); toast("Radar"); });
  $("btnSatellite")?.addEventListener("click", ()=>{ setOverlayMode("sat"); toast("Satellite"); });

  $("btnStorm")?.addEventListener("click", (e)=>{
    const on = e.currentTarget.dataset.on !== "1";
    e.currentTarget.dataset.on = on ? "1" : "0";
    stormMode(on);
  });

  $("btnStory")?.addEventListener("click", ()=>{
    toast("Story refreshed");
    updateAll();
  });

  $("btnClearAlerts")?.addEventListener("click", ()=>{
    setMarquee([]);
    $("alertsList") && ($("alertsList").innerHTML = `<div class="muted" style="padding:12px 14px;">Cleared.</div>`);
    toast("Alerts cleared");
  });

  $("btnFreeze")?.addEventListener("click", ()=>{
    state.frozen = !state.frozen;
    toast(state.frozen ? "Data frozen" : "Data live");
    $("btnFreeze").textContent = state.frozen ? "Unfreeze Data" : "Freeze Data (for segment)";
  });

  $("btnMock")?.addEventListener("click", ()=>{
    state.mock = !state.mock;
    toast(state.mock ? "Mock ON" : "Mock OFF");
    updateAll();
  });

  $("btnReset")?.addEventListener("click", resetLayout);

  $("alertModalClose")?.addEventListener("click", closeAlertModal);
  $("btnCloseAlertModal")?.addEventListener("click", closeAlertModal);

  $("btnCopyAlertJson")?.addEventListener("click", ()=>{
    if (!selectedAlert) return;
    navigator.clipboard?.writeText(JSON.stringify(selectedAlert, null, 2)).catch(()=>{});
    toast("Alert JSON copied");
  });

  $("btnExpandAlerts")?.addEventListener("click", ()=>{
    const el = $("alertsList");
    if (!el) return;
    const isTall = el.style.maxHeight === "70vh";
    el.style.maxHeight = isTall ? "360px" : "70vh";
    toast(isTall ? "Alerts collapsed" : "Alerts expanded");
  });

  document.addEventListener("keydown", (e)=>{
    if (e.key === "Escape"){
      const modal = $("alertModal");
      if (modal && modal.getAttribute("aria-hidden") === "false") closeAlertModal();
    }
  });
}

/* ----------------------------
   Boot
---------------------------- */

(async function boot(){
  setTheme("dark");
  setTalent(false);

  initEvents();
  initMap();
  initChart();

  if (map) setTimeout(() => map.invalidateSize(true), 80);

  updateAll();
})();