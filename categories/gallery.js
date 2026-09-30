/**
 * gallery.js
 * ============================================================
 * Pearl Safari — Gallery Page (gallery.html) Logic
 *
 * Aggregates every destination's photos + videos into one
 * filterable page. Reuses the same .gallery-item / .video-item
 * markup (and the shared lightbox in animations.js) as the
 * per-destination galleries on attraction.html.
 * ============================================================ */

let galleryAttractions = [];

/* ----------------------------------------------------------
   VIDEO POSTER HELPER
   Same approach as attraction.js: ask Cloudinary for a still
   frame of the video by requesting the same public ID as .jpg.
   ---------------------------------------------------------- */
function galleryVideoPosterUrl(videoUrl) {
  const withOffset = videoUrl.includes('/upload/so_')
    ? videoUrl
    : videoUrl.replace('/upload/', '/upload/so_1/');
  return withOffset.replace(/\.(mp4|mov|webm)(\?.*)?$/i, '.jpg$2');
}


/* ----------------------------------------------------------
   RENDER FILTER PILLS
   "All Destinations" + one pill per attraction that has images.
   ---------------------------------------------------------- */
function renderGalleryFilters(attractions) {
  const wrap = document.getElementById('gallery-filter-wrap');
  if (!wrap) return;

  const pills = [{ id: 'all', label: 'All Destinations' }]
    .concat(attractions.map(a => ({ id: a.id, label: a.name })));

  wrap.innerHTML = pills.map((p, i) => `
    <button
      class="filter-btn ${i === 0 ? 'active' : ''}"
      data-filter="${p.id}"
      aria-pressed="${i === 0}"
    >
      ${p.label}
    </button>
  `).join('');

  wrap.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      wrap.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      renderGalleryGrids(btn.getAttribute('data-filter'));
    });
  });
}


/* ----------------------------------------------------------
   RENDER PHOTO + VIDEO GRIDS for the selected filter
   ---------------------------------------------------------- */
function renderGalleryGrids(filterId) {
  const photosGrid = document.getElementById('gallery-photos-grid');
  const videosSection = document.getElementById('gallery-videos-section');
  const videosGrid = document.getElementById('gallery-videos-grid');
  const emptyState = document.getElementById('gallery-empty-state');
  const heading = document.getElementById('gallery-photos-heading');
  if (!photosGrid) return;

  const showLabels = filterId === 'all';
  const selected = filterId === 'all'
    ? galleryAttractions
    : galleryAttractions.filter(a => a.id === filterId);

  if (heading) {
    heading.textContent = filterId === 'all'
      ? 'All Destinations'
      : (selected[0]?.name || 'All Destinations');
  }

  const photoTiles = [];
  selected.forEach(a => {
    (a.images || []).forEach(src => {
      photoTiles.push(`
        <div class="gallery-item" role="button" tabindex="0" aria-label="View photo — ${a.name}">
          <img
            src="${src}"
            alt="${a.name} — photo"
            loading="lazy"
            onerror="this.parentElement.style.display='none'"
          >
          ${showLabels ? `<span class="gallery-item-label">${a.name}</span>` : ''}
        </div>
      `);
    });
  });
  photosGrid.innerHTML = photoTiles.join('');
  photosGrid.style.display = photoTiles.length ? '' : 'none';
  if (emptyState) emptyState.style.display = photoTiles.length ? 'none' : '';

  const videoTiles = [];
  selected.forEach(a => {
    (a.videos || []).forEach(src => {
      videoTiles.push(`
        <div class="gallery-item video-item" role="button" tabindex="0" aria-label="Play video — ${a.name}" data-video-src="${src}">
          <img
            src="${galleryVideoPosterUrl(src)}"
            alt="${a.name} — video"
            loading="lazy"
            onerror="this.style.display='none'"
          >
          <span class="video-play-icon"><i class="fas fa-play"></i></span>
          ${showLabels ? `<span class="gallery-item-label">${a.name}</span>` : ''}
        </div>
      `);
    });
  });

  if (videosSection && videosGrid) {
    if (videoTiles.length) {
      videosSection.style.display = '';
      videosGrid.innerHTML = videoTiles.join('');
    } else {
      videosSection.style.display = 'none';
      videosGrid.innerHTML = '';
    }
  }

  // (Re)wire the shared lightbox for the tiles we just injected
  if (typeof initLightbox === 'function') initLightbox();
  if (window.AOS) AOS.refresh();
}


/* ----------------------------------------------------------
   LOAD DATA AND KICK EVERYTHING OFF
   ---------------------------------------------------------- */
async function loadGalleryData() {
  try {
    let attractions;

    if (window.PearlImageResolver?.loadAttractionsWithLocalImages) {
      const resolved = await window.PearlImageResolver.loadAttractionsWithLocalImages();
      attractions = resolved.attractions;
    } else {
      const response = await fetch('./js/data.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      attractions = data.attractions;
    }

    galleryAttractions = (attractions || []).filter(a => a.images?.length);

    renderGalleryFilters(galleryAttractions);
    renderGalleryGrids('all');

    if (typeof hidePreloader === 'function') hidePreloader();
  } catch (err) {
    console.error('Gallery page: Failed to load data.json →', err);
    const grid = document.getElementById('gallery-photos-grid');
    if (grid) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:3rem;">
          <i class="fas fa-exclamation-circle" style="font-size:2rem;color:var(--color-text-light);"></i>
          <p style="margin-top:1rem;color:var(--color-text-muted);">
            Gallery could not be loaded. Please refresh the page.
          </p>
        </div>`;
    }
    if (typeof hidePreloader === 'function') hidePreloader();
  }
}

document.addEventListener('DOMContentLoaded', loadGalleryData);
