var map = L.map('map', {
    center: [25.774902898965, -80.1861348388672],
    minZoom: 2,
    zoom: 10.25
});
L.tileLayer( 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png', {
   
}).addTo( map );
