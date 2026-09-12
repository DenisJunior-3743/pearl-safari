/**
 * main.js
 * ============================================================
 * Pearl Safari — Home Page (index.html) Rendering Logic
 *
 * This module handles loading data from data.json and renders
 * dynamic sections on the home page:
 *  - Featured Attractions (4 featured cards in grid layout)
 *  - Why Choose Us (4 value prop cards)
 *  - Testimonials (carousel-like grid)
 *
 * All functions use error handling to ensure graceful degradation
 * if the JSON data fails to load or is malformed.
 * ============================================================
 */



/* ----------------------------------------------------------
   RENDER: FEATURED ATTRACTIONS
   Populates the featured-grid with the first N attractions
   marked as featured: true in data.json.
   
   Layout: CSS Grid with first card spanning 2x2 (hero card)
   ---------------------------------------------------------- */
function renderFeaturedAttractions(attractions) {
  const grid = document.getElementById('featured-grid');
  if (!grid) return;

  // Filter only featured attractions (featured: true in data.json)
  const featured = attractions.filter(a => a.featured).slice(0, 4);
  if (!featured.length) return;

  grid.innerHTML = featured.map((attr, idx) => `
    <a href="attraction.html?id=${attr.id}" class="attraction-card" data-aos="fade-up" data-aos-delay="${idx * 100}">
      <div class="card-img-wrap">
        <img
          src="${attr.images[0]}"
          alt="${attr.name}"
          loading="lazy"
        >
        <div class="card-img-overlay"></div>

        <!-- Category badge -->
        ${attr.category && attr.category[0] ? `
          <div class="card-category-badge">
            <span class="badge badge-green">
              <i class="fas fa-${getCategoryIcon(attr.category[0])}"></i>
              ${getCategoryLabel(attr.category[0])}
            </span>
          </div>
        ` : ''}
      </div>

      <div class="card-body">
        <h3 class="card-title">${attr.name}</h3>
        <p class="text-muted" style="font-size:0.9rem;margin-bottom:1rem;flex:1;">
          ${attr.shortDesc || attr.tagline}
        </p>
        
        <div style="display:flex;align-items:center;gap:0.5rem;font-size:0.85rem;color:var(--color-text-light);">
          <i class="fas fa-clock"></i>
          <span>${attr.duration}</span>
          <span style="margin-left:auto;">${attr.price}</span>
        </div>
      </div>
    </a>
  `).join('');

  // Trigger AOS refresh for newly added elements
  if (window.AOS) {
    AOS.refresh();
  }
}


/* ----------------------------------------------------------
   RENDER: WHY US SECTION
   4 value proposition cards explaining Pearl Safari's benefits
   Data comes from data.json why_us array
   ---------------------------------------------------------- */
function renderWhyUs(whyUsData) {
  const grid = document.getElementById('why-us-grid');
  if (!grid || !whyUsData) return;

  grid.innerHTML = whyUsData.slice(0, 4).map((item, idx) => `
    <div class="why-card" data-aos="fade-up" data-aos-delay="${idx * 100}">
      <div class="why-icon">
        <i class="fas fa-${item.icon}"></i>
      </div>
      <div class="why-content">
        <h4>${item.title}</h4>
        <p>${item.description}</p>
      </div>
    </div>
  `).join('');

  if (window.AOS) {
    AOS.refresh();
  }
}


/* ----------------------------------------------------------
   UTILITY: Map category ID to icon class
   Used in featured attractions badges
   ---------------------------------------------------------- */
function getCategoryIcon(categoryId) {
  const iconMap = {
    'parks':    'tree',
    'lakes':    'water',
    'mountains': 'mountain',
    'culture':  'drum',
    'wildlife': 'paw',
    'adventure': 'hiking',
  };
  return iconMap[categoryId] || 'globe-africa';
}


/* ----------------------------------------------------------
   UTILITY: Map category ID to display label
   User-friendly category names
   ---------------------------------------------------------- */
function getCategoryLabel(categoryId) {
  const labelMap = {
    'parks':    'National Parks',
    'lakes':    'Lakes',
    'mountains': 'Mountains',
    'culture':  'Culture',
    'wildlife': 'Wildlife',
    'adventure': 'Adventure',
  };
  return labelMap[categoryId] || 'Destination';
}


/* ----------------------------------------------------------
   LOAD HOME PAGE DATA
   Fetches data.json and renders all home sections.
   Wrapped in try/catch so a network error doesn't silently break the page.
   ---------------------------------------------------------- */
async function loadHomeData() {
  try {
    let data;
    let attractions;

    if (window.PearlImageResolver?.loadAttractionsWithLocalImages) {
      const resolved = await window.PearlImageResolver.loadAttractionsWithLocalImages();
      data = resolved.data;
      attractions = resolved.attractions;
    } else {
      const response = await fetch('./js/data.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      data = await response.json();
      attractions = data.attractions;
    }

    // Render each section with its slice of data
    renderFeaturedAttractions(attractions);
    renderWhyUs(data.why_us);

    // Hide preloader once content is loaded
    if (typeof hidePreloader === 'function') {
      hidePreloader();
    }

  } catch (err) {
    console.error('Pearl Safari: Failed to load data.json →', err);
    // Show graceful error in featured grid
    const grid = document.getElementById('featured-grid');
    if (grid) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:3rem;">
          <i class="fas fa-exclamation-circle" style="font-size:2rem;color:var(--color-text-light);"></i>
          <p style="margin-top:1rem;color:var(--color-text-muted);">
            Destinations could not be loaded. Please refresh the page.
          </p>
        </div>`;
    }
    
    // Hide preloader even on error so user can see content
    if (typeof hidePreloader === 'function') {
      hidePreloader();
    }
  }
}

/* ----------------------------------------------------------
   DOM READY
   ---------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', loadHomeData);
