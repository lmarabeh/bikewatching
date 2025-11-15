// Import Mapbox as an ESM module
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
// Import D3 as an ES Module
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

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

// All map data logic must go inside the 'load' event
map.on('load', async () => {
    
  // Bike lane sources and layers
  map.addSource('boston_route', {
    type: 'geojson',
    data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson',
  });

  map.addSource('cambridge_route', {
    type: 'geojson',
    data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson',
  });

  map.addLayer({
    id: 'boston-bike-lanes',
    type: 'line',
    source: 'boston_route',
    paint: { 'line-color': 'magenta', 'line-width': 3, 'line-opacity': 0.4 },
  });

  map.addLayer({
    id: 'cambridge-bike-lanes',
    type: 'line',
    source: 'cambridge_route',
    paint: { 'line-color': 'blue', 'line-width': 3, 'line-opacity': 0.4 },
  });

  // Bluebikes stations and traffic 
  try {
    // Load data from Bluebikes stations and trips
    const stationsUrl = 'bluebikes-stations.json';
    const tripsUrl = 'bluebikes-traffic-2024-03.csv'; // This is the RAW file

    const jsonData = await d3.json(stationsUrl);
    const trips = await d3.csv(tripsUrl);
    let stations = jsonData.data.stations;

    // Process data 
    // Count trips by 1, joining on station ID
    const arrivals = new Map();
    const departures = new Map();

    trips.forEach(trip => {
      const startId = trip.start_station_id;
      const endId = trip.end_station_id;
      // Tally departures (count each row as 1)
      departures.set(startId, (departures.get(startId) ?? 0) + 1);
      // Tally arrivals (count each row as 1)
      arrivals.set(endId, (arrivals.get(endId) ?? 0) + 1);
    });

    // Merge traffic data into stations
    stations = stations.map((station) => {
      let id = station.short_name; // e.g., "M32006"
      station.arrivals = arrivals.get(id) ?? 0;
      station.departures = departures.get(id) ?? 0;
      station.totalTraffic = station.arrivals + station.departures;
      return station;
    });

    // Create D3 scale
    const maxTraffic = d3.max(stations, (d) => d.totalTraffic) || 0;
    console.log('Max traffic (D3):', maxTraffic);
    
    const radiusScale = d3
      .scaleSqrt()
      .domain([0, maxTraffic])
      .range([0, 25]); // Min 0, Max 25

    // Setup D3/SVG overlay
    const container = map.getCanvasContainer();

    // Append our own SVG element on top of the map
    const svg = d3.select(container)
      .append('svg')
      .style('position', 'absolute')
      .style('top', '0')
      .style('left', '0')
      .style('width', '100%')
      .style('height', '100%')
      .style('pointer-events', 'auto');

    // Create circles for each station
    const circles = svg
      .selectAll('circle')
      .data(stations)
      .enter()
      .append('circle')
      .attr('fill', '#007cbf') 
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .attr('opacity', 0.5)
      .attr('r', (d) => radiusScale(d.totalTraffic))
    // Add <title> for browser tooltips
      .each(function (d) {
          // 'this' refers to the <circle> element
          d3.select(this)
            .append('title') // Add an SVG <title> element
            .text(
              `${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`
            );
      });

    // Positioning functions
    function getCoords(d) {
      // map.project() converts (lon, lat) to (x, y) pixels
      const point = new mapboxgl.LngLat(+d.lon, +d.lat);
      const { x, y } = map.project(point);
      return { cx: x, cy: y };
    }

    // Update circle positions when the map moves
    function updatePositions() {
      circles
        .attr('cx', (d) => getCoords(d).cx) // Set new x
        .attr('cy', (d) => getCoords(d).cy); // Set new y
    }

    // Initial position & event listeners
    updatePositions();

    // Re-calculate positions every time the map moves
    map.on('move', updatePositions);
    map.on('zoom', updatePositions);
    map.on('resize', updatePositions);

    
  } catch (error) {
    console.error('Error loading or processing D3/SVG data:', error);
  }
});