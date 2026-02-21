export const state = {
  alerts: null,          // raw NWS FeatureCollection
  alertsDraw: null,      // what we draw on map (after filtering)
  radarFrames: [],       // rainviewer frames
  radarIndex: 0,
  radarPlaying: false,
  radarTimer: null,

  filters: {
    search: "",
    // default all on
    types: {
      Warning: true,
      Watch: true,
      Advisory: true,
      Statement: true,
      Forecast: true,
      Other: true,
    }
  },

  layersOn: {
    radar: true,
    alerts: true,
    spc: false,
    metar: false,
    lightning: false,
    satellite: false,
  },

  perfMode: true,

  follow: {
    on: false,
    marker: null,
    watchId: null,
    lastLatLng: null,
  },
};