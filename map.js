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

// Import D3 as an ES Module
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

map.on('load', async () => {
  
  // Boston route
  map.addSource('boston_route', {
    type: 'geojson',
    data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson',
  });

  // Cambridge route
  map.addSource('cambridge_route', {
    type: 'geojson',
    data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson',
  });

  // Now, fetch and add the Bluebikes data
  // Bluebikes Data 
  try {
    const jsonurl = 'https://dsc-courses.github.io/dsc209r-2025-fa/labs/lab07/data/bluebikes-stations.json';
    const jsonData = await d3.json(jsonurl);
    let stations = jsonData.data.stations;

    // Convert Bluebikes array 
    const features = stations.map(station => {
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          // Coordinates must be [longitude, latitude]
          coordinates: [station.lon, station.lat] 
        },
        properties: station 
      };
    });

    // Wrap features IN A FeatureCollection
    const geojsonData = {
      type: 'FeatureCollection',
      features: features
    };

    // Add new Geoson 
    map.addSource('bluebikes_stations', {
      type: 'geojson',
      data: geojsonData 
    });

//Add Layers 
  // Add the layer for Boston 
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

  // Add the layer for Cambridge 
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
    // Add layer for stations
    map.addLayer({
        id: 'stations-layer', 
        type: 'circle',
        source: 'bluebikes_stations', 
        paint: {
        'circle-radius': 5,
        'circle-color': '#007cbf', 
        'circle-stroke-width': 1,
        'circle-stroke-color': '#ffffff' 
        }
    });

  } catch (error) {
    console.error('Error loading JSON:', error);
  }
});
