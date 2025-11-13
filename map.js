// Import Mapbox as an ESM module
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
// Check that Mapbox GL JS is loaded
console.log('Mapbox GL JS Loaded:', mapboxgl);

// Set your Mapbox access token here
mapboxgl.accessToken = 'pk.eyJ1IjoibG1hcmFiZWgiLCJhIjoiY21od251bmozMDFpMDJrcTJ1d2VrcjhtaSJ9.RvPHBPagszYlbI5lIupB_g';

// Initialize the map
const map = new mapboxgl.Map({
  container: 'map', // ID of the div where the map will render
  style: 'mapbox://styles/mapbox/streets-v12', // Map style
  center: [-71.09415, 42.36027], // [longitude, latitude]
  zoom: 12, // Initial zoom level
  minZoom: 5, // Minimum allowed zoom
  maxZoom: 18, // Maximum allowed zoom
});

// Everything that touches the map's data must go inside here!
map.on('load', async () => {
    
  // Add the GeoJSON data source for Boston bike routes
  map.addSource('boston_route', {
    type: 'geojson',
    data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson',
  });

  // Add the GeoJSON data source for Cambridge bike routes
  map.addSource('cambridge_route', {
    type: 'geojson',
    data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson',
  });

  // --- LAYERS ---
  // Add the layer for BOSTON 
  map.addLayer({
    id: 'boston-bike-lanes',
    type: 'line',
    source: 'boston_route', 
    paint: {
      'line-color': 'magenta',
      'line-width': 3,
      'line-opacity': 0.4,
    },
  });

  // Add the layer for CAMBRIDGE 
  map.addLayer({
    id: 'cambridge-bike-lanes', 
    type: 'line',
    source: 'cambridge_route', 
    paint: {
      'line-color': 'blue',
      'line-width': 3,
      'line-opacity': 0.4,
    },
  });

});