fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
            .then(response => response.json())
            .then(data => {
                L.geoJSON(data, {
                    style: function (feature) {
                        return {
                            color: '#545454',
                            weight: 2,
                            fillOpacity: 0
                        };
                    }
                }).addTo(map);
            });