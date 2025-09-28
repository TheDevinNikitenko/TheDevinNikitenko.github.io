var map = L.map('map', {
    center: [26.74053516016139, -84.91032829651077],
    minZoom: 2,
    zoom: 5.25
});
L.tileLayer( 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: ['a','b','c']
}).addTo(map);

var map2;

function initializeMap2() {
    map2 = L.map('map2', {
        center: [26.74053516016139, -84.91032829651077],
        minZoom: 2,
        zoom: 5.25
    });
    L.tileLayer( 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        subdomains: ['a','b','c']
    }).addTo(map2);
    
    weatherLayer = L.tileLayer('https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png', {
        attribution: '© Iowa Environmental Mesonet'
    });

    weatherLayer.addTo(map2);
    initAlerts();
    setInterval(checkForAlertsLayer, 60 * 1000);
}