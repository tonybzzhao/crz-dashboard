// Set your Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1Ijoia2Fpc2VyYm9ibyIsImEiOiJjbGlkbGU0anQwMG5uM2tvY2lpc3hyaDloIn0.y4yHlSPNI_fn_pjERNk8XA';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/kaiserbobo/cm94zpp13007901qt3mttcdlq',
    center: [-73.99171, 40.73496], // NYC center
    zoom: 12
});

let airQualityData = [];
let isAQILoaded = false;

fetch('data/air-quality.json')
  .then(response => response.json())
  .then(data => {
    airQualityData = data;
    isAQILoaded = true;

    // If date is already set, update meters now
    const selectedDate = document.getElementById('currentDate').textContent;
    if (selectedDate && availableDates.includes(selectedDate)) {
      updateAQIMeters(selectedDate);
    }
  })
  .catch(err => console.error("Error loading air quality JSON:", err));

function getAQIColor(aqi) {
    if (aqi <= 50) return '#00e400';       // Good
    if (aqi <= 100) return '#ffff00';      // Moderate
    if (aqi <= 150) return '#ff7e00';      // Unhealthy for Sensitive Groups
    if (aqi <= 200) return '#ff0000';      // Unhealthy
    if (aqi <= 300) return '#8f3f97';      // Very Unhealthy
    return '#7e0023';                      // Hazardous
}

function updateAQIMeters(dateStr) {
    if (!isAQILoaded || !airQualityData.length) return;

    const aq = airQualityData.find(d => d.date === dateStr);
    if (!aq) return;

    const meters = [
        { id: 'pm25Meter', label: 'PM2.5', value: aq.pm25 },
        { id: 'no2Meter', label: 'NO₂', value: aq.no2 },
        { id: 'o3Meter', label: 'O₃', value: aq.o3 }
    ];

    meters.forEach(({ id, label, value }) => {
        const container = document.getElementById(id);
        if (container) {
            const color = getAQIColor(value);
            container.innerHTML = `
                <div class="aqi-meter-label">${label}: ${value}</div>
                <div class="aqi-meter-bar" style="width: ${Math.min(value, 300) / 1}%; background-color: ${color};"></div>
            `;
        }
    });
}

// Function to add the CRZ outline from rows.json
function addCRZOutline() {
    // Fetch the rows.json file
    fetch('data/rows.json')
        .then(response => response.json())
        .then(jsonData => {
            // Check if data exists
            if (!jsonData.data || jsonData.data.length === 0) {
                console.error("No polygon data found in rows.json.");
                return;
            }

            // Extract the polygon WKT string from the first row (assuming it's in index 8)
            const wktString = jsonData.data[0][8];
            console.log("WKT string:", wktString);

            // Convert the WKT string to a GeoJSON geometry using wellknown
            const wk = window.wellknown;
            if (!wk) {
                console.error("wellknown library is not loaded!");
                return;
            }
            const geojsonGeometry = wk.parse(wktString);
            console.log("Parsed GeoJSON geometry:", geojsonGeometry);

            // Check if the parsed geometry is valid
            if (!geojsonGeometry || !geojsonGeometry.type || !geojsonGeometry.coordinates) {
                console.error("Parsing error: Invalid GeoJSON geometry.");
                return;
            }

            // Wrap the geometry in a GeoJSON Feature
            const geojsonFeature = {
                type: "Feature",
                properties: {},
                geometry: geojsonGeometry
            };

            // Add the CRZ polygon as a new source
            if (map.getSource('crzZone')) {
                map.getSource('crzZone').setData(geojsonFeature);
            } else {
                map.addSource('crzZone', {
                    type: 'geojson',
                    data: geojsonFeature
                });

                // Add a fill layer (semi-transparent) for the polygon
                map.addLayer({
                    id: 'crzZoneFill',
                    type: 'fill',
                    source: 'crzZone',
                    layout: {},
                    paint: {
                        'fill-color': '#FCCC0A',
                        'fill-opacity': 0.2
                    }
                });

                // Add a line layer for the polygon outline
                map.addLayer({
                    id: 'crzZoneOutline',
                    type: 'line',
                    source: 'crzZone',
                    layout: {},
                    paint: {
                        'line-color': '#FCCC0A',
                        'line-width': 3
                    }
                });
            }

        })
        .catch(err => console.error("Error loading CRZ rows JSON:", err));
}

// Call addCRZOutline inside the map load event
map.on('load', function () {
    addCRZOutline();

    // (Your other initialization code can follow here)
});

// Lookup table for Detection Group coordinates
const detectionGroupCoordinates = {
    "Brooklyn Bridge": [-73.9969, 40.7061],
    "East 60th St": [-73.9661, 40.7619],
    "FDR Drive at 60th St": [-73.95866, 40.75870],
    "Holland Tunnel": [-74.01104, 40.72600],
    "Hugh L. Carey Tunnel": [-74.01558, 40.70188],
    "Lincoln Tunnel": [-74.00289, 40.75989],
    "Manhattan Bridge": [-73.9905, 40.7070],
    "Queens Midtown Tunnel": [-73.966951, 40.74736],
    "Queensboro Bridge": [-73.95544, 40.75729],
    "West 60th St": [-73.98212, 40.76892],
    "West Side Highway at 60th St": [-73.99302, 40.77344],
    "Williamsburg Bridge": [-73.972933, 40.71381],
};

// Global arrays for available dates and composition data
let availableDates = [];
let compositionData = [];

// Convert JSON records to GeoJSON
function recordsToGeoJSON(records) {
    const features = records.reduce((acc, row) => {
        const detectionGroup = row["Detection Group"];
        const coordinates = detectionGroupCoordinates[detectionGroup];
        if (coordinates) {
            acc.push({
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: coordinates
                },
                properties: {
                    tollDate: row["Toll Date"],
                    crzEntries: parseInt(row["CRZ Entries"], 10),
                    detectionGroup: detectionGroup
                }
            });
        }
        return acc;
    }, []);
    return {
        type: "FeatureCollection",
        features: features
    };
}

// Load composition data from JSON
function loadCompositionData() {
    fetch('data/aggregated_composition.json')
        .then(response => response.json())
        .then(data => {
            compositionData = data;
        })
        .catch(err => console.error("Error loading composition JSON:", err));
}

// Load aggregated entries JSON and update the map for a given selected date
function loadAndDisplayData(selectedDate) {
    fetch('data/aggregated_entries.json')
        .then(response => response.json())
        .then(data => {
            // On first load, extract unique dates if not already populated
            if (availableDates.length === 0) {
                const dateSet = new Set(data.map(d => d["Toll Date"]));
                availableDates = Array.from(dateSet).sort();
                const dateSlider = document.getElementById('dateSlider');
                dateSlider.max = availableDates.length - 1;
                document.getElementById('currentDate').textContent = availableDates[0];
                // Remove tickmarks: do not set 'list' attribute, do not reference datalist
                // dateSlider.setAttribute('list', 'tickmarks'); // (Removed for no ticks)
            }

            let geojson = recordsToGeoJSON(data);
            // Filter features for the selected date
            geojson.features = geojson.features.filter(feature => feature.properties.tollDate === selectedDate);

            // Calculate maximum CRZ Entries from filtered features
            let maxVal = 0;
            geojson.features.forEach(feature => {
                const entries = feature.properties.crzEntries;
                if (entries > maxVal) {
                    maxVal = entries;
                }
            });

            // Define a new interpolation expression for circle radius.
            // If maxVal is low (or constant), the circle size won't change much.
            // Adjust the numbers as needed; here, 0 -> 5px, maxVal -> 30px.
            const newRadiusExpression = [
                'interpolate',
                ['linear'],
                ['get', 'crzEntries'],
                0, 1,
                100000, 50
            ];

            // Update or add the Mapbox source and layers
            if (map.getSource('crzEntries')) {
                map.getSource('crzEntries').setData(geojson);
                map.setPaintProperty('crzEntriesLayer', 'circle-radius', newRadiusExpression);
            } else {
                map.addSource('crzEntries', { type: 'geojson', data: geojson });
                map.addLayer({
                    id: 'crzEntriesLayer',
                    type: 'circle',
                    source: 'crzEntries',
                    paint: {
                        'circle-radius': newRadiusExpression,
                        'circle-color': '#2360A5',
                        'circle-opacity': 0.7
                    }
                });
                // Add a symbol layer for the dynamic label above each circle
                map.addLayer({
                    id: 'crzEntriesLabels',
                    type: 'symbol',
                    source: 'crzEntries',
                    layout: {
                        'text-field': ['to-string', ['get', 'crzEntries']],
                        'text-size': 18,
                        'text-offset': [0, 0],
                        'text-anchor': 'center',
                        'text-font': ['Roboto Mono Bold', 'Arial Unicode MS Regular']
                    },
                    paint: {
                        'text-color': '#ffffff',
                        'text-halo-color': '#2360A5',
                        'text-halo-width': 1,
                    }
                });
                map.on('click', 'crzEntriesLayer', function (e) {
                    const feature = e.features[0];
                    const detectionGroup = feature.properties.detectionGroup;
                    const tollDate = feature.properties.tollDate;
                    showCompositionPopup(e.lngLat, detectionGroup, tollDate);
                });
                map.on('mouseenter', 'crzEntriesLayer', function () {
                    map.getCanvas().style.cursor = 'pointer';
                });
                map.on('mouseleave', 'crzEntriesLayer', function () {
                    map.getCanvas().style.cursor = '';
                });
            }
        })
        .catch(err => console.error("Error loading aggregated entries JSON:", err));
}

// Show a popup with a Chart.js chart for vehicle composition
Chart.defaults.font.family = 'Roboto Mono, monospace';
function showCompositionPopup(lngLat, detectionGroup, tollDate) {
    const filtered = compositionData.filter(d =>
        d["Toll Date"] === tollDate && d["Detection Group"] === detectionGroup
    );

    const labels = filtered.map(d => d["Vehicle Class"]);
    const counts = filtered.map(d => parseInt(d["CRZ Entries"], 10));

    const popupContent = document.createElement('div');
    popupContent.style.width = '230px';
    popupContent.style.padding = '5px';
    popupContent.style.fontFamily = 'Roboto Mono, monospace';
    popupContent.innerHTML = `
    <div style="text-align: center; margin-bottom: 10px;">
      <strong style="font-size: 16px;">${detectionGroup}</strong><br/>
      <span style="font-size: 14px;">${tollDate}</span>
    </div>
  
    <!--- HTML Legend -->
    <div style="font-size: 12px; margin-bottom: 12px; line-height: 1.4;">
      <div><span style="display: inline-block; width: 12px; height: 12px; background:#003f5c; margin-right: 6px;"></span>1 – Cars, Pickups and Vans</div>
      <div><span style="display: inline-block; width: 12px; height: 12px; background:#444e86; margin-right: 6px;"></span>2 – Single-Unit Trucks</div>
      <div><span style="display: inline-block; width: 12px; height: 12px; background:#955196; margin-right: 6px;"></span>3 – Multi-Unit Trucks</div>
      <div><span style="display: inline-block; width: 12px; height: 12px; background:#dd5182; margin-right: 6px;"></span>4 – Buses</div>
      <div><span style="display: inline-block; width: 12px; height: 12px; background:#ff6e54; margin-right: 6px;"></span>5 – Motorcycles</div>
      <div><span style="display: inline-block; width: 12px; height: 12px; background:#ffa600; margin-right: 6px;"></span>TLC Taxi/FHV</div>
    </div>
  `;

    const canvas = document.createElement('canvas');

    // Set actual rendering size (what Chart.js will use)
    canvas.width = 150;
    canvas.height = 150;

    // Optional: for layout control in the DOM
    canvas.style.display = 'block';  // avoid inline spacing
    canvas.style.margin = '0 auto';  // center horizontally

    popupContent.appendChild(canvas);

    // Create and show popup first
    new mapboxgl.Popup()
        .setLngLat(lngLat)
        .setDOMContent(popupContent)
        .addTo(map);

    // Then defer chart creation to next animation frame
    requestAnimationFrame(() => {
        if (window.currentPopupChart) {
            window.currentPopupChart.destroy();
        }

        const ctx = canvas.getContext('2d');
        window.currentPopupChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: counts,
                    backgroundColor: ['#003f5c', '#444e86', '#955196', '#dd5182', '#ff6e54', '#ffa600']
                }]
            },
            options: {
                responsive: false,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: false }
                }
            }
        });
    });
}

const toggleBtn = document.getElementById('panelToggle');
const panel = document.getElementById('controls');

toggleBtn.addEventListener('click', () => {
    const isHidden = panel.classList.toggle('hidden');

    toggleBtn.innerHTML = isHidden
        ? '<i data-lucide="chevron-right"></i>'
        : '<i data-lucide="chevron-left"></i>';

    toggleBtn.title = isHidden ? 'Show panel' : 'Hide panel';
    toggleBtn.style.left = isHidden ? '10px' : '300px';

    lucide.createIcons(); // re-render chevron icon
});

// Update map when the slider value changes
document.getElementById('dateSlider').addEventListener('input', function () {
    const index = parseInt(this.value, 10);
    const selectedDate = availableDates[index];
    document.getElementById('currentDate').textContent = selectedDate;
    loadAndDisplayData(selectedDate);
    updateAQIMeters(selectedDate);
});

// On map load, load composition data and initialize available dates from aggregated entries JSON
map.on('load', function () {
    loadCompositionData();
    fetch('data/aggregated_entries.json')
        .then(response => response.json())
        .then(data => {
            const dateSet = new Set(data.map(d => d["Toll Date"]));
            availableDates = Array.from(dateSet).sort();
            const dateSlider = document.getElementById('dateSlider');
            dateSlider.max = availableDates.length - 1;
            document.getElementById('currentDate').textContent = availableDates[0];

            // Disable map interactions
            map.scrollZoom.disable();
            map.dragPan.disable();
            map.doubleClickZoom.disable();

            loadAndDisplayData(availableDates[0]);
            // If AQI data is loaded, update meters for the initial date
            if (isAQILoaded) {
                updateAQIMeters(availableDates[0]);
            }
        })
        .catch(err => console.error("Error initializing dates:", err));
});

// Add event listener for dateInput box
document.getElementById('dateInput').addEventListener('change', function () {
    const selectedDate = this.value;
    const index = availableDates.indexOf(selectedDate);
    if (index !== -1) {
        document.getElementById('dateSlider').value = index;
        document.getElementById('currentDate').textContent = selectedDate;
        loadAndDisplayData(selectedDate);
        updateAQIMeters(selectedDate);
    }
});