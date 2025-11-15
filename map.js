// Import Mapbox as an ESM module
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
// Import D3 as an ES Module
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Check that Mapbox GL JS is loaded
console.log('Mapbox GL JS Loaded:', mapboxgl);

// Set your Mapbox access token here
mapboxgl.accessToken = 'pk.eyJ1IjoibG1hcmFiZWgiLCJhIjoiY21od251bmozMDFpMDJrcTJ1d2VrcjhtaSJ9.RvPHBPagszYlbI5lIupB_g';

// Global Helper functions

// Formats a number of minutes since midnight into a HH:MM AM/PM string.
function formatTime(minutes) {
  const date = new Date(0, 0, 0, 0, minutes); // Create a base date and set minutes
  return date.toLocaleString('en-US', { timeStyle: 'short' }); // Format as HH:MM AM/PM
}

// Returns the number of minutes since midnight for a given Date object.
function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}
// Refactored function to calculate traffic from raw trips.
function computeStationTraffic(stations, trips) {
  // Compute departures
  const departures = d3.rollup(
    trips,
    (v) => v.length, // Count 1 for each trip
    (d) => d.start_station_id,
  );

  // Compute arrivals
  const arrivals = d3.rollup(
    trips,
    (v) => v.length, // Count 1 for each trip
    (d) => d.end_station_id,
  );

  // Update each station with the new counts
  return stations.map((station) => {
    let id = station.short_name;
    const arrivalCount = arrivals.get(id) ?? 0;
    const departureCount = departures.get(id) ?? 0;
    
    // Return a new station object with updated traffic
    return {
      ...station, // Copy all original station properties
      arrivals: arrivalCount,
      departures: departureCount,
      totalTraffic: arrivalCount + departureCount,
    };
  });
}

// Filters a list of trips based on the time slider.
function filterTripsbyTime(trips, timeFilter) {
  return timeFilter === -1
    ? trips // If no filter is applied (-1), return all trips
    : trips.filter((trip) => {
        // Convert trip start and end times to minutes since midnight
        const startedMinutes = minutesSinceMidnight(trip.started_at);
        const endedMinutes = minutesSinceMidnight(trip.ended_at);

        // Include trips that started or ended within 60 minutes of the selected time
        return (
          Math.abs(startedMinutes - timeFilter) <= 60 ||
          Math.abs(endedMinutes - timeFilter) <= 60
        );
      });
}

// --- MAP INITIALIZATION ---

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
    // Load Data
    const stationsUrl = './bluebikes-stations.json';
    const tripsUrl = './bluebikes-traffic-2024-03.csv'; // This is the RAW file

    const jsonData = await d3.json(stationsUrl);
    // Use row converter to parse dates as they are loaded
    const trips = await d3.csv(tripsUrl, (trip) => {
      trip.started_at = new Date(trip.started_at);
      trip.ended_at = new Date(trip.ended_at);
      return trip;
    });
    
    // Original, un-trafficked list of stations
    const originalStations = jsonData.data.stations;
    console.log('Loaded stations:', originalStations.slice(0, 2));
    console.log('Loaded trips:', trips.slice(0, 2));

    // Compute initial data
    let stations = computeStationTraffic(originalStations, trips);

    // Create D3 scale
    const maxTraffic = d3.max(stations, (d) => d.totalTraffic) || 0;
    console.log('Max traffic (D3):', maxTraffic);
    
    const radiusScale = d3
      .scaleSqrt()
      .domain([0, maxTraffic])
      .range([0, 25]); // Default range

    // Create the color quantize scale
    let stationFlow = d3.scaleQuantize().domain([0, 1]).range([0, 0.5, 1]);

    // Setup D3/SVG overlay
    const container = map.getCanvasContainer();
    const svg = d3.select(container)
      .append('svg')
      .style('position', 'absolute')
      .style('top', '0')
      .style('left', '0')
      .style('width', '100%')
      .style('height', '100%')
      .style('pointer-events', 'none');

    // Bind data and create circles
    const circles = svg
      .selectAll('circle')
      .data(stations, (d) => d.short_name)
      .enter()
      .append('circle')
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .attr('opacity', 0.8)
      .attr('r', (d) => radiusScale(d.totalTraffic))
      // Check for d.totalTraffic === 0 to avoid NaN.
      .style('--departure-ratio', (d) => {
        if (d.totalTraffic === 0) {
          return 0.5; // Neutral color if no traffic
        }
        return stationFlow(d.departures / d.totalTraffic);
      })
      .style('pointer-events', 'auto') 
      .each(function (d) {

        // Add <title> for browser tooltips
        d3.select(this)
          .append('title')
          .text(
            `${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`,
          );
      });

    // Positioning function
    function getCoords(d) {
      const point = new mapboxgl.LngLat(+d.lon, +d.lat);
      const { x, y } = map.project(point);
      return { cx: x, cy: y };
    }

    function updatePositions() {
      circles
        .attr('cx', (d) => getCoords(d).cx)
        .attr('cy', (d) => getCoords(d).cy);
    }

    // Map event listeners
    updatePositions(); 
    map.on('move', updatePositions);
    map.on('zoom', updatePositions);
    map.on('resize', updatePositions);
    
    // Slider reactivity

    // Select UI elements 
    const timeSlider = document.getElementById('time-slider');
    const selectedTime = document.getElementById('slider-time');
    const anyTimeLabel = document.getElementById('slider-any-time');

    // Updates the scatterplot based on the time filter.
    function updateScatterPlot(timeFilter) {
      // Get only the trips that match the selected time filter
      const filteredTrips = filterTripsbyTime(trips, timeFilter);

      // Recompute station traffic based on the filtered trips
      const filteredStations = computeStationTraffic(originalStations, filteredTrips);

      // Dynamically update the scale's range
      timeFilter === -1 ? radiusScale.range([0, 25]) : radiusScale.range([3, 50]);

      // Update the D3 selection
      circles
        // Use key function for the data update
        .data(filteredStations, (d) => d.short_name)
        .join('circle') // Use .join() for enter/update
        .attr('r', (d) => radiusScale(d.totalTraffic))
        // We check for d.totalTraffic === 0 to avoid NaN.
        .style('--departure-ratio', (d) => {
          if (d.totalTraffic === 0) {
            return 0.5; // Neutral color if no traffic
          }
          return stationFlow(d.departures / d.totalTraffic);
        })
        // Update the tooltip text
        .select('title') // Select the existing <title>
        .text(
          (d) =>
            `${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`,
        );
    }
    
    // Updates the time display and triggers the scatterplot update.
    function updateTimeDisplay() {
      let timeFilter = Number(timeSlider.value); // Get slider value

      if (timeFilter === -1) {
        selectedTime.textContent = ''; // Clear time display
        anyTimeLabel.style.display = 'block'; // Show "(any time)"
      } else {
        selectedTime.textContent = formatTime(timeFilter); // Display formatted time
        anyTimeLabel.style.display = 'none'; // Hide "(any time)"
      }

      // Call updateScatterPlot to reflect the changes on the map
      updateScatterPlot(timeFilter);
    }

    // Bind the slider's 'input' event
    timeSlider.addEventListener('input', updateTimeDisplay);
    
    // Call it once to set the initial state
    updateTimeDisplay();

  } catch (error) {
    console.error('Error loading or processing D3/SVG data:', error);
  }
});