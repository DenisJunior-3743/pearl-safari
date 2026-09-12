/**
 * attraction.js
 * ============================================================
 * Pearl Safari — Attraction Detail Page Logic
 *
 * This script powers attraction.html. It:
 *  1. Reads the attraction ?id= from the URL query string
 *  2. Fetches data.json and finds the matching attraction
 *  3. Dynamically populates EVERY section of the detail page:
 *       - Hero background + title + meta tags
 *       - Page <title> and <meta description>
 *       - Overview / description text
 *       - Highlights list
 *       - Photo gallery (with lightbox from animations.js)
 *       - Embedded YouTube video (if available)
 *       - Sticky booking sidebar (price, info, CTA)
 *       - Related attractions from same category
 *  4. Handles 404 case (no matching attraction found)
 * ============================================================
 */

let detailHeroSlideInterval = null;
const HERO_MIN_WIDTH = 1200;
const HERO_MIN_HEIGHT = 700;

function probeImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ src, width: img.naturalWidth || 0, height: img.naturalHeight || 0 });
    };
    img.onerror = () => resolve({ src, width: 0, height: 0 });
    img.src = src;
  });
}

async function buildHeroPlaylist(images) {
  const uniqueImages = [...new Set(images.filter(Boolean))];
  const probed = await Promise.all(uniqueImages.map(probeImage));
  const sorted = probed.sort((a, b) => (b.width * b.height) - (a.width * a.height));
  const preferred = sorted.filter(img => img.width >= HERO_MIN_WIDTH && img.height >= HERO_MIN_HEIGHT);
  const chosen = preferred.length ? preferred : sorted;

  return {
    playlist: chosen.map(img => img.src),
    topImage: chosen[0] || null,
  };
}


/* ----------------------------------------------------------
   READ ATTRACTION ID FROM URL
   attraction.html?id=bwindi → returns "bwindi"
   ---------------------------------------------------------- */
function getAttractionId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}


/* ----------------------------------------------------------
   POPULATE HERO SECTION
   Sets the background image, title, tagline, and meta tags
   in the full-width hero banner at the top.
   ---------------------------------------------------------- */
async function populateHero(attraction) {
  const hero = document.getElementById('detail-hero');
  const heroContent = document.getElementById('detail-hero-content');
  const heroImages = Array.isArray(attraction.images) && attraction.images.length
    ? attraction.images
    : [attraction.heroImage].filter(Boolean);

  // Set and cycle hero background images every 2 seconds with smooth crossfade.
  if (hero) {
    if (detailHeroSlideInterval) {
      clearInterval(detailHeroSlideInterval);
      detailHeroSlideInterval = null;
    }

    const { playlist, topImage } = await buildHeroPlaylist(heroImages);
    const firstImage = (playlist[0] || attraction.heroImage || heroImages[0]);
    const isLowRes = !topImage || topImage.width < HERO_MIN_WIDTH || topImage.height < HERO_MIN_HEIGHT;
    hero.classList.toggle('detail-hero-lowres', isLowRes);

    // Clear any old inline background and slide layers (e.g. page re-init)
    hero.style.backgroundImage = '';
    hero.querySelectorAll('.detail-hero-slide').forEach(el => el.remove());

    // Create two stacked slide layers for CSS opacity crossfade.
    // Layer A = currently visible; Layer B = preloaded next image.
    const overlay = hero.querySelector('.detail-hero-overlay');
    const layerA = document.createElement('div');
    const layerB = document.createElement('div');
    layerA.className = 'detail-hero-slide active';
    layerB.className = 'detail-hero-slide';
    layerA.style.backgroundImage = `url('${firstImage}')`;
    layerB.style.backgroundImage = `url('${playlist[1] || firstImage}')`;
    // Insert both before the overlay so it draws above them
    hero.insertBefore(layerB, overlay);
    hero.insertBefore(layerA, overlay);

    if (playlist.length > 1) {
      let currentIndex = 0;
      detailHeroSlideInterval = setInterval(() => {
        const nextIndex = (currentIndex + 1) % playlist.length;
        const nextNextIndex = (nextIndex + 1) % playlist.length;
        const activeEl = hero.querySelector('.detail-hero-slide.active');
        const inactiveEl = hero.querySelector('.detail-hero-slide:not(.active)');
        // Fade in the preloaded layer (it gets z-index:1 via .active CSS)
        inactiveEl.classList.add('active');
        activeEl.classList.remove('active');
        // After the 0.8s transition completes, silently update the now-hidden layer
        //  with the image after next so it's ready for the following swap.
        setTimeout(() => {
          activeEl.style.backgroundImage = `url('${playlist[nextNextIndex]}')`;
        }, 850);
        currentIndex = nextIndex;
      }, 2000);
    }
  }

  // Build star rating string
  const stars = Array.from({ length: Math.floor(attraction.rating) })
    .map(() => '★').join('') + ` ${attraction.rating}`;

  if (heroContent) {
    heroContent.innerHTML = `
      <!-- Category + region breadcrumb pill -->
      <div style="margin-bottom:1rem;">
        <span style="
          display:inline-flex;align-items:center;gap:6px;
          background:rgba(255,255,255,0.15);backdrop-filter:blur(8px);
          border:1px solid rgba(255,255,255,0.2);color:white;
          padding:4px 14px;border-radius:9999px;
          font-family:var(--font-accent);font-size:0.7rem;font-weight:600;
          text-transform:uppercase;letter-spacing:0.1em;
        ">
          <i class="fas fa-map-marker-alt" style="color:var(--color-accent);"></i>
          ${attraction.region}
        </span>
      </div>

      <!-- Main title -->
      <h1>${attraction.name}</h1>

      <!-- Tagline -->
      <div class="tagline">${attraction.tagline}</div>

      <!-- Meta pills row -->
      <div class="detail-meta-row">
        <div class="detail-meta-tag">
          <i class="fas fa-star" style="color:var(--color-accent);"></i>
          ${stars} Rating
        </div>
        <div class="detail-meta-tag">
          <i class="fas fa-clock"></i>
          ${attraction.duration}
        </div>
        <div class="detail-meta-tag">
          <i class="fas fa-calendar-alt"></i>
          Best: ${attraction.bestTime}
        </div>
        <div class="detail-meta-tag">
          <i class="fas fa-tag"></i>
          ${attraction.price}
        </div>
      </div>
    `;
  }

  // Update browser tab title and meta description
  document.title = `${attraction.name} | Pearl Safari Uganda`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', attraction.shortDesc);
}


/* ----------------------------------------------------------
   POPULATE OVERVIEW
   The main descriptive text + section heading.
   ---------------------------------------------------------- */
function populateOverview(attraction) {
  const el = document.getElementById('detail-overview');
  if (!el) return;

  el.innerHTML = `
    <span class="section-label">About This Destination</span>
    <h2 style="font-size:var(--fs-2xl);margin:0.75rem 0 1rem;">${attraction.name}</h2>
    <div class="divider divider-left"></div>
    <p style="font-size:var(--fs-md);line-height:1.8;color:var(--color-text-muted);margin-bottom:1.5rem;">
      ${attraction.fullDesc}
    </p>
  `;

  // Also set the breadcrumb name
  const breadcrumb = document.getElementById('breadcrumb-name');
  if (breadcrumb) breadcrumb.textContent = attraction.name;
}


/* ----------------------------------------------------------
   POPULATE HIGHLIGHTS
   Bullet-point list of the main things to do/see.
   ---------------------------------------------------------- */
function populateHighlights(attraction) {
  const el = document.getElementById('detail-highlights');
  if (!el || !attraction.highlights?.length) return;

  const items = attraction.highlights.map(h => `
    <div class="highlight-item">
      <i class="fas fa-check-circle" style="color:var(--color-primary);font-size:1rem;flex-shrink:0;"></i>
      ${h}
    </div>
  `).join('');

  el.innerHTML = `
    <h3 style="font-size:var(--fs-xl);margin-bottom:1rem;">
      <i class="fas fa-binoculars" style="color:var(--color-primary);margin-right:0.5rem;"></i>
      Highlights
    </h3>
    <div class="highlights-list">${items}</div>
    <div style="height:2rem;"></div>
  `;
}


/* ----------------------------------------------------------
   POPULATE GALLERY
   Grid of images with lightbox (lightbox logic in animations.js).
   ---------------------------------------------------------- */
function populateGallery(attraction) {
  const el = document.getElementById('detail-gallery');
  if (!el || !attraction.images?.length) return;

  const galleryItems = attraction.images.map((src, i) => `
    <div class="gallery-item" role="button" tabindex="0" aria-label="View photo ${i + 1}">
      <img
        src="${src}"
        alt="${attraction.name} — photo ${i + 1}"
        loading="lazy"
        onerror="this.parentElement.style.display='none'"
      >
    </div>
  `).join('');

  el.innerHTML = `
    <h3 style="font-size:var(--fs-xl);margin-bottom:1rem;">
      <i class="fas fa-images" style="color:var(--color-primary);margin-right:0.5rem;"></i>
      Photo Gallery
    </h3>
    <div class="gallery-grid">${galleryItems}</div>
    <div style="height:2.5rem;"></div>
  `;

  // Re-run lightbox init so it picks up these newly added images
  if (typeof initLightbox === 'function') initLightbox();
}


/* ----------------------------------------------------------
   POPULATE VIDEO
   Embeds YouTube video in a responsive 16:9 wrapper.
   Shows nothing if no video URL provided.
   ---------------------------------------------------------- */
function populateVideo(attraction) {
  const el = document.getElementById('detail-video');
  if (!el || !attraction.video) return;

  el.innerHTML = `
    <h3 style="font-size:var(--fs-xl);margin-bottom:1rem;">
      <i class="fas fa-play-circle" style="color:var(--color-primary);margin-right:0.5rem;"></i>
      Video
    </h3>
    <div style="
      position:relative;padding-bottom:56.25%;height:0;overflow:hidden;
      border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);
    ">
      <iframe
        src="${attraction.video}"
        title="${attraction.name} video"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
        loading="lazy"
        style="position:absolute;top:0;left:0;width:100%;height:100%;border-radius:var(--radius-lg);"
      ></iframe>
    </div>
    <div style="height:2.5rem;"></div>
  `;
}


/* ----------------------------------------------------------
   POPULATE SIDEBAR
   Sticky booking/info card on the right side.
   ---------------------------------------------------------- */
function populateSidebar(attraction) {
  const el = document.getElementById('detail-sidebar');
  if (!el) return;

  el.innerHTML = `
    <div class="detail-sidebar-card">

      <!-- Price -->
      <div class="detail-sidebar-price">
        ${attraction.price}
        <span>/ per person</span>
      </div>

      <!-- Info table -->
      <div class="detail-info-list">
        <div class="detail-info-item">
          <span class="detail-info-label">
            <i class="fas fa-map-marker-alt"></i> Location
          </span>
          <span class="detail-info-value">${attraction.region}</span>
        </div>
        <div class="detail-info-item">
          <span class="detail-info-label">
            <i class="fas fa-clock"></i> Duration
          </span>
          <span class="detail-info-value">${attraction.duration}</span>
        </div>
        <div class="detail-info-item">
          <span class="detail-info-label">
            <i class="fas fa-calendar-alt"></i> Best Time
          </span>
          <span class="detail-info-value">${attraction.bestTime}</span>
        </div>
        <div class="detail-info-item">
          <span class="detail-info-label">
            <i class="fas fa-star"></i> Rating
          </span>
          <span class="detail-info-value" style="color:var(--color-accent);">
            ${attraction.rating} / 5.0
          </span>
        </div>
        <div class="detail-info-item">
          <span class="detail-info-label">
            <i class="fas fa-tags"></i> Category
          </span>
          <span class="detail-info-value">${attraction.category.join(', ')}</span>
        </div>
      </div>

      <!-- Book CTA -->
      <a
        href="contact.html?attraction=${attraction.id}"
        class="btn btn-primary"
        style="width:100%;justify-content:center;margin-bottom:0.75rem;"
      >
        <i class="fas fa-calendar-check"></i>
        Book This Trip
      </a>

      <!-- WhatsApp quick contact -->
      <a
        href="https://wa.me/256773162370?text=Hi%20Pearl%20Safari%2C%20I'm%20interested%20in%20visiting%20${encodeURIComponent(attraction.name)}!"
        class="btn btn-outline-dark"
        style="width:100%;justify-content:center;"
        target="_blank"
        rel="noopener noreferrer"
      >
        <i class="fab fa-whatsapp" style="color:#25D366;"></i>
        Chat on WhatsApp
      </a>

      <!-- Share buttons -->
      <div style="margin-top:1.5rem;padding-top:1.5rem;border-top:1px solid var(--color-border);">
        <p style="font-family:var(--font-accent);font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--color-text-light);margin-bottom:0.75rem;">
          Share This Destination
        </p>
        <div style="display:flex;gap:0.5rem;">
          <button onclick="shareDestination('facebook')" class="social-btn" style="background:var(--color-surface);">
            <i class="fab fa-facebook-f" style="color:#1877F2;"></i>
          </button>
          <button onclick="shareDestination('twitter')" class="social-btn" style="background:var(--color-surface);">
            <i class="fab fa-twitter" style="color:#1DA1F2;"></i>
          </button>
          <button onclick="shareDestination('whatsapp')" class="social-btn" style="background:var(--color-surface);">
            <i class="fab fa-whatsapp" style="color:#25D366;"></i>
          </button>
          <button onclick="copyLink()" class="social-btn" style="background:var(--color-surface);" id="copy-link-btn">
            <i class="fas fa-link" style="color:var(--color-text-muted);"></i>
          </button>
        </div>
      </div>

    </div><!-- /.detail-sidebar-card -->
  `;
}


/* ----------------------------------------------------------
   POPULATE RELATED ATTRACTIONS
   Shows 3 other attractions from the same primary category.
   ---------------------------------------------------------- */
function populateRelated(attraction, allAttractions) {
  const el = document.getElementById('detail-related');
  if (!el) return;

  const primaryCategory = attraction.category[0];

  // Get up to 3 related attractions (same category, excluding current)
  const related = allAttractions
    .filter(a => a.id !== attraction.id && a.category.includes(primaryCategory))
    .slice(0, 3);

  if (!related.length) return;

  const cards = related.map(a => `
    <div
      class="attraction-card"
      onclick="window.location.href='attraction.html?id=${a.id}'"
      style="cursor:pointer;"
    >
      <div class="card-img-wrap" style="height:180px;">
        <img src="${a.images[0]}" alt="${a.name}" loading="lazy">
        <div class="card-img-overlay"></div>
      </div>
      <div class="card-body">
        <div class="card-tagline">${a.tagline}</div>
        <h4 class="card-title" style="font-size:1rem;">${a.name}</h4>
        <div class="card-footer">
          <span class="card-price">${a.price}</span>
          <span class="card-cta">Explore <i class="fas fa-arrow-right"></i></span>
        </div>
      </div>
    </div>
  `).join('');

  el.innerHTML = `
    <div style="margin-top:3rem;padding-top:3rem;border-top:1px solid var(--color-border);">
      <h3 style="font-size:var(--fs-xl);margin-bottom:1.5rem;">
        <i class="fas fa-compass" style="color:var(--color-primary);margin-right:0.5rem;"></i>
        You Might Also Like
      </h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1.5rem;">
        ${cards}
      </div>
    </div>
  `;
}


/* ----------------------------------------------------------
   SHARE UTILITIES
   ---------------------------------------------------------- */
function shareDestination(platform) {
  const url   = encodeURIComponent(window.location.href);
  const title = encodeURIComponent(document.title);

  const urls = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    twitter:  `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
    whatsapp: `https://wa.me/?text=${title}%20${url}`,
  };

  if (urls[platform]) {
    window.open(urls[platform], '_blank', 'width=600,height=400');
  }
}

function copyLink() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    if (typeof showToast === 'function') {
      showToast('Link copied to clipboard!', 'success');
    }
    // Briefly change icon to checkmark
    const btn = document.getElementById('copy-link-btn');
    if (btn) {
      btn.innerHTML = '<i class="fas fa-check" style="color:var(--color-primary);"></i>';
      setTimeout(() => {
        btn.innerHTML = '<i class="fas fa-link" style="color:var(--color-text-muted);"></i>';
      }, 2000);
    }
  });
}

// Expose globally
window.shareDestination = shareDestination;
window.copyLink         = copyLink;


/* ----------------------------------------------------------
   SHOW 404 STATE
   When the ?id is missing or doesn't match any attraction.
   ---------------------------------------------------------- */
function show404() {
  document.body.innerHTML = `
    <div style="
      min-height:100vh;display:flex;flex-direction:column;
      align-items:center;justify-content:center;text-align:center;
      padding:2rem;background:var(--color-surface);
      font-family:'Lato',sans-serif;
    ">
      <i class="fas fa-map-marked-alt" style="font-size:4rem;color:var(--color-border);margin-bottom:1.5rem;"></i>
      <h1 style="font-family:'Playfair Display',serif;color:var(--color-dark);margin-bottom:0.75rem;">
        Destination Not Found
      </h1>
      <p style="color:var(--color-text-muted);max-width:400px;margin-bottom:2rem;">
        The attraction you're looking for doesn't exist or the link may be incorrect.
      </p>
      <a href="discover.html" style="
        display:inline-flex;align-items:center;gap:0.5rem;
        background:var(--color-primary);color:white;
        padding:0.875rem 2rem;border-radius:9999px;
        font-family:Montserrat,sans-serif;font-size:0.875rem;font-weight:600;
        text-transform:uppercase;letter-spacing:0.04em;
        text-decoration:none;
      ">
        <i class="fas fa-compass"></i>
        Browse All Destinations
      </a>
    </div>
  `;
}


/* ----------------------------------------------------------
   MAIN INIT
   ---------------------------------------------------------- */
async function initAttractionPage() {
  const id = getAttractionId();

  if (!id) {
    show404();
    return;
  }

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

    // Find the attraction by id
    const attraction = attractions.find(a => a.id === id);

    if (!attraction) {
      show404();
      return;
    }

    // Populate all page sections
    await populateHero(attraction);
    populateOverview(attraction);
    populateHighlights(attraction);
    populateGallery(attraction);
    populateVideo(attraction);
    populateSidebar(attraction);
    populateRelated(attraction, attractions);

    // Refresh AOS after all content injected
    if (typeof AOS !== 'undefined') {
      setTimeout(() => AOS.refresh(), 200);
    }
    
    // Hide preloader once content is loaded
    if (typeof hidePreloader === 'function') {
      hidePreloader();
    }

  } catch (err) {
    console.error('Attraction page error:', err);
    show404();
    
    // Hide preloader even on error
    if (typeof hidePreloader === 'function') {
      hidePreloader();
    }
  }
}

document.addEventListener('DOMContentLoaded', initAttractionPage);
window.addEventListener('beforeunload', () => {
  if (detailHeroSlideInterval) {
    clearInterval(detailHeroSlideInterval);
  }
});
