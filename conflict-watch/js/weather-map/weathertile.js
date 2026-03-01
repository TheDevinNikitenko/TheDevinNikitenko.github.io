let weatherLayer

// https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png -- REXRAD Base Reflectivity current
// https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-eet-900913/{z}/{x}/{y}.png -- NEXRAD Echo Tops EET current

async function addWeatherLayer() {
    weatherLayer = L.tileLayer('https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png', {
        attribution: '© Iowa Environmental Mesonet',
        opacity: 0.3
    });

    weatherLayer.addTo(map);
};

addWeatherLayer();

async function checkForWeatherLayer() {
    if (map.hasLayer(weatherLayer)) {
        map.removeLayer(weatherLayer);
        setTimeout(function(){
            addWeatherLayer();
        }, 2000);
    }
};
setInterval(checkForWeatherLayer, 300*1000)