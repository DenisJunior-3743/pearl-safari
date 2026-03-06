/**
 * map.js
 * ============================================================
 * Pearl Safari — Interactive Uganda Map Module
 *
 * Uses Leaflet.js (open-source, free, no API key needed) to
 * render an interactive map of Uganda with clickable markers
 * for every tourist attraction.
 *
 * Features:
 *  - Centered on Uganda
 *  - Custom green pin markers (matching brand)
 *  - Click marker → popup with photo, name, tagline, link
 *  - Clusters nearby markers when zoomed out (optional)
 *  - Responsive height (handled in CSS)
 *
 * Data source: js/data.json (coordinates.lat / coordinates.lng)
 *
 * Leaflet is loaded via CDN in HTML <head>. This module only
 * runs if a #uganda-map div exists on the page.
 * ============================================================
 */


/* ----------------------------------------------------------
   MAP CONFIGURATION
   Centrally defined settings — easy to tweak.
   ---------------------------------------------------------- */
const MAP_CONFIG = {
  containerId: 'uganda-map',

  // Uganda geographic center
  center: [1.3733, 32.2903],
  zoom:   7,
  minZoom: 6,
  maxZoom: 14,

  // Leaflet tile layer options
  // Using OpenStreetMap — free, no API key required
  tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  tileAttribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',

  // Custom styling overlay (green-tinted) via CartoDB Positron
  // Uncomment for a cleaner, more premium look:
  // tileUrl: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  // tileAttribution: '© CartoDB',
};


/* ----------------------------------------------------------
   initMap()
   Main function. Called from index.html and discover.html
   pages that contain a #uganda-map element.
   ---------------------------------------------------------- */
async function initMap() {
  // Guard: Only run if Leaflet is loaded and map container exists
  if (typeof L === 'undefined') {
    console.warn('Leaflet.js not loaded. Map cannot initialize.');
    return;
  }

  const container = document.getElementById(MAP_CONFIG.containerId);
  if (!container) return; // This page doesn't have a map

  // Load attraction data from JSON
  let attractions;
  try {
    const response = await fetch('./js/data.json');
    const data     = await response.json();
    attractions    = data.attractions;
    // Hide preloader once map data loads
    if (typeof hidePreloader === 'function') {
      hidePreloader();
    }
  } catch (err) {
    console.error('Failed to load data.json for map:', err);
    // Hide preloader even on error
    if (typeof hidePreloader === 'function') {
      hidePreloader();
    }
    return;
  }

  // --- Create the Leaflet map instance ---
  const map = L.map(MAP_CONFIG.containerId, {
    center:         MAP_CONFIG.center,
    zoom:           MAP_CONFIG.zoom,
    minZoom:        MAP_CONFIG.minZoom,
    maxZoom:        MAP_CONFIG.maxZoom,
    scrollWheelZoom: false,  // Prevent accidental scroll-to-zoom on page scroll
    zoomControl:    true,    // Keep +/- zoom buttons
  });

  // --- Add tile layer (the actual map imagery) ---
  L.tileLayer(MAP_CONFIG.tileUrl, {
    attribution: MAP_CONFIG.tileAttribution,
    maxZoom:     MAP_CONFIG.maxZoom,
  }).addTo(map);

  // Re-enable scroll zoom only when user has clicked on the map
  // This avoids hijacking page scroll when user scrolls past the map
  map.on('click', () => {
    map.scrollWheelZoom.enable();
  });

  // Disable again when mouse leaves map
  container.addEventListener('mouseleave', () => {
    map.scrollWheelZoom.disable();
  });

  // --- Create custom marker icon ---
  // A round green pin with a white leaf icon — on-brand
  function createCustomIcon(attraction) {
    return L.divIcon({
      className: '',  // No default Leaflet styling
      html: `
        <div style="
          width: 36px;
          height: 36px;
          background: var(--color-primary, #1b5e20);
          border: 3px solid white;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s ease;
        ">
          <i class="fas fa-leaf" style="
            transform: rotate(45deg);
            color: white;
            font-size: 13px;
          "></i>
        </div>
      `,
      iconSize:   [36, 36],     // Width/height of the icon div
      iconAnchor: [18, 36],     // The "tip" of the pin (bottom center)
      popupAnchor:[0, -40],     // Where popup appears relative to icon
    });
  }

  // --- Add a marker for each attraction ---
  attractions.forEach(attraction => {
    const { lat, lng } = attraction.coordinates;

    // Build popup HTML content
    const popupHTML = `
      <div class="map-popup">
        <img
          src="${attraction.images[0]}"
          alt="${attraction.name}"
          style="
            width: 100%;
            height: 120px;
            object-fit: cover;
            margin: -1rem -1rem 0.75rem;
            width: calc(100% + 2rem);
            display: block;
            border-radius: 0;
          "
          onerror="this.style.display='none'"
        >
        <div style="padding: 0 0 0.5rem;">
          <div style="
            font-family: var(--font-accent, Montserrat);
            font-size: 0.7rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--color-primary, #1b5e20);
            margin-bottom: 4px;
          ">${attraction.region}</div>
          <h4 style="
            font-family: 'Playfair Display', Georgia, serif;
            font-size: 0.95rem;
            font-weight: 700;
            color: #0d1b0f;
            margin: 0 0 4px;
            line-height: 1.3;
          ">${attraction.name}</h4>
          <p style="
            font-size: 0.78rem;
            color: #616161;
            margin: 0 0 8px;
            line-height: 1.5;
          ">${attraction.tagline}</p>
          <div style="
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 0.75rem;
            color: #f9a825;
            margin-bottom: 8px;
          ">
            ${'★'.repeat(Math.floor(attraction.rating))}
            <span style="color:#9e9e9e;font-size:0.7rem;font-family:Montserrat,sans-serif;font-weight:600;">
              ${attraction.rating}
            </span>
          </div>
          <a
            href="attraction.html?id=${attraction.id}"
            class="map-popup-link"
            style="
              font-family: Montserrat, sans-serif;
              font-size: 0.7rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              color: var(--color-primary, #1b5e20);
              display: inline-flex;
              align-items: center;
              gap: 4px;
            "
          >
            View Details <i class="fas fa-arrow-right" style="font-size:0.65rem;"></i>
          </a>
        </div>
      </div>
    `;

    // Create marker and bind popup
    const marker = L.marker([lat, lng], {
      icon: createCustomIcon(attraction),
      title: attraction.name,  // Shown on hover (accessibility)
      alt:   attraction.name,
    });

    marker.bindPopup(popupHTML, {
      maxWidth:    240,
      minWidth:    220,
      className:   'ps-popup',  // For CSS targeting
      closeButton: true,
    });

    marker.addTo(map);

    // Hover: open popup on mouse enter (not just click)
    marker.on('mouseover', function() {
      this.openPopup();
    });
  });

  // --- Add Uganda boundary overlay (optional visual enhancement) ---
  // A subtle green polygon outline around Uganda
  // Approximate boundary coordinates
  const ugandaBounds = [
    [4.2300, 29.5734], [3.8534, 30.8400], [3.0000, 31.3500],
    [1.9500, 31.9820], [1.0677, 31.8800], [0.2033, 31.1600],
    [-1.3640, 29.8590], [-0.9997, 29.5790], [-1.4788, 29.0310],
    [-0.0035, 29.5870], [0.9980, 29.9470], [2.8671, 30.1942],
    [3.5009, 30.9342], [3.7600, 30.1300], [4.2300, 29.5734],
  ];

  L.polygon(ugandaBounds, {
    color:       '#1b5e20',   // Green outline
    weight:      2,
    opacity:     0.5,
    fillColor:   '#1b5e20',
    fillOpacity: 0.04,        // Very subtle fill
    dashArray:   '6, 6',      // Dashed line style
  }).addTo(map);

  // --- Add country label ---
  const ugandaLabel = L.divIcon({
    html: `<div style="
      font-family: 'Playfair Display', serif;
      font-size: 1rem;
      font-weight: 700;
      color: rgba(27,94,32,0.4);
      letter-spacing: 0.15em;
      text-transform: uppercase;
      white-space: nowrap;
      pointer-events: none;
    ">UGANDA</div>`,
    className: '',
    iconSize: [120, 24],
    iconAnchor: [60, 12],
  });

  // Place label in geographic center of Uganda
  L.marker([1.37, 32.29], {
    icon: ugandaLabel,
    interactive: false,
    zIndexOffset: -1000,
  }).addTo(map);

  console.log(`✅ Pearl Safari map initialized with ${attractions.length} markers.`);
}


/* ----------------------------------------------------------
   DOM READY — Initialize map
   ---------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', initMap);
