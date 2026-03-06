pearl-safari/
├── index.html          ← Home: hero slideshow, featured cards, map, testimonials
├── discover.html       ← Discover: filter bar, search, sortable grid
├── attraction.html     ← Detail: dynamic single-page for any attraction
├── about.html          ← About: story, team, values
├── contact.html        ← Contact: form with validation, office map
├── css/
│   └── style.css       ← 24-section design system (900+ lines, fully commented)
├── js/
│   ├── data.json       ← All 12 attractions, testimonials, stats, categories
│   ├── components.js   ← Navbar + footer injection (write once → every page)
│   ├── animations.js   ← AOS, counter rollup, parallax, tilt, lightbox, toast
│   ├── map.js          ← Leaflet interactive Uganda map with custom pins
│   ├── main.js         ← Home page rendering from data.json
│   ├── discover.js     ← Filter + search + sort + URL sync logic
│   └── attraction.js   ← Dynamic detail page (reads ?id= from URL)
└── assets/
    ├── images/         ← Drop your own photos here
    ├── logo/           ← favicon.svg included
    └── videos/         ← For local video files