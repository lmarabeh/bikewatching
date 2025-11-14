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

// Import D3 as an ES Module
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';


map.on('load', async () => {
  
  // Add the GeoJSON data source for Boston bike routes
  map.addSource('boston_route', { /* ... */ });
  // Add the GeoJSON data source for Cambridge bike routes
  map.addSource('cambridge_route', { /* ... */ });
  // Add the layer for BOSTON
  map.addLayer({ /* ... */ });
  // Add the layer for CAMBRIDGE
  map.addLayer({ /* ... */ });

  try {
    const jsonurl = 'https://dsc-courses.github.io/dsc209r-2025-fa/labs/lab07/data/bluebikes-stations.json';

    // Await JSON fetch
    const jsonData = await d3.json(jsonurl);
    console.log('Loaded JSON Data:', jsonData); // Log to verify structure

    // ***** MOVED THESE LINES INSIDE *****
    // Now it's safe to use jsonData because it exists in this scope
    // and this code only runs *after* the await d3.json() is complete.
    let stations = jsonData.data.stations;
    console.log('Stations Array:', stations); 

    // All code that uses 'stations' must also go in here...

  } catch (error) {
    console.error('Error loading JSON:', error); // Handle errors
  }
});

