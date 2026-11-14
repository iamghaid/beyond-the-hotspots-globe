# Beyond the Hotspots · 3D fire map

A 3D globe of the Pantanal study area (58°W–56°W, 19.5°S–17°S) showing where NASA FIRMS hotspots were detected each month, February 2012 – December 2025.

- **Sensors:** MODIS (Terra + Aqua) or VIIRS (S-NPP), switchable.
- **Cells:** a 0.02° grid (about 2 km). Column height and color = days in the month with at least one qualifying detection in the cell.
- **Filters:** inferred vegetation fire (type 0), MODIS confidence ≥ 30, VIIRS nominal or high confidence. Local dates use UTC−4.
- **Totals in the panel** are the official monthly cell-day values from the calendar (monthly.json, FRP ensemble estimate). The map grid is an approximation built directly from the NASA FIRMS yearly country files and can differ slightly from the calendar's EPSG:6933 grid.
- **Search** uses a short local list of Pantanal towns plus OpenStreetMap Nominatim.

Companion to the burning activity calendar: https://beyond-the-hotspots.vercel.app

Sources: NASA FIRMS (fire data), Esri World Imagery and Boundaries & Places (basemap), Mapzen/AWS Terrain Tiles (terrain), OpenStreetMap Nominatim (search). Built with MapLibre GL JS.
