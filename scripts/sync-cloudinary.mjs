/**
 * sync-cloudinary.mjs
 * Uploads local park images/videos to Cloudinary and writes js/cloudinary-media.json,
 * the file categories/image-resolver.js merges into data.json at runtime.
 *
 * Usage:  node scripts/sync-cloudinary.mjs
 * Reads credentials from .env in the project root (CLOUDINARY_CLOUD_NAME,
 * CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).
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

const env = await loadEnv();
const CLOUD_NAME = env.CLOUDINARY_CLOUD_NAME;
const API_KEY = env.CLOUDINARY_API_KEY;
const API_SECRET = env.CLOUDINARY_API_SECRET;

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  console.error('Missing Cloudinary credentials in .env (CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET).');
  process.exit(1);
}

// Attraction id -> local image folder (relative to assets/images/)
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

// Attraction id -> local video file (relative to assets/videos/), or null
const PARK_VIDEOS = {
  'mgahinga': 'mgahinga/mgahinga-trip.mp4',
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

async function uploadImageFolder(attractionId, folderName, preferredOrder = []) {
  const dir = path.join(ROOT, 'assets', 'images', folderName);
  let files;
  try {
    files = (await readdir(dir)).filter((f) => /\.(jpe?g|png|webp|avif|jfif)$/i.test(f));
  } catch {
    console.warn(`No local folder for ${attractionId} (${dir}), skipping.`);
    return [];
  }

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

async function uploadVideo(relativePath, folder) {
  const filePath = path.join(ROOT, 'assets', 'videos', relativePath);
  const publicId = path.parse(relativePath).name;
  console.log(`Uploading video: ${relativePath}`);
  const secureUrl = await uploadFile(filePath, {
    folder: `pearl-safari/${folder}`,
    publicId,
    resourceType: 'video',
  });
  return withTransform(secureUrl, VIDEO_TRANSFORM);
}

async function main() {
  const media = {};

  const dataJson = JSON.parse(await readFile(path.join(ROOT, 'js', 'data.json'), 'utf8'));
  const preferredOrders = {};
  for (const attraction of dataJson.attractions || []) {
    preferredOrders[attraction.id] = (attraction.images || []).map((p) => path.basename(p));
  }

  for (const [attractionId, folderName] of Object.entries(PARK_FOLDERS)) {
    const images = await uploadImageFolder(attractionId, folderName, preferredOrders[attractionId] || []);
    const video = PARK_VIDEOS[attractionId]
      ? await uploadVideo(PARK_VIDEOS[attractionId], folderName)
      : null;

    media[attractionId] = {
      images,
      heroImage: images[0] || null,
      video,
    };
  }

  // General (non-park-specific) images used directly in static HTML markup
  media._general = {
    images: await uploadImageFolder('_general', GENERAL_IMAGE_FOLDER),
  };
  media._general.byName = {};
  const generalDir = path.join(ROOT, 'assets', 'images', GENERAL_IMAGE_FOLDER);
  const generalFiles = (await readdir(generalDir)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
  generalFiles.forEach((file, i) => {
    media._general.byName[path.parse(file).name] = media._general.images[i];
  });

  // Sitewide hero video (index.html)
  media._heroVideo = await uploadVideo(SITE_HERO_VIDEO, 'site');

  const outPath = path.join(ROOT, 'js', 'cloudinary-media.json');
  await writeFile(outPath, JSON.stringify(media, null, 2));
  console.log(`\nDone. Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
