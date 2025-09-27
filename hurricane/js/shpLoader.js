let geoJSONLayer; // Declare this in the outer scope

async function loadSHPData() {
    try {
        const timestamp = new Date().getTime();
        const response = await fetch(`https://corsproxy.io/?https://www.nhc.noaa.gov/gis/forecast/archive/al092024_5day_latest.zip?_=${timestamp}`); // Cache-busting timestamp
        const arrayBuffer = await response.arrayBuffer();
        const shapeData = await shp(arrayBuffer);

        // If geoJSONLayer already exists, remove it
        if (geoJSONLayer) {
            map.removeLayer(geoJSONLayer);
        }

        // Assuming you have a Leaflet map set up (initialized in initializeMap function)
        geoJSONLayer = L.geoJSON(shapeData, {
            style: {
                fillColor: 'rgba(157, 20, 255, 0.8)',
                color: "#9d14ff",
                weight: 2
            },
            pointToLayer: function (feature, latlng) {
                // Determine icon based on GUST value
                var gust = feature.properties.MAXWIND;

                var iconUrl = 'https://p.productioncrate.com/stock-hd/effects/footagecrate-red-error-icon-prev-full.png';
                if (!isNaN(gust) && gust >= 34 && gust <= 64) {
                    iconUrl = 'icons/TS.png';
                } else if (!isNaN(gust) && gust >= 65 && gust <= 83) {
                    iconUrl = 'icons/CAT1.png';
                } else if (!isNaN(gust) && gust >= 84 && gust <= 96) {
                    iconUrl = 'icons/CAT2.png';
                } else if (!isNaN(gust) && gust >= 97 && gust <= 113) {
                    iconUrl = 'icons/CAT3.png';
                } else if (!isNaN(gust) && gust >= 114 && gust <= 136) {
                    iconUrl = 'icons/CAT4.png';
                } else if (!isNaN(gust) && gust >= 137 && gust <= 300) {
                    iconUrl = 'icons/CAT5.png';
                }

                var icon = L.icon({
                    iconUrl: iconUrl,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16],
                    popupAnchor: [0, -16]
                });

                return L.marker(latlng, { icon: icon });
            },
            onEachFeature: function (feature, layer) {
                var content;

                // Check if it's the special part with unique properties
                if (feature.properties.GUST !== undefined) {
                    content = feature.properties.STORMNAME + '<br>' + feature.properties.DATELBL + '<br>' + 'Wind Speed: ' + feature.properties.MAXWIND + '<br>' + 'Wind Gust: ' + feature.properties.GUST;
                } else {
                    // For regular features
                    var content = feature.properties.STORMTYPE + ' ' + feature.properties.STORMNAME + '<br>' + feature.properties.ADVDATE;
                }

                var infoContent = document.getElementById('infoContent');
                infoContent.innerHTML = content;

                if (content.length > 500) {
                    infoContent.style.overflow = 'auto';
                }

                layer.bindPopup(content);
            }
        }).addTo(map);
    } catch (error) {
        console.error('Error loading SHP data:', error);
    }
}

async function checkForSHPLayer() {
    if (map.hasLayer(geoJSONLayer)) {
        map.removeLayer(geoJSONLayer);
        setTimeout(loadSHPData, 500);
    }
}

// Initialize and set an interval to refresh
loadSHPData();
setInterval(loadSHPData, 600 * 1000);
