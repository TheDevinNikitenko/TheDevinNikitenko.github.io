// Get NWS api for /alerts/active
async function fetchGeoJSONData() {
    try {
        const response = await fetch('https://api.weather.gov/alerts/active?limit=500');
        const data = await response.json();
        console.log(data);
        return data.features;
    } catch (error) {
        console.error('Error fetching GeJSON data:', error);
        return [];
    }
}

async function initAlerts() {
    const alertData = await fetchGeoJSONData();

    alertLayer = L.geoJSON(alertData, {
        style: function (feature) {
            var event = feature.properties.event;

            //Define different styles based on event
            var styles = {
                'Special Marine Statement': {
                    fillColor: 'rgba(255, 165, 0, 0.8)',
                    color: 'rgba(255, 165, 0, 0.8)',
                    weight: 2
                },
                'Special Marine Warning': {
                    fillColor: 'rgba(255, 165, 0, 0.8)',
                    color: 'rgba(255, 165, 0, 0.8)',
                    weight: 2
                },
                'Special Weather Statement': {
                    fillColor: 'rgba(255, 228, 181, 0.8)',
                    color: 'rgba(255, 228, 181, 0.8)',
                    weight: 2
                },
                'Marine Weather Statement': {
                    fillColor: 'rgba(255, 239, 213, 0.8)',
                    color: 'rgba(255, 239, 213, 0.8)',
                    weight: 2
                },
                'Severe Thunderstorm Watch': {
                    fillColor: 'rgba(219, 112, 147, 0.8)',
                    color: 'rgba(219, 112, 147, 0.8)',
                    weight: 2
                },
                'Severe Thunderstorm Warning': {
                    fillColor: 'rgba(255, 165, 0, 0.8)',
                    color: 'rgba(255, 165, 0, 0.8)',
                    weight: 2
                },
                'Tornado Watch': {
                    fillColor: 'rgba(255, 255, 0, 0.8)',
                    color: 'rgba(255, 255, 0, 0.8)',
                    weight: 2
                },
                'Tornado Warning': {
                    fillColor: 'rgba(255, 0, 0, 0.8)',
                    color: 'rgba(255, 0, 0, 0.8)',
                    weight: 2
                },
                'Flood Advisory': {
                    fillColor: 'rgba(0, 255, 127, 0.8)',
                    color: 'rgba(0, 255, 127, 0.8)',
                    weight: 2
                },
                'Flood Watch': {
                    fillColor: 'rgba(46, 139, 87, 0.8)',
                    color: 'rgba(46, 139, 87, 0.8)',
                    weight: 2
                },
                'Flood Warning': {
                    fillColor: 'rgba(0, 255, 0, 0.8)',
                    color: 'rgba(0, 255, 0, 0.8)',
                    weight: 2
                },
                'Flash Flood Watch': {
                    fillColor: 'rgba(46, 139, 87, 0.8)',
                    color: 'rgba(46, 139, 87, 0.8)',
                    weight: 2
                },
                'Flash Flood Warning': {
                    fillColor: 'rgba(139, 0, 0, 0.8)',
                    color: 'rgba(139, 0, 0, 0.8)',
                    weight: 2
                },
                'Special Weather Statement': {
                    fillColor: 'rgba(255, 228, 181, 0.8)',
                    color: 'rgba(255, 228, 181, 0.8)',
                    weight: 2
                },
                'Storm Surge Watch': {
                    fillColor: 'rgba(219, 127, 247, 0.8)',
                    color: 'rgba(219, 127, 247, 0.8)',
                    weight: 2
                },
                'Storm Surge Warning': {
                    fillColor: 'rgba(181, 36, 247, 0.8)',
                    color: 'rgba(181, 36, 247, 0.8)',
                    weight: 2
                },
                'Tropical Storm Watch': {
                    fillColor: 'rgba(240, 128, 128, 0.8)',
                    color: 'rgba(240, 128, 128, 0.8)',
                    weight: 2
                },
                'Tropical Storm Warning': {
                    fillColor: 'rgba(178, 34, 34, 0.8)',
                    color: 'rgba(178, 34, 34, 0.8)',
                    weight: 2
                },
                'Hurricane Watch': {
                    fillColor: 'rgba(255, 0, 255, 0.8)',
                    color: 'rgba(255, 0, 255, 0.8)',
                    weight: 2
                },
                'Hurricane Warning': {
                    fillColor: 'rgba(220, 20, 60, 0.8)',
                    color: 'rgba(220, 20, 60, 0.8)',
                    weight: 2
                },

                // Add more events and their corresponding styles as needed
            };
            // Default style for unlisted events
            var defaultStyle = {
                fillColor: 'rgba(128, 128, 128, 0.6)', // Gray color
                color: 'black', // Black border color
                weight: 2
            };
            return styles[event] || defaultStyle;
        },
        //Alert popup w/ data // Trying to have each information in their own <p>. NOT CURRENTLY WORKING
        onEachFeature: function (feature, layer) {
            var title = feature.properties.event || "No event name provided";
            var tornadoPos = "Tornado Possibiity: " + feature.properties.parameters.tornadoDetecton || "No Threat of tornados provided.";
            var hailSize = "Hail Size: " + feature.properties.parameters.maxHailSize || "No hail size provided.";
            var windSpeed = "Wind Gust: " + feature.properties.parameters.maxWindGust || "No wind gust provided.";
            var expireTime = "Expires " + moment().to(feature.properties.expires) || "No Expire Time Provided.";
            
            var content = '<p id="popupTitle">' + title + '</p>' + '<p id="tornadoPossibility">' + tornadoPos + '</p>' + '<p id="hailSize">' + hailSize + '</p>' + '<p id="windSpeed">' + windSpeed + '</p>' + '<p id="expirationDate">' + expireTime + '</p>' + '<button>Description</button>';
            var infoContent = document.getElementById('infoContent');
            infoContent.innerHTML = content;
            layer.bindPopup(content)
        }
    }).addTo(map);

    alertLayer.once("load", function () { // Remove only once the new tile layer has downloaded all tiles in view port.
        removeAllLayersExcept(alertLayer);
      });
    // Update last updated time
    var time = new Date();
    var updatedhours = time.getHours();
    var updatedminutes = time.getMinutes();
    const updatedDate = "Last Updated: " + updatedhours + ":" + updatedminutes
    document.getElementById('lastUpdated').innerText = updatedDate;
};

initAlerts();

async function checkForAlertsLayer() {
    if (map.hasLayer(alertLayer)) {
        map.removeLayer(alertLayer);
        setTimeout(function(){
            initAlerts();
        }, 2000);
    }
};
setInterval(checkForAlertsLayer, 60*1000)