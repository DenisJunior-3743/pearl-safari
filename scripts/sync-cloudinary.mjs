/**
 * sync-cloudinary.mjs
 * Uploads local park images/videos to Cloudinary and writes js/cloudinary-media.json,
 * the file categories/image-resolver.js merges into data.json at runtime.
 *
 * Usage:  node scripts/sync-cloudinary.mjs
 * Reads credentials from .env in the project root (CLOUDINARY_CLOUD_NAME,
 * CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).
 *
 * Local assets are deleted after each sync (see CLOUDINARY_SETUP.md), so any
 * park folder that doesn't exist locally at run time is left untouched in
 * js/cloudinary-media.json — its previously-synced images/videos are kept
 * rather than being wiped out.
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

async function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  const text = await readFile(envPath, 'utf8');
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return env;
}

async function loadExistingMedia() {
  try {
    const text = await readFile(path.join(ROOT, 'js', 'cloudinary-media.json'), 'utf8');
    return JSON.parse(text);
  } catch {
    return {};
  }
}

const env = await loadEnv();
const CLOUD_NAME = env.CLOUDINARY_CLOUD_NAME;
const API_KEY = env.CLOUDINARY_API_KEY;
const API_SECRET = env.CLOUDINARY_API_SECRET;

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  console.error('Missing Cloudinary credentials in .env (CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET).');
  process.exit(1);
}

// Attraction id -> local folder name (relative to assets/images/ and assets/videos/)
const PARK_FOLDERS = {
  'bwindi': 'bwindi',
  'queen-elizabeth': 'queen_elizabeth',
  'murchison-falls': 'murchison_falls',
  'kidepo': 'kidepoWild',
  'lake-bunyonyi': 'lake_bunyonyi',
  'rwenzori': 'rwenzori',
  'lake-mburo': 'lake_mburo',
  'mgahinga': 'mgahinga',
};

const GENERAL_IMAGE_FOLDER = 'general';
const SITE_HERO_VIDEO = 'uganda-safari-hero.mp4';

const IMAGE_TRANSFORM = 'f_auto,q_auto,dpr_auto';
const VIDEO_TRANSFORM = 'f_auto,q_auto';

function sign(params) {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return createHash('sha1').update(toSign + API_SECRET).digest('hex');
}

function withTransform(secureUrl, transform) {
  return secureUrl.replace('/upload/', `/upload/${transform}/`);
}

async function uploadFile(filePath, { folder, publicId, resourceType }) {
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = {
    timestamp,
    folder,
    public_id: publicId,
    overwrite: true,
  };
  const signature = sign(paramsToSign);

  const fileBuffer = await readFile(filePath);
  const form = new FormData();
  form.append('file', new Blob([fileBuffer]), path.basename(filePath));
  form.append('api_key', API_KEY);
  form.append('timestamp', String(timestamp));
  form.append('folder', folder);
  form.append('public_id', publicId);
  form.append('overwrite', 'true');
  form.append('signature', signature);

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;
  const res = await fetch(endpoint, { method: 'POST', body: form });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Upload failed for ${filePath}: ${json.error?.message || res.statusText}`);
  }
  return json.secure_url;
}

async function uploadImageFolder(folderName, preferredOrder = []) {
  const dir = path.join(ROOT, 'assets', 'images', folderName);
  let files;
  try {
    files = (await readdir(dir)).filter((f) => /\.(jpe?g|png|webp|avif|jfif)$/i.test(f));
  } catch {
    return null; // Local folder doesn't exist — caller should keep existing data.
  }
  if (!files.length) return null;

  if (preferredOrder.length) {
    const rank = new Map(preferredOrder.map((name, i) => [name, i]));
    files = files.slice().sort((a, b) => {
      const ra = rank.has(a) ? rank.get(a) : Infinity;
      const rb = rank.has(b) ? rank.get(b) : Infinity;
      if (ra !== rb) return ra - rb;
      return a.localeCompare(b);
    });
  }

  const urls = [];
  for (const file of files) {
    const filePath = path.join(dir, file);
    const publicId = path.parse(file).name;
    console.log(`Uploading image: ${folderName}/${file}`);
    const secureUrl = await uploadFile(filePath, {
      folder: `pearl-safari/${folderName}`,
      publicId,
      resourceType: 'image',
    });
    urls.push(withTransform(secureUrl, IMAGE_TRANSFORM));
  }
  return urls;
}

async function uploadVideoFolder(folderName) {
  const dir = path.join(ROOT, 'assets', 'videos', folderName);
  let files;
  try {
    files = (await readdir(dir)).filter((f) => /\.(mp4|mov|webm)$/i.test(f));
  } catch {
    return null; // Local folder doesn't exist — caller should keep existing data.
  }
  if (!files.length) return null;

  const urls = [];
  for (const file of files.sort()) {
    const filePath = path.join(dir, file);
    const publicId = path.parse(file).name;
    console.log(`Uploading video: ${folderName}/${file}`);
    const secureUrl = await uploadFile(filePath, {
      folder: `pearl-safari/${folderName}`,
      publicId,
      resourceType: 'video',
    });
    urls.push(withTransform(secureUrl, VIDEO_TRANSFORM));
  }
  return urls;
}

async function uploadSingleVideo(relativePath, folder) {
  const filePath = path.join(ROOT, 'assets', 'videos', relativePath);
  const publicId = path.parse(relativePath).name;
  try {
    await readFile(filePath);
  } catch {
    return null; // Doesn't exist locally — caller should keep existing data.
  }
  console.log(`Uploading video: ${relativePath}`);
  const secureUrl = await uploadFile(filePath, {
    folder: `pearl-safari/${folder}`,
    publicId,
    resourceType: 'video',
  });
  return withTransform(secureUrl, VIDEO_TRANSFORM);
}

async function main() {
  const existing = await loadExistingMedia();
  const media = { ...existing };

  const dataJson = JSON.parse(await readFile(path.join(ROOT, 'js', 'data.json'), 'utf8'));
  const preferredOrders = {};
  for (const attraction of dataJson.attractions || []) {
    preferredOrders[attraction.id] = (attraction.images || []).map((p) => path.basename(p));
  }

  for (const [attractionId, folderName] of Object.entries(PARK_FOLDERS)) {
    const prev = existing[attractionId] || {};
    const images = await uploadImageFolder(folderName, preferredOrders[attractionId] || []);
    const videos = await uploadVideoFolder(folderName);

    // prev.videos is the current schema; prev.video is the older singular
    // field from before this script supported multiple videos per park —
    // fall back to it too so a re-sync can't silently drop it.
    const prevVideos = prev.videos?.length ? prev.videos : (prev.video ? [prev.video] : []);
    const finalImages = images ?? prev.images ?? [];
    const finalVideos = videos ?? prevVideos;
    media[attractionId] = {
      images: finalImages,
      heroImage: finalImages[0] || prev.heroImage || null,
      videos: finalVideos,
      // Kept for backward compatibility with any older code reading .video
      video: finalVideos[0] || null,
    };
  }

  // General (non-park-specific) images used directly in static HTML markup
  const generalImages = await uploadImageFolder(GENERAL_IMAGE_FOLDER);
  if (generalImages) {
    const byName = {};
    let dir;
    try {
      dir = (await readdir(path.join(ROOT, 'assets', 'images', GENERAL_IMAGE_FOLDER)))
        .filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
      dir.forEach((file, i) => { byName[path.parse(file).name] = generalImages[i]; });
    } catch {}
    media._general = { images: generalImages, byName };
  } else if (!media._general) {
    media._general = { images: [], byName: {} };
  }

  // Sitewide hero video (index.html)
  const heroVideo = await uploadSingleVideo(SITE_HERO_VIDEO, 'site');
  media._heroVideo = heroVideo ?? existing._heroVideo ?? null;

  const outPath = path.join(ROOT, 'js', 'cloudinary-media.json');
  await writeFile(outPath, JSON.stringify(media, null, 2));
  console.log(`\nDone. Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
