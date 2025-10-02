// Make sure to include these libraries in your HTML:
// <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
// <script src="https://cdnjs.cloudflare.com/ajax/libs/shpjs/3.6.3/shp.min.js"></script>

// Store references to loaded layers for management
const loadedLayers = new Map();

/**
 * Loads a Shapefile (.shp) from a URL and adds it to a Leaflet map
 * @param {string} layerId - Unique identifier for the layer
 * @param {string} shpUrl - URL to the .shp file or .zip containing shapefile
 * @param {L.Map} map - Leaflet map instance
 * @param {Object} options - Optional styling and configuration
 * @returns {Promise} - Resolves when layer is loaded and added to map
 */
async function loadShapefileLayer(layerId, shpUrl, map, options = {}) {
    try {
        // Remove existing layer if it exists
        if (loadedLayers.has(layerId)) {
            map.removeLayer(loadedLayers.get(layerId));
            loadedLayers.delete(layerId);
        }

        // Default styling options
        const defaultOptions = {
            style: (feature) => {
                // Check if this is an AOI feature with RISK2DAY property
                if (feature && feature.properties && feature.properties.TCWW){
                    const alerttype = feature.properties.TCWW

                    if (alerttype === "TWA") {
                        return {
                            color: '#fef852',      // Tropical Storm Watch
                            weight: 3,
                            opacity: 0.8,
                            fillColor: '#90ee90',
                            fillOpacity: 0.2,
                            dashArray: null    //'5, 10'
                        }
                    } else if (alerttype === "TWR") {
                        return {
                            color: '#2349f6',      // Tropical Storm Warning
                            weight: 3,
                            opacity: 0.9,
                            fillColor: '#ffa500',
                            fillOpacity: 0.3,
                            dashArray: null 
                        }
                    } else if (alerttype === "HWA") {
                        return {
                            color: '#f6c1cb',      // Hurricane Watch
                            weight: 3,
                            opacity: 0.8,
                            fillColor: '#ffff99',
                            fillOpacity: 0.2,
                            dashArray: null  //'5, 10'
                        }
                    } else if (alerttype === "HWR") {
                        return {
                            color: '#ed3731',      // Hurricane Warning
                            weight: 4,
                            opacity: 0.9,
                            fillColor: '#ff6b6b',
                            fillOpacity: 0.4,
                            dashArray: null 
                        }
                    }
                } else if (feature && feature.properties && feature.properties.RISK2DAY) {
                    const risk = feature.properties.RISK2DAY;
                    
                    // Style based on risk level
                    if (risk === 'Low') {
                        return {
                            color: '#d1cb49',      // Darker Yellow Border
                            weight: 2,
                            opacity: 0.8,
                            fillColor: '#fcf568',  // Yellow Fill
                            fillOpacity: 0.3
                        };
                    } else if (risk === 'Medium') {
                        return {
                            color: '#ffa500',      // Orange border
                            weight: 3,
                            opacity: 0.8,
                            fillColor: '#FFD700',  // Gold fill
                            fillOpacity: 0.4
                        };
                    } else if (risk === 'High') {
                        return {
                            color: '#ff0000',      // Red border
                            weight: 4,
                            opacity: 0.9,
                            fillColor: '#FF6B6B',  // Light red fill
                            fillOpacity: 0.5
                        };
                    }
                }
                
                // Default style for non-AOI features
                return {
                    color: '#ff0000',
                    weight: 2,
                    opacity: 0.8,
                    fillColor: 'lightblue',
                    fillOpacity: 0.2
                };
            },
            pointToLayer: (feature, latlng) => {
                // Only create custom markers for features with MAXWIND (hurricane track points)
                // AOI features will use the polygon styling defined above
                if (feature.properties && feature.properties.MAXWIND !== undefined) {
                    // Determine icon based on MAXWIND value
                    var gust = feature.properties.MAXWIND;
                    var iconUrl = 'https://p.productioncrate.com/stock-hd/effects/footagecrate-red-error-icon-prev-full.png';
                    
                    if (!isNaN(gust) && gust >= 0 && gust <= 33) {
                        iconUrl = 'icons/AOI3.png';
                    } else if (!isNaN(gust) && gust >= 34 && gust <= 64) {
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
                }
                
                // For AOI features or other point features without MAXWIND, use default point styling
                if (feature.properties && feature.properties.RISK2DAY) {
                    // For AOI point features, create markers with risk-based icons
                    var risk2day = feature.properties.RISK2DAY;
                    var iconUrl = 'https://p.productioncrate.com/stock-hd/effects/footagecrate-red-error-icon-prev-full.png';
                    
                    if (risk2day == 'Low') {
                        iconUrl = 'icons/AOI1.png';
                    } else if (risk2day == 'Medium') {
                        iconUrl = 'icons/AOI2.png';
                    } else if (risk2day == 'High') {
                        iconUrl = 'icons/AOI3.png';
                    }

                    var icon = L.icon({
                        iconUrl: iconUrl,
                        iconSize: [32, 32],
                        iconAnchor: [16, 16],
                        popupAnchor: [0, -16]
                    });

                    return L.marker(latlng, { icon: icon });
                }
                
                // Return null to use default polygon/line rendering
                return null;
            },
            onEachFeature: (feature, layer) => {
                // Add popup with feature properties
                if (feature.properties) {
                    // Debug: log TCWW features to console
                    if (feature.properties.TCWW) {
                        console.log('TCWW Feature detected:', {
                            TCWW: feature.properties.TCWW,
                            geometry: feature.geometry.type
                        });
                    }

                    let popupContent = '<div><strong>Feature Properties:</strong><br>';
                    for (const [key, value] of Object.entries(feature.properties)) {
                        if (value !== null && value !== undefined && value !== '') {
                            popupContent += `<strong>${key}:</strong> ${value}<br>`;
                        }
                    }
                    popupContent += '</div>';
                    layer.bindPopup(popupContent);
                }
            }
        };

        // Merge user options with defaults
        const mergedOptions = {
            ...defaultOptions,
            ...options,
            
        };

        console.log(`Loading shapefile from: ${shpUrl}`);
        
        // Load and parse the shapefile
        const geojson = await shp(shpUrl);
        
        // Debug: Log the structure of what we received
        console.log('Raw shapefile data:', geojson);
        console.log('Type of geojson:', typeof geojson);
        console.log('Is array?', Array.isArray(geojson));
        
        // Handle different possible response formats
        let features = [];
        
        if (Array.isArray(geojson)) {
            // If it's an array, it might contain multiple layers
            console.log(`Received array with ${geojson.length} items`);
            for (let i = 0; i < geojson.length; i++) {
                console.log(`Item ${i}:`, geojson[i]);
                if (geojson[i] && geojson[i].features) {
                    features = features.concat(geojson[i].features);
                }
            }
        } else if (geojson && geojson.features) {
            // Standard GeoJSON format
            features = geojson.features;
        } else if (geojson && geojson.type === 'FeatureCollection') {
            // Direct FeatureCollection
            features = geojson.features || [];
        } else if (geojson && geojson.type === 'Feature') {
            // Single feature
            features = [geojson];
        } else {
            console.error('Unexpected shapefile format:', geojson);
            throw new Error(`Unexpected shapefile format. Received: ${typeof geojson}`);
        }
        
        console.log(`Extracted ${features.length} features from shapefile`);
        
        if (features.length === 0) {
            throw new Error('No features found in shapefile - the file may be empty or in an unsupported format');
        }
        
        // Reconstruct as proper GeoJSON if needed
        const processedGeoJSON = {
            type: 'FeatureCollection',
            features: features
        };

        console.log(`Loaded ${features.length} features from shapefile`);

        // Create Leaflet layer from GeoJSON
        const layer = L.geoJSON(processedGeoJSON, mergedOptions);

        // Add layer to map
        map.addLayer(layer);

        // Store layer reference
        loadedLayers.set(layerId, layer);

        // Fit map to layer bounds if requested
        if (options.fitBounds !== false) {
            const bounds = layer.getBounds();
            if (bounds.isValid()) {
                map.fitBounds(bounds, { padding: [10, 10] });
            }
        }

        console.log(`Successfully loaded layer: ${layerId}`);
        
        return {
            success: true,
            layer: layer,
            featureCount: features.length,
            bounds: layer.getBounds()
        };

    } catch (error) {
        console.error(`Error loading shapefile layer ${layerId}:`, error);
        
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Removes a loaded shapefile layer from the map
 * @param {string} layerId - ID of the layer to remove
 * @param {L.Map} map - Leaflet map instance
 */
function removeShapefileLayer(layerId, map) {
    if (loadedLayers.has(layerId)) {
        map.removeLayer(loadedLayers.get(layerId));
        loadedLayers.delete(layerId);
        console.log(`Removed layer: ${layerId}`);
        return true;
    }
    console.warn(`Layer not found: ${layerId}`);
    return false;
}

/**
 * Gets a loaded layer by its ID
 * @param {string} layerId - ID of the layer to retrieve
 * @returns {L.Layer|null} - The layer if found, null otherwise
 */
function getShapefileLayer(layerId) {
    return loadedLayers.get(layerId) || null;
}

/**
 * Lists all loaded layer IDs
 * @returns {string[]} - Array of layer IDs
 */
function getLoadedLayerIds() {
    return Array.from(loadedLayers.keys());
}

/**
 * Updates the style of a loaded layer
 * @param {string} layerId - ID of the layer to update
 * @param {Object} newStyle - New style object
 */
function updateLayerStyle(layerId, newStyle) {
    const layer = loadedLayers.get(layerId);
    if (layer) {
        layer.setStyle(newStyle);
        return true;
    }
    console.warn(`Layer not found: ${layerId}`);
    return false;
}

// Load NHC OUTLOOK
loadShapefileLayer(
    'nhc-outlook', 
    'https://corsproxy.io/?https://www.nhc.noaa.gov/xgtwo/gtwo_shapefiles.zip',
    map,
    {
       
    }
).then(result => {
    if (result.success) {
        console.log('Layer loaded successfully!', result);
    } else {
        console.error('Failed to load layer:', result.error);
    }
});
/*
// Load Hurricane (NAME)
loadShapefileLayer(
    'nhc-INVEST_NUMBER', 
    'https://corsproxy.io/?https://www.nhc.noaa.gov/gis/forecast/archive/al092025_5day_latest.zip',
    map,
    {

    }
);
*/