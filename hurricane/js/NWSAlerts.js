// Fetch data from NWS API for /alerts/active
async function fetchGeoJSONData() {
    try {
        const response = await fetch('https://api.weather.gov/alerts/active', {
            headers: {
                'User-Agent': 'tropical tracker (devinnikitenko@yahoo.com)', // Required by weather.gov API
                'Accept': 'application/geo+json',
            }
        });
        
        // Check if the response is OK
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.features;
    } catch (error) {
        console.error('Error fetching GeoJSON data:', error);
        return [];
    }
}

// Function to initialize alerts on the map
async function initAlerts() {
    const alertData = await fetchGeoJSONData();

    alertLayer = L.geoJSON(alertData, {
        style: getAlertStyle,
        onEachFeature: onEachAlertFeature
    }).addTo(map2);

    alertLayer.once("load", function () {
        removeAllLayersExcept(alertLayer);
    });

    // Update the last updated time
    //updateLastUpdatedTime();
}

// Function to get the style based on the alert event type
function getAlertStyle(feature) {
    const event = feature.properties.event;

    const styles = {
        'Special Marine Statement': createStyle('rgba(255, 165, 0, 0.8)'),
        'Special Marine Warning': createStyle('rgba(255, 165, 0, 0.8)'),
        'Special Weather Statement': createStyle('rgba(255, 228, 181, 0.8)'),
        'Marine Weather Statement': createStyle('rgba(255, 239, 213, 0.8)'),
        'Severe Thunderstorm Watch': createStyle('rgba(219, 112, 147, 0.8)'),
        'Severe Thunderstorm Warning': createStyle('rgba(255, 165, 0, 0.8)'),
        'Tornado Watch': createStyle('rgba(255, 255, 0, 0.8)'),
        'Tornado Warning': createStyle('rgba(255, 0, 0, 0.8)'),
        'Flood Advisory': createStyle('rgba(0, 255, 127, 0.8)'),
        'Flood Watch': createStyle('rgba(46, 139, 87, 0.8)'),
        'Flood Warning': createStyle('rgba(0, 255, 0, 0.8)'),
        'Flash Flood Watch': createStyle('rgba(46, 139, 87, 0.8)'),
        'Flash Flood Warning': createStyle('rgba(139, 0, 0, 0.8)'),
        'Storm Surge Watch': createStyle('rgba(219, 127, 247, 0.8)'),
        'Storm Surge Warning': createStyle('rgba(181, 36, 247, 0.8)'),
        'Tropical Storm Watch': createStyle('rgba(240, 128, 128, 0.8)'),
        'Tropical Storm Warning': createStyle('rgba(178, 34, 34, 0.8)'),
        'Hurricane Watch': createStyle('rgba(255, 0, 255, 0.8)'),
        'Hurricane Warning': createStyle('rgba(220, 20, 60, 0.8)')
        // Add more events and their corresponding styles as needed
    };

    const defaultStyle = createStyle('rgba(128, 128, 128, 0.6)', 'black');

    return styles[event] || defaultStyle;
}

// Helper function to create a style object
function createStyle(fillColor, color = fillColor) {
    return {
        fillColor: fillColor,
        color: color,
        weight: 2
    };
}

// Function to handle each alert feature and create popups
function onEachAlertFeature(feature, layer) {
    const { event, parameters, expires } = feature.properties;
    const tornadoPos = parameters.tornadoDetecton || "No Threat of tornadoes provided.";
    const hailSize = parameters.maxHailSize || "No hail size provided.";
    const windSpeed = parameters.maxWindGust || "No wind gust provided.";
    const expireTime = moment().to(expires) || "No Expire Time Provided.";

    const content = `
        <p id="popupTitle">${event || "No event name provided"}</p>
        <p id="tornadoPossibility">Tornado Possibility: ${tornadoPos}</p>
        <p id="hailSize">Hail Size: ${hailSize}</p>
        <p id="windSpeed">Wind Gust: ${windSpeed}</p>
        <p id="expirationDate">Expires ${expireTime}</p>
        <button>Description</button>
    `;

    layer.bindPopup(content);
}

// Function to update the last updated time on the webpage
function updateLastUpdatedTime() {
    const time = new Date();
    const updatedHours = time.getHours();
    const updatedMinutes = time.getMinutes();
    const updatedDate = `Last Updated: ${updatedHours}:${updatedMinutes}`;
    document.getElementById('lastUpdated').innerText = updatedDate;
}

// Function to check if alerts layer exists and refresh it
async function checkForAlertsLayer() {
    if (map.hasLayer(alertLayer)) {
        map.removeLayer(alertLayer);
        setTimeout(initAlerts, 500);
    }
}

// Initialize alerts and set an interval to refresh them
// initAlerts();
// setInterval(checkForAlertsLayer, 60 * 1000);