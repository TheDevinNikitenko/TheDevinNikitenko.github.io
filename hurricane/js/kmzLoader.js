// Instantiate KMZ layer (async)
var kmz = L.kmzLayer().addTo(map);

kmz.on('load', function(e) {
  control.addOverlay(e.layer, e.name);
  // e.layer.addTo(map);
});

// Add remote KMZ files as layers (NB if they are 3rd-party servers, they MUST have CORS enabled)
kmz.load('https://corsproxy.io/?https://www.nhc.noaa.gov/storm_graphics/api/AL022024_CONE_latest.kmz');

var control = L.control.layers(null, null, { collapsed:false }).addTo(map);