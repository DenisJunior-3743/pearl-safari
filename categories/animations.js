/**
 * animations.js
 * ============================================================
 * Pearl Safari — Scroll Animations & Visual Effects
 *
 * This module handles ALL animation behaviour across the site:
 *
 *  1. AOS (Animate on Scroll) — initializes the library that
 *     fades/slides elements in as you scroll down the page.
 *
 *  2. Stat Counter Animation — counts up numbers (850+ tourists,
 *     24+ destinations etc.) when they scroll into view.
 *
 *  3. Parallax — subtle vertical shift on hero images as you
 *     scroll, giving a depth/3D feel.
 *
 *  4. Card Tilt — very subtle 3D tilt on attraction cards when
 *     you hover, making them feel interactive and premium.
 *
 *  5. Scroll Progress Bar — thin green bar at the top of the
 *     page showing how far down you've scrolled.
 *
 *  6. Smooth Reveal — manual fallback for browsers without
 *     AOS support.
 *
 * All animations are performance-conscious:
 *  - Use CSS transforms (GPU-accelerated) not layout properties
 *  - Use requestAnimationFrame for smooth loops
 *  - Use IntersectionObserver instead of scroll listeners
 *    wherever possible
 * ============================================================
 */


/* ==========================================================
   1. INITIALIZE AOS (Animate on Scroll)
   AOS adds data-aos attributes to HTML elements like:
     <div data-aos="fade-up">
     <div data-aos="fade-right" data-aos-delay="200">
   This function configures the global AOS settings.
   ========================================================== */
function initAOS() {
  // Guard: only run if AOS library is loaded
  if (typeof AOS === 'undefined') {
    console.warn('AOS library not loaded. Skipping AOS init.');
    return;
  }

  AOS.init({
    duration:   800,    // Animation duration in ms
    easing:     'ease-out-cubic', // Easing curve
    once:       true,   // Only animate once per element (not on scroll back up)
    offset:     80,     // Trigger animation 80px before element enters viewport
    delay:      0,      // Default delay (can be overridden per-element)
    mirror:     false,  // Don't re-animate when scrolling back
    anchorPlacement: 'top-bottom', // Trigger when top of element hits bottom of viewport
  });
}


/* ==========================================================
   2. STAT COUNTER ANIMATION
   Finds all elements with [data-counter] attribute and
   animates them counting up from 0 to their target value.

   HTML usage:
     <span class="stat-value" data-counter="850">0</span>

   The IntersectionObserver fires the animation ONCE when the
   element scrolls into view — never replays.
   ========================================================== */
function initCounters() {
  // Select all elements marked as counters
  const counterEls = document.querySelectorAll('[data-counter]');
  if (!counterEls.length) return;

  /**
   * animateCounter(el)
   * Smoothly increments el's text content from 0 to its
   * data-counter value over ~1.5 seconds using easeOutQuad.
   */
  function animateCounter(el) {
    const target   = parseInt(el.getAttribute('data-counter'), 10);
    const suffix   = el.getAttribute('data-suffix') || '';
    const duration = 1500; // ms total animation time
    const start    = performance.now();

    function easeOutQuad(t) {
      // Starts fast, decelerates toward the end — feels natural
      return t * (2 - t);
    }

    function step(now) {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1); // 0 → 1
      const eased    = easeOutQuad(progress);
      const current  = Math.floor(eased * target);

      el.textContent = current.toLocaleString() + suffix;

      if (progress < 1) {
        requestAnimationFrame(step); // Keep going until progress = 1
      } else {
        el.textContent = target.toLocaleString() + suffix; // Snap to final value
      }
    }

    requestAnimationFrame(step);
  }

  // Use IntersectionObserver to trigger counter ONCE when visible
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target); // Only fire once
      }
    });
  }, { threshold: 0.5 }); // Trigger when 50% of element is visible

  counterEls.forEach(el => observer.observe(el));
}


/* ==========================================================
   3. HERO PARALLAX
   As the user scrolls down, the hero background image moves
   upward at a slower rate (0.4x) creating a depth illusion.
   This is a classic parallax effect.

   IMPORTANT: We use `transform: translateY()` (GPU layer)
   NOT `background-position` changes (causes repaints).
   ========================================================== */
function initParallax() {
  const heroSlides = document.querySelectorAll('.hero-slide');
  if (!heroSlides.length) return;

  let ticking = false; // Throttle flag to avoid duplicate rAF calls

  function updateParallax() {
    const scrolled = window.scrollY;
    const rate     = 0.4; // Parallax speed: 0 = fixed, 1 = normal scroll speed

    heroSlides.forEach(slide => {
      // Only move active/visible slide for performance
      slide.style.transform = `scale(1.05) translateY(${scrolled * rate}px)`;
    });

    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(updateParallax);
      ticking = true; // Prevent queuing multiple rAF calls per scroll event
    }
  }, { passive: true }); // passive: true = browser can scroll without waiting for JS
}


/* ==========================================================
   4. CARD 3D TILT EFFECT
   When hovering over an attraction card, it tilts slightly
   in 3D toward the mouse cursor position. Subtle, premium.

   Math:
   - Get mouse X/Y relative to card center
   - Normalize to -1 → +1
   - Apply as rotateX/rotateY (max 8 degrees)
   ========================================================== */
function initCardTilt() {
  const cards = document.querySelectorAll('.attraction-card');
  if (!cards.length) return;

  const MAX_TILT = 6; // Maximum tilt in degrees (keep subtle)

  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect    = card.getBoundingClientRect();
      const centerX = rect.left + rect.width  / 2;
      const centerY = rect.top  + rect.height / 2;

      // Normalized mouse position relative to card center (-1 to 1)
      const normX = (e.clientX - centerX) / (rect.width  / 2);
      const normY = (e.clientY - centerY) / (rect.height / 2);

      // Invert Y so moving mouse up tilts the top toward you
      const rotateX = -normY * MAX_TILT;
      const rotateY =  normX * MAX_TILT;

      card.style.transform = `
        translateY(-8px)
        rotateX(${rotateX}deg)
        rotateY(${rotateY}deg)
        scale(1.02)
      `;
      card.style.transition = 'transform 0.1s ease'; // Fast during movement
    });

    card.addEventListener('mouseleave', () => {
      // Smoothly reset to flat when mouse leaves
      card.style.transform = '';
      card.style.transition = 'transform 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    });
  });
}


/* ==========================================================
   5. SCROLL PROGRESS BAR
   A thin green bar at the very top of the page (position:fixed)
   that fills from left to right as the user scrolls down,
   showing reading/browsing progress.
   ========================================================== */
function initScrollProgressBar() {
  // Create the bar element
  const bar = document.createElement('div');
  bar.id = 'scroll-progress-bar';
  bar.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    height: 3px;
    width: 0%;
    background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
    z-index: 9999;
    transition: width 0.1s ease;
    pointer-events: none;
  `;
  document.body.appendChild(bar);

  // Update width on scroll
  function updateProgress() {
    const scrollTop    = window.scrollY || document.documentElement.scrollTop;
    const docHeight    = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = scrollPercent + '%';
  }

  window.addEventListener('scroll', updateProgress, { passive: true });
}


/* ==========================================================
   6. HERO SLIDESHOW
   Automatically cycles through hero background images
   every 5 seconds with a smooth cross-fade transition.

   Dots at the bottom of the hero update to match the
   current slide, and are also clickable.
   ========================================================== */
function initHeroSlideshow() {
  const slides   = document.querySelectorAll('.hero-slide');
  const dots     = document.querySelectorAll('.hero-dot');
  if (slides.length < 2) return; // Only run if multiple slides exist

  let currentIndex = 0;
  let autoplayTimer;

  /**
   * goToSlide(index)
   * Activates a specific slide and updates dot indicators.
   */
  function goToSlide(index) {
    // Remove active from current
    slides[currentIndex].classList.remove('active');
    dots[currentIndex]?.classList.remove('active');

    // Update index (wrap around)
    currentIndex = (index + slides.length) % slides.length;

    // Activate new slide
    slides[currentIndex].classList.add('active');
    dots[currentIndex]?.classList.add('active');
  }

  /**
   * nextSlide()
   * Advances to the next slide. Called by the auto-timer.
   */
  function nextSlide() {
    goToSlide(currentIndex + 1);
  }

  // Start autoplay — change slide every 5 seconds
  function startAutoplay() {
    autoplayTimer = setInterval(nextSlide, 5000);
  }

  function stopAutoplay() {
    clearInterval(autoplayTimer);
  }

  // Wire up dot click handlers
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      stopAutoplay(); // Pause auto-advance when user manually clicks
      goToSlide(i);
      startAutoplay(); // Restart timer from this point
    });
  });

  // Pause on hover (good UX — user might be reading the title)
  const heroEl = document.querySelector('.hero');
  if (heroEl) {
    heroEl.addEventListener('mouseenter', stopAutoplay);
    heroEl.addEventListener('mouseleave', startAutoplay);
  }

  startAutoplay();
}


/* ==========================================================
   7. SMOOTH SCROLL for internal anchor links (#section)
   Overrides the browser's instant jump with a smooth scroll.
   Accounts for the fixed navbar height offset.
   ========================================================== */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href').slice(1);
      const target   = document.getElementById(targetId);
      if (!target) return;

      e.preventDefault();

      const navbarHeight = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--navbar-height'),
        10
      ) || 72;

      const targetPosition = target.getBoundingClientRect().top + window.scrollY - navbarHeight - 20;

      window.scrollTo({
        top:      targetPosition,
        behavior: 'smooth'
      });
    });
  });
}


/* ==========================================================
   8. LIGHTBOX for gallery images
   When a gallery image is clicked, it opens a full-screen
   lightbox overlay with the image. Closes on click or Escape.
   ========================================================== */
function initLightbox() {
  const galleryItems = document.querySelectorAll('.gallery-item img');
  if (!galleryItems.length) return;

  // Create lightbox DOM
  const lightbox = document.createElement('div');
  lightbox.className = 'lightbox';
  lightbox.innerHTML = `
    <button class="lightbox-close" aria-label="Close">
      <i class="fas fa-times"></i>
    </button>
    <img src="" alt="Gallery image" id="lightbox-img">
  `;
  document.body.appendChild(lightbox);

  const lightboxImg = lightbox.querySelector('#lightbox-img');

  function openLightbox(src, alt) {
    lightboxImg.src = src;
    lightboxImg.alt = alt || '';
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden'; // Prevent background scroll
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }

  // Open on image click
  galleryItems.forEach(img => {
    img.parentElement.addEventListener('click', () => {
      openLightbox(img.src, img.alt);
    });
  });

  // Close on lightbox background click
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  // Close on X button
  lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox);

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });
}


/* ==========================================================
   9. TOAST NOTIFICATION
   Utility function used by other modules to show brief
   feedback messages (e.g. "Form submitted!", "Copied!")
   without blocking the UI with an alert().
   ========================================================== */
function showToast(message, type = 'success', duration = 3500) {
  // Remove any existing toast first
  const existing = document.getElementById('ps-toast');
  if (existing) existing.remove();

  const iconMap = {
    success: 'fas fa-check-circle',
    error:   'fas fa-exclamation-circle',
    info:    'fas fa-info-circle',
  };

  const colorMap = {
    success: 'var(--color-primary)',
    error:   '#c62828',
    info:    '#1565c0',
  };

  const toast = document.createElement('div');
  toast.id = 'ps-toast';
  toast.style.cssText = `
    position: fixed;
    bottom: 5rem;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    background: ${colorMap[type]};
    color: white;
    padding: 0.875rem 1.5rem;
    border-radius: 9999px;
    font-family: var(--font-accent);
    font-size: 0.875rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    z-index: 5000;
    opacity: 0;
    transition: opacity 0.3s ease, transform 0.3s ease;
    white-space: nowrap;
  `;
  toast.innerHTML = `<i class="${iconMap[type]}"></i> ${message}`;
  document.body.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });

  // Auto-dismiss
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
    setTimeout(() => toast.remove(), 350);
  }, duration);
}

// Expose showToast globally so other modules can use it
window.showToast = showToast;


/* ==========================================================
   INITIALIZE ALL ANIMATIONS
   Called once the DOM is ready. The order matters:
   - AOS first (so it registers before elements render)
   - Then lightweight observers and listeners
   ========================================================== */
/* ==========================================================
   HIDE PRELOADER
   Hide after resources load, or after max 5 seconds timeout
   ========================================================== */
function hidePreloader() {
  const preloader = document.getElementById('preloader');
  if (!preloader) return;
  
  // Only hide if not already hidden
  if (!preloader.classList.contains('hidden')) {
    preloader.classList.add('hidden');
    setTimeout(() => {
      if (preloader.parentElement) {
        preloader.remove();
      }
    }, 500);
  }
}

/* ==========================================================
   LOGO INTERACTIONS
   Fancy click and hover effects for the circular logo
   ========================================================== */
function initLogoInteractions() {
  const logoContainer = document.getElementById('nav-logo-container');
  if (!logoContainer) return;

  // Create ripple effect on click
  logoContainer.addEventListener('click', (e) => {
    const ripple = document.createElement('span');
    ripple.style.position = 'absolute';
    ripple.style.pointerEvents = 'none';
    ripple.style.borderRadius = '50%';
    ripple.style.background = 'radial-gradient(circle, rgba(255,152,0,0.6), transparent)';
    ripple.style.transform = 'scale(0)';
    ripple.style.animation = 'logoRipple 0.6s ease-out';
    
    const rect = logoContainer.getBoundingClientRect();
    ripple.style.width = '200px';
    ripple.style.height = '200px';
    ripple.style.left = (e.clientX - rect.left - 100) + 'px';
    ripple.style.top = (e.clientY - rect.top - 100) + 'px';
    
    logoContainer.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });

  // Add glow effect on hover
  logoContainer.addEventListener('mouseenter', function() {
    const logoCircle = this.querySelector('.nav-logo-circle');
    if (logoCircle) {
      logoCircle.style.boxShadow = '0 0 40px rgba(43, 125, 50, 0.6), 0 0 80px rgba(255, 152, 0, 0.3), inset 0 1px 2px rgba(255,255,255,0.3)';
    }
  });

  logoContainer.addEventListener('mouseleave', function() {
    const logoCircle = this.querySelector('.nav-logo-circle');
    if (logoCircle) {
      logoCircle.style.boxShadow = '0 0 20px rgba(43, 125, 50, 0.3), inset 0 1px 2px rgba(255,255,255,0.2)';
    }
  });
}

/* ==========================================================
   FANCY CARD INTERACTIONS
   Enhanced hover tracking and animations
   ========================================================== */
function initFancyCardEffects() {
  const cards = document.querySelectorAll('.attraction-card');
  
  cards.forEach(card => {
    // Track mouse movement for tilt effect
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = (y - centerY) / 10;
      const rotateY = -(x - centerX) / 10;
      
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-16px) scale(1.02)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(-16px) scale(1.02)';
    });

    // Add click ripple effect
    card.addEventListener('click', (e) => {
      const ripple = document.createElement('div');
      ripple.style.position = 'absolute';
      ripple.style.pointerEvents = 'none';
      ripple.style.borderRadius = '50%';
      ripple.style.background = 'radial-gradient(circle, rgba(255,255,255,0.4), transparent)';
      ripple.style.animation = 'cardRipple 0.8s ease-out';
      
      const rect = card.getBoundingClientRect();
      const size = 300;
      ripple.style.width = size + 'px';
      ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size/2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size/2) + 'px';
      
      card.appendChild(ripple);
      setTimeout(() => ripple.remove(), 800);
    });
  });
}

/* ==========================================================
   BUTTON GLOW EFFECTS
   Dynamic glow on hover based on mouse position
   ========================================================== */
function initButtonGlowEffects() {
  const buttons = document.querySelectorAll('.btn');
  
  buttons.forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      btn.style.setProperty('--glow-x', x + 'px');
      btn.style.setProperty('--glow-y', y + 'px');
    });

    btn.addEventListener('mouseenter', function() {
      this.style.setProperty('--has-glow', '1');
    });

    btn.addEventListener('mouseleave', function() {
      this.style.setProperty('--has-glow', '0');
    });
  });
}

/* ==========================================================
   SMOOTH SCROLL-TRIGGERED ANIMATIONS
   ========================================================== */
function initScrollRevealAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);

  document.querySelectorAll('.section, .hero-content, .hero-badge').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
    observer.observe(el);
  });
}

// Add ripple animations to CSS dynamically
function addRippleAnimations() {
  if (document.getElementById('ripple-animations')) return;
  
  const style = document.createElement('style');
  style.id = 'ripple-animations';
  style.innerHTML = `
    @keyframes logoRipple {
      0% {
        transform: scale(0);
        opacity: 1;
      }
      100% {
        transform: scale(1);
        opacity: 0;
      }
    }
    
    @keyframes cardRipple {
      0% {
        transform: scale(0);
        opacity: 0.8;
      }
      100% {
        transform: scale(1);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}
  
// Hide preloader when page finishes loading
window.addEventListener('load', hidePreloader);

// Fallback: hide preloader after 5 seconds max (prevents infinite loading)
setTimeout(hidePreloader, 5000);

document.addEventListener('DOMContentLoaded', () => {
  addRippleAnimations();
  initAOS();
  initCounters();
  initParallax();
  initCardTilt();
  initScrollProgressBar();
  initHeroSlideshow();
  initSmoothScroll();
  initLightbox();
  initLogoInteractions();
  initFancyCardEffects();
  initButtonGlowEffects();
  initScrollRevealAnimations();
});
