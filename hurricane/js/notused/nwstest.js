async function fetchGeoJSONData() {
    try {
        const response = await fetch('https://api.weather.gov/alerts/active?limit=500');
        const data = await response.json();
        //console.log(data);
        return data.features;
    } catch (error) {
        console.error('Error fetching GeJSON data:', error);
        return [];
    }
}

async function initAlerts() {
    const alertData = await fetchGeoJSONData();

    onEachFeature: function test(feature, layer) {
        var title = feature.properties.event || "No event name provided";
        var sender = feature.properties.senderName;
        var windSpeed = "Wind Gust: " + feature.properties.parameters.maxWindGust || "No wind gust provided.";
        var hailSize = "Hail Size: " + feature.properties.parameters.maxHailSize || "No hail size provided.";
        var tornadoPos = "Tornado Possibiity: " + feature.properties.parameters.tornadoDetecton || "No Threat of tornados provided.";
        var expireTime = "Expires " + moment().to(feature.properties.expires) || "No Expire Time Provided.";
        
        var content = 
        '<div id="alertWrapper"' +
            '<p id="alertListName">' + title + '</p>' +
            '<p id="alertListSender">' + sender + '</p>' +
            '<div class="flex" id="alertMenuInfo">' +
                '<p class="flex">' + windSpeed + '</p>' +
                '<p class="flex">' + hailSize + '</p>' +
                '<p class="flex">' + tornadoPos + '</p>' +
            '</div>' +
            '<div class="flex" id="alertMenuBtns">' +
                '<button>'+ "view description" + '</button>' + 
                '<p>' + expireTime + '</p>' +
                '<button>'+ "view description" + '</button>' + 
            '</div>' +
        "</div>";

        var content = '<p id="popupTitle">' + title + '</p>' + '<p id="tornadoPossibility">' + tornadoPos + '</p>' + '<p id="hailSize">' + hailSize + '</p>' + '<p id="windSpeed">' + windSpeed + '</p>' + '<p id="expirationDate">' + expireTime + '</p>' + '<button>Description</button>';
        var infoContent = document.getElementById('infoContent');
        infoContent.innerHTML = content;
        layer.bindPopup(content)
    }
}