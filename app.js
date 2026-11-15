(() => {
  "use strict";
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const BOX = { w: -58, s: -19.5, e: -56, n: -17 };
  const HOME = { center: [-57.0, -18.35], zoom: 7.3, pitch: 58, bearing: -18 };
  const RAMP = ["#FFE8A3", "#FFC15A", "#FF8A2A", "#F0461C", "#B3160E"];
  const STOPS = [1, 2, 4, 8, 15];
  const $ = (id) => document.getElementById(id);
  const fmt = (v, d = 0) => v == null ? "–" : Number(v).toLocaleString("en-US", { maximumFractionDigits: d });
  const state = { ym: "2020-09", sensor: "v", fires: null, monthly: {}, playing: null, three: true };

  // places used for instant search and as an offline fallback for "nearest town"
  const PLACES = [
    { n: "Pantanal study area", sub: "58°W–56°W, 19.5°S–17°S", c: [-57, -18.25], z: 7.3, area: true },
    { n: "Corumbá", sub: "Mato Grosso do Sul, Brazil", c: [-57.651, -19.009], z: 11 },
    { n: "Ladário", sub: "Mato Grosso do Sul, Brazil", c: [-57.601, -19.005], z: 12 },
    { n: "Puerto Suárez", sub: "Santa Cruz, Bolivia", c: [-57.80, -18.96], z: 12 },
    { n: "Miranda", sub: "Mato Grosso do Sul, Brazil", c: [-56.38, -20.24], z: 12 },
    { n: "Aquidauana", sub: "Mato Grosso do Sul, Brazil", c: [-55.79, -20.47], z: 12 },
    { n: "Coxim", sub: "Mato Grosso do Sul, Brazil", c: [-54.76, -18.51], z: 12 },
    { n: "Porto Murtinho", sub: "Mato Grosso do Sul, Brazil", c: [-57.88, -21.70], z: 12 },
    { n: "Campo Grande", sub: "Mato Grosso do Sul, Brazil", c: [-54.62, -20.47], z: 10 },
    { n: "Poconé", sub: "Mato Grosso, Brazil", c: [-56.62, -16.26], z: 12 },
    { n: "Cáceres", sub: "Mato Grosso, Brazil", c: [-57.68, -16.07], z: 11 },
    { n: "Barão de Melgaço", sub: "Mato Grosso, Brazil", c: [-55.97, -16.19], z: 12 },
    { n: "Cuiabá", sub: "Mato Grosso, Brazil", c: [-56.10, -15.60], z: 10 },
    { n: "Brazil", sub: "Country", bbox: [-74.0, -33.8, -34.8, 5.3] },
    { n: "Bolivia", sub: "Country", bbox: [-69.7, -22.9, -57.4, -9.7] },
    { n: "Paraguay", sub: "Country", bbox: [-62.7, -27.6, -54.2, -19.3] }
  ];

  // ---------- map ----------
  const style = {
    version: 8,
    projection: { type: "globe" },
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sky: { "sky-color": "#0B141C", "horizon-color": "#1E3A5C", "fog-color": "#0B141C", "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 6, 0.6, 9, 0] },
    sources: {
      imagery: { type: "raster", tileSize: 256, maxzoom: 18, tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], attribution: "Imagery © Esri, Maxar, Earthstar Geographics" },
      labels: { type: "raster", tileSize: 256, maxzoom: 18, tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"] },
      dem: { type: "raster-dem", encoding: "terrarium", tileSize: 256, maxzoom: 14, tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"], attribution: "Terrain: Mapzen, AWS Terrain Tiles" }
    },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": "#0B141C" } },
      { id: "imagery", type: "raster", source: "imagery", paint: { "raster-saturation": -0.2, "raster-contrast": 0.08, "raster-brightness-max": 0.72 } },
      { id: "hillshade", type: "hillshade", source: "dem", paint: { "hillshade-exaggeration": 0.35, "hillshade-shadow-color": "#000000", "hillshade-highlight-color": "#ffffff" } }
    ]
  };

  const map = new maplibregl.Map({
    container: "map", style, center: [-57, -17], zoom: 2.6, pitch: 0, bearing: 0,
    maxPitch: 75, attributionControl: { compact: true }, hash: false
  });
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
  map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-right");
  map.addControl(new maplibregl.GlobeControl(), "top-right");
  function placeControls() {
    const tr = document.querySelector(".maplibregl-ctrl-top-right"), bar = document.querySelector(".top");
    if (tr && bar) tr.style.top = Math.round(bar.getBoundingClientRect().bottom + 2) + "px";
  }
  placeControls(); addEventListener("resize", placeControls);

  function boxGeo() {
    const { w, s, e, n } = BOX;
    return { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] } }] };
  }

  function cellsGeo(ym, sensor) {
    const f = state.fires;
    const rec = f && f.months[ym];
    const g = f.grid, half = g.step * 0.36;
    const feats = [], pts = [];
    if (sensor === "b") {
      const mm = new Map(), vv = new Map();
      const am = (rec && rec.m) || [], av = (rec && rec.v) || [];
      for (let i = 0; i < am.length; i += 2) mm.set(am[i], am[i + 1]);
      for (let i = 0; i < av.length; i += 2) vv.set(av[i], av[i + 1]);
      const cnt = [0, 0, 0];
      for (const cell of new Set([...mm.keys(), ...vv.keys()])) {
        const dm = mm.get(cell) || 0, dv = vv.get(cell) || 0;
        const k = dm && dv ? 2 : dv ? 1 : 0, d = Math.max(dm, dv);
        cnt[k]++;
        const row = Math.floor(cell / g.nc), col = cell % g.nc;
        const x = g.w + (col + 0.5) * g.step, y = g.s + (row + 0.5) * g.step;
        feats.push({ type: "Feature", properties: { d, k, cell }, geometry: { type: "Polygon", coordinates: [[[x - half, y - half], [x + half, y - half], [x + half, y + half], [x - half, y + half], [x - half, y - half]]] } });
        pts.push({ type: "Feature", properties: { d }, geometry: { type: "Point", coordinates: [x, y] } });
      }
      state.cnt = cnt;
      return { cells: { type: "FeatureCollection", features: feats }, points: { type: "FeatureCollection", features: pts } };
    }
    const arr = rec ? rec[sensor] : null;
    if (arr) {
      for (let i = 0; i < arr.length; i += 2) {
        const cell = arr[i], d = arr[i + 1];
        const row = Math.floor(cell / g.nc), col = cell % g.nc;
        const x = g.w + (col + 0.5) * g.step, y = g.s + (row + 0.5) * g.step;
        feats.push({ type: "Feature", properties: { d, cell }, geometry: { type: "Polygon", coordinates: [[[x - half, y - half], [x + half, y - half], [x + half, y + half], [x - half, y + half], [x - half, y - half]]] } });
        pts.push({ type: "Feature", properties: { d }, geometry: { type: "Point", coordinates: [x, y] } });
      }
    }
    return { cells: { type: "FeatureCollection", features: feats }, points: { type: "FeatureCollection", features: pts } };
  }

  const CAT = { both: "#FFB02E", v: "#3FC8F2", m: "#E65AD6" };
  const catExpr = ["match", ["get", "k"], 2, CAT.both, 1, CAT.v, CAT.m];
  const colorExpr = ["interpolate", ["linear"], ["get", "d"], STOPS[0], RAMP[0], STOPS[1], RAMP[1], STOPS[2], RAMP[2], STOPS[3], RAMP[3], STOPS[4], RAMP[4]];

  function addLayers() {
    map.addSource("box", { type: "geojson", data: boxGeo() });
    map.addSource("cells", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addSource("points", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({ id: "box-fill", type: "fill", source: "box", paint: { "fill-color": "#F0A050", "fill-opacity": 0.05 } });
    map.addLayer({ id: "labels", type: "raster", source: "labels", paint: { "raster-opacity": 0.95 } });
    map.addLayer({ id: "box-line", type: "line", source: "box", paint: { "line-color": "#FFD08A", "line-width": ["interpolate", ["linear"], ["zoom"], 3, 1.2, 9, 2.6], "line-dasharray": [2, 1.4] } });
    map.addLayer({ id: "glow", type: "heatmap", source: "points", paint: {
      "heatmap-weight": ["interpolate", ["linear"], ["get", "d"], 1, 0.25, 8, 0.8, 20, 1],
      "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 4, 0.6, 8, 1.1, 11, 1.6],
      "heatmap-radius": ["interpolate", ["exponential", 2], ["zoom"], 4, 3, 7, 10, 9, 26, 12, 90],
      "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(255,120,30,0)", 0.15, "rgba(255,110,30,0.35)", 0.4, "rgba(255,140,40,0.65)", 0.7, "rgba(255,200,80,0.85)", 1, "rgba(255,245,200,0.95)"],
      "heatmap-opacity": 0.85
    } });
    map.addLayer({ id: "cells-flat", type: "fill", source: "cells", layout: { visibility: "none" }, paint: { "fill-color": colorExpr, "fill-opacity": 0.9 } });
    try {
      map.addLayer({ id: "cells-3d", type: "fill-extrusion", source: "cells", paint: {
        "fill-extrusion-color": colorExpr,
        "fill-extrusion-height": ["+", 300, ["*", ["min", ["get", "d"], 31], 520]],
        "fill-extrusion-base": 0,
        "fill-extrusion-opacity": 0.95,
        "fill-extrusion-vertical-gradient": true
      } });
    } catch (e) {
      state.three = false; $("t-3d").checked = false; $("t-3d").disabled = true;
    }
    applyMode();
  }
  function enableTerrain() {
    if (!$("t-terrain").checked) return;
    try { map.setTerrain({ source: "dem", exaggeration: 1.4 }); } catch (e) { $("t-terrain").checked = false; }
  }

  function applyMode() {
    const three = state.three && $("t-3d").checked;
    if (map.getLayer("cells-3d")) map.setLayoutProperty("cells-3d", "visibility", three ? "visible" : "none");
    map.setLayoutProperty("cells-flat", "visibility", three ? "none" : "visible");
  }

  // ---------- data + UI ----------
  function setMonth(ym) {
    state.ym = ym;
    const [y, m] = ym.split("-").map(Number);
    $("year").value = y; $("month").value = m;
    $("period-label").textContent = MONTHS[m - 1] + " " + y;
    if (map.getSource("cells")) {
      const geo = cellsGeo(ym, state.sensor);
      map.getSource("cells").setData(geo.cells); map.getSource("points").setData(geo.points);
    }
    const r = state.monthly[ym];
    $("s-m").textContent = fmt(r && r.modis); $("s-v").textContent = fmt(r && r.snpp); $("s-h").textContent = fmt(r && r.est, 0);
    const has = state.fires && state.fires.months[ym];
    if (has && state.sensor === "b" && state.cnt) {
      const [cm, cv, cb] = state.cnt;
      $("n-both").textContent = fmt(cb); $("n-v").textContent = fmt(cv); $("n-m").textContent = fmt(cm);
    }
    $("note").textContent = has && state.sensor === "b"
      ? "Each column is a ~2 km cell, colored by which sensor caught burning there that month. Cells only VIIRS saw are usually small or short fires MODIS misses. Height shows the larger day count of the two."
      : has
      ? "Each column is a ~2 km cell. Height and color show on how many days that month the satellite detected burning there. Totals above are the official cell-day values from the calendar."
      : "No NASA FIRMS map data for this month yet. Totals above still come from the calendar.";
    if ($("place").classList.contains("open") && state.lastClick) describePlace(state.lastClick, false);
  }
  function setSensor(s) {
    state.sensor = s;
    document.querySelectorAll(".seg button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.s === s)));
    document.querySelector(".stat.m").classList.toggle("active", s === "m" || s === "b");
    document.querySelector(".stat.v").classList.toggle("active", s === "v" || s === "b");
    const c = s === "b" ? catExpr : colorExpr;
    if (map.getLayer("cells-flat")) { map.setPaintProperty("cells-flat", "fill-color", c); map.setPaintProperty("cells-3d", "fill-extrusion-color", c); }
    $("legend-days").hidden = s === "b"; $("legend-both").hidden = s !== "b";
    setMonth(state.ym);
  }
  function months() { return Object.keys(state.monthly).sort(); }
  function step(n) {
    const ks = months(); let i = ks.indexOf(state.ym) + n;
    if (i < 0) i = ks.length - 1; if (i >= ks.length) i = 0;
    setMonth(ks[i]);
  }
  function togglePlay() {
    if (state.playing) { clearInterval(state.playing); state.playing = null; $("play-ic").innerHTML = '<path d="M7 5v14l12-7z"/>'; $("play").setAttribute("aria-label", "Play months"); return; }
    $("play-ic").innerHTML = '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>'; $("play").setAttribute("aria-label", "Pause");
    state.playing = setInterval(() => step(1), 900);
  }

  function setupUI() {
    const ks = months();
    const years = [...new Set(ks.map((k) => +k.slice(0, 4)))];
    $("year").innerHTML = years.map((y) => `<option value="${y}">${y}</option>`).join("");
    $("month").innerHTML = MONTHS.map((n, i) => `<option value="${i + 1}">${n}</option>`).join("");
    const pick = () => {
      let k = $("year").value + "-" + String($("month").value).padStart(2, "0");
      if (!state.monthly[k]) k = ks.find((x) => x.startsWith($("year").value)) || ks[0];
      setMonth(k);
    };
    $("year").addEventListener("change", pick); $("month").addEventListener("change", pick);
    $("prev").addEventListener("click", () => step(-1)); $("next").addEventListener("click", () => step(1));
    $("play").addEventListener("click", togglePlay);
    document.querySelectorAll(".seg button").forEach((b) => b.addEventListener("click", () => setSensor(b.dataset.s)));
    $("t-3d").addEventListener("change", applyMode);
    $("t-labels").addEventListener("change", (e) => map.setLayoutProperty("labels", "visibility", e.target.checked ? "visible" : "none"));
    $("t-terrain").addEventListener("change", (e) => { try { map.setTerrain(e.target.checked ? { source: "dem", exaggeration: 1.4 } : null); } catch (err) {} });
    $("ramp").style.background = "linear-gradient(90deg," + RAMP.join(",") + ")";
    $("place-x").addEventListener("click", () => $("place").classList.remove("open"));
    document.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
      if (e.key === "ArrowLeft") step(-1); if (e.key === "ArrowRight") step(1);
    });
    setupSearch();
  }

  // ---------- search ----------
  let searchTimer, results = [], active = -1;
  const norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  function renderResults() {
    const ul = $("results");
    ul.innerHTML = results.map((r, i) => `<li role="option" data-i="${i}" aria-selected="${i === active}"><span>${r.n}</span><small>${r.sub || ""}</small></li>`).join("");
    ul.classList.toggle("open", results.length > 0);
    document.querySelector(".search").setAttribute("aria-expanded", String(results.length > 0));
  }
  function go(r) {
    $("results").classList.remove("open"); $("q").value = r.n; $("q").blur();
    if (r.bbox) map.fitBounds([[r.bbox[0], r.bbox[1]], [r.bbox[2], r.bbox[3]]], { padding: 80, pitch: 30, duration: 2600 });
    else map.flyTo({ center: r.c, zoom: r.z || 11, pitch: r.area ? HOME.pitch : 55, bearing: r.area ? HOME.bearing : 0, duration: 2600, essential: true });
    if (!r.area && r.c) setTimeout(() => describePlace({ lng: r.c[0], lat: r.c[1] }, true, r), 2700);
  }
  function setupSearch() {
    const q = $("q");
    q.addEventListener("input", () => {
      const v = q.value.trim(); clearTimeout(searchTimer);
      if (!v) { results = []; renderResults(); return; }
      const local = PLACES.filter((p) => norm(p.n).includes(norm(v)) || norm(p.sub || "").includes(norm(v))).slice(0, 6);
      results = local; active = local.length ? 0 : -1; renderResults();
      if (v.length >= 3) searchTimer = setTimeout(async () => {
        try {
          const res = await fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&accept-language=en&q=" + encodeURIComponent(v));
          const js = await res.json();
          const remote = js.map((p) => ({
            n: p.name || p.display_name.split(",")[0],
            sub: [p.address && (p.address.state || p.address.region), p.address && p.address.country].filter(Boolean).join(", ") || p.type,
            c: [+p.lon, +p.lat],
            bbox: p.boundingbox && (p.addresstype === "country" || p.addresstype === "state") ? [+p.boundingbox[2], +p.boundingbox[0], +p.boundingbox[3], +p.boundingbox[1]] : null,
            z: p.addresstype === "city" ? 11 : p.addresstype === "town" ? 12 : 10
          }));
          if (q.value.trim() !== v) return;
          const seen = new Set(local.map((p) => norm(p.n)));
          results = local.concat(remote.filter((r) => !seen.has(norm(r.n)))).slice(0, 8);
          if (active < 0 && results.length) active = 0;
          renderResults();
        } catch (e) { /* offline: keep local results */ }
      }, 380);
    });
    q.addEventListener("keydown", (e) => {
      if (!results.length) return;
      if (e.key === "ArrowDown") { active = (active + 1) % results.length; renderResults(); e.preventDefault(); }
      if (e.key === "ArrowUp") { active = (active - 1 + results.length) % results.length; renderResults(); e.preventDefault(); }
      if (e.key === "Enter") { go(results[Math.max(0, active)]); e.preventDefault(); }
      if (e.key === "Escape") { results = []; renderResults(); }
    });
    $("results").addEventListener("mousedown", (e) => { const li = e.target.closest("li"); if (li) go(results[+li.dataset.i]); });
    document.addEventListener("click", (e) => { if (!e.target.closest(".search")) $("results").classList.remove("open"); });
  }

  // ---------- place card on click ----------
  const toRad = (d) => d * Math.PI / 180;
  function km(a, b) {
    const R = 6371, dLat = toRad(b[1] - a[1]), dLon = toRad(b[0] - a[0]);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function cellAt(ll) {
    const g = state.fires && state.fires.grid;
    if (!g || ll.lng < BOX.w || ll.lng >= BOX.e || ll.lat < BOX.s || ll.lat >= BOX.n) return null;
    return Math.floor((ll.lat - g.s) / g.step) * g.nc + Math.floor((ll.lng - g.w) / g.step);
  }
  function daysIn(cell, sensor) {
    const rec = state.fires.months[state.ym]; const arr = rec && rec[sensor];
    if (!arr) return 0;
    for (let i = 0; i < arr.length; i += 2) if (arr[i] === cell) return arr[i + 1];
    return 0;
  }
  async function describePlace(ll, lookup = true, known = null) {
    state.lastClick = ll;
    const card = $("place"); card.classList.add("open");
    const near = PLACES.filter((p) => p.c && !p.area).map((p) => ({ p, d: km([ll.lng, ll.lat], p.c) })).sort((a, b) => a.d - b.d)[0];
    if (known) { $("place-name").textContent = known.n; $("place-sub").textContent = known.sub || ""; }
    else if (lookup) {
      $("place-name").textContent = near.d < 25 ? near.p.n : "Near " + near.p.n;
      $("place-sub").textContent = near.p.sub + " · " + fmt(near.d) + " km to town";
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&accept-language=en&lat=${ll.lat}&lon=${ll.lng}`);
        const js = await res.json();
        if (js && js.address && state.lastClick === ll) {
          const a = js.address;
          const town = a.city || a.town || a.village || a.municipality || a.county || js.name;
          if (town) $("place-name").textContent = town;
          $("place-sub").textContent = [a.state || a.region, a.country].filter(Boolean).join(", ");
        }
      } catch (e) { /* keep offline nearest-town answer */ }
    }
    const cell = cellAt(ll);
    const coords = Math.abs(ll.lat).toFixed(3) + "°" + (ll.lat < 0 ? "S" : "N") + ", " + Math.abs(ll.lng).toFixed(3) + "°" + (ll.lng < 0 ? "W" : "E");
    if (cell == null) {
      $("place-fire").textContent = coords + " · outside the study area. Fire data cover the dashed rectangle only.";
    } else {
      const [y, m] = state.ym.split("-").map(Number);
      const dm = daysIn(cell, "m"), dv = daysIn(cell, "v");
      $("place-fire").innerHTML = `${coords}<br><b>${MONTHS[m - 1]} ${y}</b> in this ~2 km cell: MODIS detected burning on <b>${dm}</b> day${dm === 1 ? "" : "s"}, VIIRS on <b>${dv}</b> day${dv === 1 ? "" : "s"}.`;
    }
  }

  // ---------- start ----------
  Promise.all([
    fetch("fires.json").then((r) => { if (!r.ok) throw new Error("fires.json " + r.status); return r.json(); }),
    fetch("monthly.json").then((r) => r.json()),
    new Promise((res) => { if (map.isStyleLoaded()) res(); else map.once("style.load", res); })
  ]).then(([fires, monthly]) => {
    state.fires = fires;
    const K = monthly.keys;
    monthly.rows.forEach((row) => { const o = Object.fromEntries(K.map((k, i) => [k, row[i]])); if (o.snpp != null) state.monthly[o.start] = o; });
    addLayers(); setupUI(); setSensor("v");
    $("loading").classList.add("hide");
    document.querySelectorAll(".maplibregl-compact-show").forEach((el) => el.classList.remove("maplibregl-compact-show"));
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.once("moveend", enableTerrain);
    map.flyTo({ ...HOME, duration: calm ? 0 : 3400, essential: true, curve: 1.4 });
    map.on("click", (e) => { if (!e.originalEvent.target.closest || !e.originalEvent.target.closest(".glass")) describePlace(e.lngLat); });
    map.on("mousemove", "cells-flat", () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "cells-flat", () => { map.getCanvas().style.cursor = ""; });
  }).catch((err) => {
    console.error(err);
    $("loading").innerHTML = '<p>The map data didn\'t load. Refresh the page or check your connection.</p>';
  });
})();
