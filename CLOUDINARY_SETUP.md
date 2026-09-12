# Cloudinary Setup and Media Sync

This project now supports Cloudinary as the media source for park images and videos.

## 1. Environment variables

Create a `.env` file in the project root with:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

A sample template is already included in `.env.example`.

## 2. Sync local assets to Cloudinary

Run:

```powershell
node .\scripts\sync-cloudinary.mjs
```

What it does:
- Uploads the sitewide hero video from `assets/videos/uganda-safari-hero.mp4`.
- Uploads park images (and any park-specific video) from:
  - `assets/images/bwindi`
  - `assets/images/queen_elizabeth`
  - `assets/images/murchison_falls`
  - `assets/images/kidepoWild` (attraction id `kidepo`)
  - `assets/images/lake_bunyonyi`
  - `assets/images/rwenzori`
  - `assets/images/lake_mburo`
  - `assets/images/mgahinga` (includes `assets/videos/mgahinga/mgahinga-trip.mp4`)
- Uploads non-park images from `assets/images/general` (used directly in static markup on index.html/about.html) under the `_general` key.
- Generates/updates `js/cloudinary-media.json`, keyed by attraction id, each with `images`, `heroImage`, and `video`.
- Applies `f_auto,q_auto,dpr_auto` (images) / `f_auto,q_auto` (video) directly in the stored delivery URL.

## 3. Frontend loading flow

Pages now load data in this order (via `categories/image-resolver.js`):
1. `js/data.json`
2. `js/cloudinary-media.json`
3. Merge Cloudinary media into matching attraction IDs (`images`, `heroImage`, `video`)

If `cloudinary-media.json` is missing or a request fails, pages fall back to whatever is in `data.json`.

Note: local `assets/images/*` and `assets/videos/*` folders are no longer shipped with the
site — everything is served from Cloudinary. If you need to re-sync, restore the relevant
local files first, run the script, then remove them again (or just edit directly in the
Cloudinary Media Library and update `js/cloudinary-media.json` by hand for one-off changes).

## 4. Optimization built-in

Cloudinary delivery optimization is applied at runtime for image-heavy sections:
- `f_auto`
- `q_auto`
- `dpr_auto`
- Contextual width/crop based on section

## 5. When you add new media files

Since local asset folders were removed after the initial migration:

1. Recreate the relevant folder under `assets/images/<park>/` (or `assets/videos/<park>/` for a
   park-specific video, `assets/videos/uganda-safari-hero.mp4` for the sitewide hero) and drop
   the new file(s) in.
2. Re-run:

```powershell
node .\scripts\sync-cloudinary.mjs
```

3. Refresh the site — the new images/video are picked up automatically via `cloudinary-media.json`.
4. Delete the local file(s) again once you've confirmed they're live on Cloudinary.



