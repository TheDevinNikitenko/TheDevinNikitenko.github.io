// Initialize Leaflet Map
var map = L.map('map', {
    center: [26.74053516016139, -84.91032829651077],
    minZoom: 2,
    zoom: 5.25
});
L.tileLayer( 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: ['a','b','c']
}).addTo(map);

