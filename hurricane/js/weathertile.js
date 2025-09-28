let weatherLayer

// https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png -- REXRAD Base Reflectivity current
// https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-eet-900913/{z}/{x}/{y}.png -- NEXRAD Echo Tops EET current
// https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/conus-goes-ir-4km/{z}/{x}/{y}.png -- 
// https://tilecache.rainviewer.com/v2/radar/{z}/{x}/{y}/{time}/256/{color}.png -- RAINVIWER

async function addWeatherLayer() {
    weatherLayer = L.tileLayer('https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png', {
        attribution: '© Iowa Environmental Mesonet'
    });

    // weatherLayer.addTo(map);
};

addWeatherLayer();

function checkForWeatherLayer() {
    if (map.hasLayer(weatherLayer)) {
        map.removeLayer(weatherLayer);
        setTimeout(function(){
            addWeatherLayer();
        }, 2000);
    }
};
setInterval(checkForWeatherLayer, 300*1000)