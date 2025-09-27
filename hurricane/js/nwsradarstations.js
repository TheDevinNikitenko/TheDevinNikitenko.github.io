// Define default and clicked styles for circle markers
var defaultStyle = {
    color: 'blue',
    fillColor: 'blue',
    fillOpacity: 0.5,
    radius: 5
};

var clickedStyle = {
    color: 'red',
    fillColor: 'red',
    fillOpacity: 0.5,
    radius: 5
};

// Fetch radar stations data
async function fetchRadarStations() {
    try {
        const response = await fetch('https://api.weather.gov/radar/stations');
        const data = await response.json();
        return data.features;
    } catch (error) {
        console.error('Error fetching radar stations data:', error);
        return [];
    }
}

// Function to add image overlay
function addImageOverlay(lat, lon, imageUrl) {
    // Define the bounds of the image
    var boundnumber = 4;
    var bounds = [[lat - boundnumber, lon - boundnumber], [lat + boundnumber, lon + boundnumber]];
    console.log("Adding image overlay at bounds:", bounds, "with URL:", imageUrl);

    // Add the image overlay to the map
    L.imageOverlay(imageUrl, bounds).addTo(map);
}

// Create markers and add them to the map
async function addRadarStationMarkers() {
    const radarStations = await fetchRadarStations();

    radarStations.forEach(station => {
        const { geometry, properties } = station;
        const [lon, lat] = geometry.coordinates;

        // Create a circle marker with the default style
        const marker = L.circleMarker([lat, lon], defaultStyle).addTo(map);

        // Add click event to the marker
        marker.on('click', function() {
            marker.setStyle(clickedStyle);
            marker.bindPopup(`Station Name: ${properties.name}`).openPopup();

            // Dynamic image URL based on station properties or other logic
            const stationid = properties.id.slice(1);
            const imageUrl = `https://mesonet.agron.iastate.edu/data/gis/images/4326/ridge/${stationid}/N0B_0.png`;

            // Add image overlay at the marker's location
            addImageOverlay(lat, lon, imageUrl);
        });

        // Add an event to change color back when the popup is closed
        marker.on('popupclose', function() {
            marker.setStyle(defaultStyle);
        });
    });
}


// Call the function to add markers
addRadarStationMarkers();
