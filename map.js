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

  // Bluebikes & Traffic Data 
  try {
    // Load Data
    const stationsUrl = 'https://dsc-courses.github.io/dsc209r-2025-fa/labs/lab07/data/bluebikes-stations.json';
    const tripsUrl = 'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv';

    // Await both data fetches
    const jsonData = await d3.json(stationsUrl);
    const trips = await d3.csv(tripsUrl); 

    let stations = jsonData.data.stations;
    console.log('Loaded stations:', stations.slice(0, 2));
    console.log('Loaded trips:', trips.slice(0, 2));

    // Get counts for trips
    const arrivals = new Map();
    const departures = new Map();

    trips.forEach(trip => {
      const startName = trip.start_station_name;
      const endName = trip.end_station_name;
      const count = +trip.trip_count; 

      // Tally departures
      const currentDepartures = departures.get(startName) ?? 0;
      departures.set(startName, currentDepartures + count);

      // Tally arrivals
      const currentArrivals = arrivals.get(endName) ?? 0;
      arrivals.set(endName, currentArrivals + count);
    });

    // Merge Traffic data into stations
    stations = stations.map((station) => {
      let name = station.name; 
      
      const arrivalCount = arrivals.get(name) ?? 0;
      const departureCount = departures.get(name) ?? 0;

      // Add the new properties to the station object
      station.arrivals = arrivalCount;
      station.departures = departureCount; 
      station.totalTraffic = arrivalCount + departureCount; 
      
      return station;
    });
    
    console.log('Stations with traffic data:', stations.slice(0, 2));

    // Calculate Max traffic
    const maxTraffic = d3.max(stations, (d) => d.totalTraffic);
    console.log('Max traffic:', maxTraffic);

    // Convert into GEOJSON
    const features = stations.map(station => {
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [station.lon, station.lat]
        },
        properties: station 
      };
    });

    const geojsonData = {
      type: 'FeatureCollection',
      features: features
    };

    // Add source and layer
    map.addSource('bluebikes_stations', {
      type: 'geojson',
      data: geojsonData 
    });

    map.addLayer({
      id: 'stations-layer',
      type: 'circle',
      source: 'bluebikes_stations',
      paint: {
        'circle-radius': [
          'interpolate',          // Use interpolation
          ['sqrt'],               // Use a square-root scale
          ['get', 'totalTraffic'],// Get the 'totalTraffic' property
          
          // Domain -> Range
          0, 0,                   // Input: 0 traffic -> Output: 0px radius
          maxTraffic, 25          // Input: maxTraffic -> Output: 25px radius
        ],

        'circle-color': '#007cbf',
        'circle-stroke-width': 1,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.8 // Added a little opacity
      }
    });

  } catch (error) {
    console.error('Error loading or processing data:', error);
  }
});


const departures = d3.rollup(
  trips,
  (v) => v.length,
  (d) => d.start_station_id,
);

// --- ALTERNATE STATION MARKER CODE --- //
// const svg = d3.select('#map').select('svg');

// function getCoords(station) {
//   const point = new mapboxgl.LngLat(+station.lon, +station.lat); // Convert lon/lat to Mapbox LngLat
//   const { x, y } = map.project(point); // Project to pixel coordinates
//   return { cx: x, cy: y }; // Return as object for use in SVG attributes
// }

// // Append circles to the SVG for each station
// const circles = svg
//   .selectAll('circle')
//   .data(stations)
//   .enter()
//   .append('circle')
//   .attr('r', 5) // Radius of the circle
//   .attr('fill', 'steelblue') // Circle fill color
//   .attr('stroke', 'white') // Circle border color
//   .attr('stroke-width', 1) // Circle border thickness
//   .attr('opacity', 0.8); // Circle opacity

//   // Function to update circle positions when the map moves/zooms
// function updatePositions() {
//   circles
//     .attr('cx', (d) => getCoords(d).cx) // Set the x-position using projected coordinates
//     .attr('cy', (d) => getCoords(d).cy); // Set the y-position using projected coordinates
// }

// // Initial position update when map loads
// updatePositions();

// // Reposition markers on map interactions
// map.on('move', updatePositions); // Update during map movement
// map.on('zoom', updatePositions); // Update during zooming
// map.on('resize', updatePositions); // Update on window resize
// map.on('moveend', updatePositions); // Final adjustment after movement ends