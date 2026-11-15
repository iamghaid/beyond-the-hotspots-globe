# Beyond the Hotspots · 3D fire map

**See where NASA's MODIS and VIIRS satellites detected burning in Brazil's Pantanal, month by month, on a 3D globe.**

NASA Space Apps Challenge 2026 · [Harmonization of MODIS and VIIRS Hot Spots](https://www.spaceappschallenge.org/2026/challenges/modis-and-viirs-hot-spots/) · Team **The Kernel**

**[Open the 3D fire map](https://beyond-the-hotspots-globe.vercel.app)** · [Main dashboard](https://beyond-the-hotspots.vercel.app) · [Dashboard source, method and results](https://github.com/iamghaid/beyond-the-hotspots)

---

This is the companion map to our burning-activity calendar. The calendar answers *how much* burned and *how unusual* each month was. The map answers *where*, and shows with your own eyes why the two sensors disagree.

## What you can do

- **Fly through 167 months**, February 2012 – December 2025, with previous/next, year and month pickers, or play them as an animation.
- **Switch sensor:** MODIS (Terra + Aqua), VIIRS (S-NPP), or **Both**. *Both* colors each 2 km cell by who detected burning there: both sensors, VIIRS only, or MODIS only, with a count of each. The many VIIRS-only cells are the small fires MODIS misses, which is the reason harmonization is needed.
- **Read the columns:** height and color show on how many days that month the cell had a detection. A heat glow marks where burning repeated.
- **Search** a town, region or country and the globe flies there. Click anywhere to see the nearest place and that cell's MODIS and VIIRS detection days.
- **Panel totals** are the official monthly values from the dashboard: observed MODIS, observed VIIRS and harmonized MODIS.
- Terrain, 3D columns and place names can each be turned off. On phones, the panel collapses so the map gets the full screen.

## How the map data was made

- **Source:** NASA FIRMS yearly country files for Brazil, MODIS (Terra + Aqua) and VIIRS S-NPP 375 m, clipped to the study box 58°W–56°W, 19.5°S–17°S.
- **Filters:** vegetation fire (type 0), MODIS confidence ≥ 30, VIIRS nominal or high confidence.
- **Grid:** 0.02° cells (about 2 km), local dates at UTC−4. A cell scores one day for each local day with at least one detection; MODIS is the union of Terra and Aqua.
- **File:** `fires.json` stores, for each month and sensor, the list of active cells and their day counts (about 63,000 entries, 453 KB, ~135 KB compressed).

The map grid is a display grid built directly from the FIRMS files. It can differ slightly from the dashboard's official EPSG:6933 grid and America/Cuiaba dates, so the official totals in the panel always come from the dashboard data (`monthly.json`).

## Performance

- MapLibre GL JS is served from this site with a one-year cache, and the fire data is preloaded with the page.
- Terrain loads only after the opening flight lands, and the opening view starts over South America to keep the first download small.
- Data files are cached for an hour and refreshed in the background.

## Files

```
index.html             Page, styles and layout
app.js                 Map, layers, sensor modes, search, place details
fires.json             Monthly active cells per sensor, Feb 2012 – Dec 2025
monthly.json           Official monthly totals, shared with the dashboard
maplibre-gl.js/.css    MapLibre GL JS 5.6.0, self-hosted
vercel.json            Cache headers
favicon.svg
```

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Credits

Fire data: [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/). Imagery and labels: Esri World Imagery and Boundaries & Places. Terrain: Mapzen / AWS Terrain Tiles. Search: OpenStreetMap Nominatim. Built with [MapLibre GL JS](https://maplibre.org/).

## Team The Kernel

Gheid Abdulkarim (team owner) · Idris Jan Mohammad · Suhaib AbduRahiman · Mohammed Al Attas · Wejdan Salem Bamakhish

Saudi Arabia · NASA Space Apps Challenge 2026
