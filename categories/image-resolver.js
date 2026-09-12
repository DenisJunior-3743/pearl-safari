/**
 * image-resolver.js
 * Shared resolver that merges Cloudinary-hosted media (js/cloudinary-media.json)
 * into the attractions loaded from js/data.json, matching by attraction id.
 * Falls back to the images already present in data.json if Cloudinary media
 * is unavailable (e.g. sync script hasn't been run yet).
 */
(function () {
  async function loadCloudinaryMedia(mediaPath) {
    try {
      const response = await fetch(mediaPath);
      if (!response.ok) return {};
      return await response.json();
    } catch (err) {
      console.warn('Cloudinary media unavailable. Using data.json images.', err);
      return {};
    }
  }

  function mergeCloudinaryMediaIntoAttractions(attractions, mediaMap) {
    return attractions.map((attraction) => {
      const media = mediaMap[attraction.id];
      if (!media) return attraction;

      return {
        ...attraction,
        images: Array.isArray(media.images) && media.images.length ? media.images : attraction.images,
        heroImage: media.heroImage || attraction.heroImage,
        video: media.video !== undefined ? media.video : attraction.video,
      };
    });
  }

  async function loadAttractionsWithLocalImages(options = {}) {
    const dataPath = options.dataPath || './js/data.json';
    const mediaPath = options.mediaPath || './js/cloudinary-media.json';

    const [dataResponse, mediaMap] = await Promise.all([
      fetch(dataPath),
      loadCloudinaryMedia(mediaPath),
    ]);

    if (!dataResponse.ok) {
      throw new Error(`HTTP ${dataResponse.status}`);
    }

    const data = await dataResponse.json();
    const attractions = mergeCloudinaryMediaIntoAttractions(data.attractions || [], mediaMap);

    return { data, attractions, mediaMap };
  }

  window.PearlImageResolver = {
    loadAttractionsWithLocalImages,
    mergeCloudinaryMediaIntoAttractions,
  };
})();
