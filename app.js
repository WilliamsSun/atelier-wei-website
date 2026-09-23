(function () {
  "use strict";

  const DESIGN_WIDTH = 2560;
  // Every visual element uses the center of the first reference square as
  // its browser-zoom anchor: x is the viewport midpoint, y is 75px.
  const REFERENCE_ANCHOR_Y = 75;
  const GRID_SIZE = 75;
  const IMAGE_ORIGIN_Y = 37.5 + GRID_SIZE * 3;
  const sources = Array.isArray(window.IMAGE_SOURCES) ? window.IMAGE_SOURCES : [];
  const POSITIONS_KEY = "atelier-wei.positions-v2-grid-origin";
  const gallery = document.getElementById("gallery");
  const page = document.querySelector(".page");
  const gridLayer = document.querySelector(".grid-layer");
  const brandLayer = document.querySelector(".brand-layer");
  const brandLine = document.querySelector(".brand-line");
  const siteFooter = document.querySelector(".site-footer");
  const logo = document.querySelector(".brand-logo");
  const viewer = document.getElementById("viewer");
  const viewerImage = document.getElementById("viewer-image");
  const viewerCaption = document.getElementById("viewer-caption");
  const state = { items: [], active: 0, drag: null, textDrag: null, imageYOffset: 0, brandLineOffset: { x: 0, y: 0 } };
  const initialDpr = Math.max(window.devicePixelRatio || 1, 0.01);
  const initialVisualScale = Math.max(window.visualViewport?.scale || 1, 0.01);

  function viewportWidth() {
    return Math.max(document.documentElement.clientWidth || window.innerWidth || 1, 1);
  }
  // Counter browser/device zoom so image dimensions stay visually stable.
  // The layer transform below applies the inverse zoom to the coordinate system;
  // compensating here keeps the image's on-screen size unchanged as well.
  function imageScale() { return (viewportWidth() * zoomFactor()) / DESIGN_WIDTH; }
  function imageOrigin() {
    const width = viewportWidth();
    const remainder = (width / 2 - GRID_SIZE / 2) % GRID_SIZE;
    return {
      x: (remainder + GRID_SIZE) % GRID_SIZE,
      y: IMAGE_ORIGIN_Y,
    };
  }
  function zoomFactor() {
    const dpr = Math.max(window.devicePixelRatio || 1, 0.01) / initialDpr;
    const visual = Math.max(window.visualViewport?.scale || 1, 0.01) / initialVisualScale;
    return Math.max(0.25, Math.min(5, dpr * visual));
  }
  function parseName(src) {
    const file = String(src || "").split(/[\\/]/).pop() || "";
    const stem = file.replace(/[?#].*$/, "").replace(/\.[^.]+$/, "");
    const match = stem.match(/^\s*\(\s*(-?\d+(?:\.\d+)?)\s*[,，]\s*(-?\d+(?:\.\d+)?)\s*\)\s*_\s*(\d+(?:\.\d+)?)\s*(?:_\s*(.*))?$/);
    if (!match) return { x: 0, y: 0, width: DESIGN_WIDTH, label: "" };
    return { x: Number(match[1]), y: Number(match[2]), width: Number(match[3]), label: String(match[4] || "").trim() };
  }
  function readSavedPositions() {
    try {
      const value = JSON.parse(localStorage.getItem(POSITIONS_KEY) || "null");
      return value && value.positions ? value.positions : {};
    } catch (_) { return {}; }
  }
  function savePositions() {
    const positions = {};
    state.items.forEach((item) => {
      if (!item.el || !item.el.isConnected) return;
      positions[item.src] = { x: item.position.x, y: item.position.y, width: item.position.width, z: item.z };
    });
    try { localStorage.setItem(POSITIONS_KEY, JSON.stringify({ version: 1, positions })); } catch (_) { /* ignore */ }
  }
  function clearSavedPositions() { try { localStorage.removeItem(POSITIONS_KEY); } catch (_) { /* ignore */ } }
  function resetBrandLinePosition() {
    state.brandLineOffset = { x: 0, y: 0 };
    applyBrandLinePosition();
  }
  function applyBrandLinePosition() {
    if (!brandLine) return;
    const scale = imageScale();
    brandLine.style.transform = `translate(${state.brandLineOffset.x * scale}px, ${state.brandLineOffset.y * scale}px)`;
  }
  function applyPosition(item) {
    if (!item.el) return;
    const scale = imageScale();
    const origin = imageOrigin();
    item.el.style.left = `${origin.x + item.position.x * scale}px`;
    item.el.style.top = `${origin.y + (item.position.y + state.imageYOffset) * scale}px`;
    item.el.style.width = `${item.position.width * scale}px`;
    item.el.style.zIndex = String(item.z || 1);
  }
  function formatCoordinate(value) {
    const number = Number(value) || 0;
    return Number.isInteger(number) ? String(number) : number.toFixed(2).replace(/\.?0+$/, "");
  }
  function coordinateText(item) {
    const coordinates = `x: ${formatCoordinate(item.position.x)}, y: ${formatCoordinate(item.position.y)}`;
    return item.meta.label ? `${coordinates} ${item.meta.label}` : coordinates;
  }
  function updateCoordinate(item) {
    if (!item.coordinate) return;
    item.coordinate.textContent = coordinateText(item);
    item.coordinate.hidden = false;
  }
  function updateAllCoordinates() { state.items.forEach((item) => updateCoordinate(item)); }
  function fitBrandText() {
    if (!brandLine) return;
    const old = brandLine.style.fontSize;
    brandLine.style.fontSize = "18px";
    const natural = brandLine.getBoundingClientRect().width;
    const available = Math.max(120, viewportWidth() - 20);
    document.documentElement.style.setProperty("--copy-scale", Math.min(1, available / Math.max(natural, 1)).toFixed(4));
    brandLine.style.fontSize = old;
  }
  function layoutGallery() {
    if (!gallery) return;
    const scale = imageScale();
    // Keep image coordinates stable while dragging; do not push the canvas
    // down when an image is moved above the logo or text.
    state.imageYOffset = 0;
    let bottom = Math.max(window.innerHeight || 0, 360);
    let lastImageBottom = 0;
    state.items.forEach((item) => {
      if (!item.el || !item.el.isConnected) return;
      applyPosition(item);
      const height = item.image.naturalWidth && item.image.naturalHeight
        ? item.position.width * scale * item.image.naturalHeight / item.image.naturalWidth
        : item.position.width * scale * 0.75;
      const labelHeight = item.coordinate && !item.coordinate.hidden ? item.coordinate.getBoundingClientRect().height : 0;
      const imageBottom = imageOrigin().y + (item.position.y + state.imageYOffset) * scale + height;
      lastImageBottom = Math.max(lastImageBottom, imageBottom);
      bottom = Math.max(bottom, imageBottom + labelHeight);
    });
    gallery.style.height = `${Math.ceil(bottom + 64)}px`;
    if (siteFooter) siteFooter.style.top = `${Math.ceil(lastImageBottom + 300)}px`;
    if (gridLayer) gridLayer.style.minHeight = `${Math.max(page.scrollHeight, window.innerHeight) * zoomFactor()}px`;
    updateAllCoordinates();
  }
  function resetGallery() {
    clearSavedPositions();
    state.items.forEach((item, index) => {
      item.position = { x: item.meta.x, y: item.meta.y, width: item.meta.width };
      item.z = index + 1;
      item.live = false;
    });
    layoutGallery();
  }
  function openViewer(index) {
    if (!state.items.length || !viewer) return;
    state.active = (index + state.items.length) % state.items.length;
    const item = state.items[state.active];
    viewerImage.src = item.src;
    viewerImage.alt = item.meta.label;
    viewerCaption.textContent = item.meta.label;
    viewer.showModal();
  }
  function promoteItem(item) {
    const maxZ = Math.max(0, ...state.items.map((entry) => entry.z || 0));
    item.z = maxZ + 1;
    applyPosition(item);
  }
  function startDrag(item, event) {
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();
    // Promote on pointer-down so both clicks and drags bring the image forward.
    promoteItem(item);
    state.drag = { item, startX: event.clientX, startY: event.clientY, x: item.position.x, y: item.position.y, moved: false };
    item.el.classList.add("dragging");
    item.el.setPointerCapture?.(event.pointerId);
  }
  function moveDrag(event) {
    const drag = state.drag;
    if (!drag) return;
    const scale = imageScale();
    const dx = (event.clientX - drag.startX) / Math.max(scale, 0.001);
    const dy = (event.clientY - drag.startY) / Math.max(scale, 0.001);
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      if (!drag.moved) {
        promoteItem(drag.item);
      }
      drag.moved = true;
    }
    drag.item.position.x = drag.x + dx;
    drag.item.position.y = drag.y + dy;
    drag.item.live = drag.moved;
    applyPosition(drag.item);
    if (drag.moved) updateCoordinate(drag.item);
  }
  function endDrag(event) {
    const drag = state.drag;
    if (!drag) return;
    const item = drag.item;
    item.el.classList.remove("dragging");
    item.el.releasePointerCapture?.(event.pointerId);
    state.drag = null;
    if (drag.moved) savePositions();
    layoutGallery();
  }
  function attachDrag(item) {
    item.el.addEventListener("pointerdown", (event) => startDrag(item, event));
    item.el.addEventListener("pointermove", moveDrag);
    item.el.addEventListener("pointerup", endDrag);
    item.el.addEventListener("pointercancel", endDrag);
  }
  function startBrandLineDrag(event) {
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();
    state.textDrag = {
      startX: event.clientX,
      startY: event.clientY,
      x: state.brandLineOffset.x,
      y: state.brandLineOffset.y,
    };
    brandLine.setPointerCapture?.(event.pointerId);
  }
  function moveBrandLineDrag(event) {
    const drag = state.textDrag;
    if (!drag) return;
    const scale = imageScale();
    state.brandLineOffset.x = drag.x + (event.clientX - drag.startX) / Math.max(scale, 0.001);
    state.brandLineOffset.y = drag.y + (event.clientY - drag.startY) / Math.max(scale, 0.001);
    applyBrandLinePosition();
  }
  function endBrandLineDrag(event) {
    if (!state.textDrag) return;
    brandLine.releasePointerCapture?.(event.pointerId);
    state.textDrag = null;
  }
  function render() {
    if (!gallery) return;
    const saved = readSavedPositions();
    gallery.replaceChildren();
    state.items = sources.map((src, index) => {
      const meta = parseName(src);
      const figure = document.createElement("figure");
      const button = document.createElement("button");
      const image = document.createElement("img");
      const coordinate = document.createElement("figcaption");
      const stored = saved[src];
      figure.className = "gallery-item";
      button.type = "button";
      button.setAttribute("aria-label", meta.label || `Open image ${index + 1}`);
      image.src = src;
      image.alt = meta.label;
      image.loading = index === 0 ? "eager" : "lazy";
      coordinate.className = "image-coordinate";
      coordinate.setAttribute("aria-hidden", "true");
      button.append(image);
      figure.append(button, coordinate);
      gallery.append(figure);
      const item = {
        src, meta, el: figure, image, coordinate, live: false,
        z: Number(stored?.z) || index + 1,
        position: stored && Number.isFinite(Number(stored.x))
          ? { x: Number(stored.x), y: Number(stored.y), width: Number(stored.width) || meta.width }
          : { x: meta.x, y: meta.y, width: meta.width },
      };
      updateCoordinate(item);
      applyPosition(item);
      attachDrag(item);
      image.addEventListener("load", layoutGallery);
      image.addEventListener("error", () => { item.el.remove(); layoutGallery(); }, { once: true });
      return item;
    });
    layoutGallery();
  }
  function lockReferenceLayers() {
    const zoom = zoomFactor();
    const width = viewportWidth();
    const expanded = width * zoom;
    const left = (width - expanded) / 2;
    [gridLayer, brandLayer, gallery].forEach((layer) => {
      if (!layer) return;
      layer.style.width = `${expanded}px`;
      layer.style.left = `${left}px`;
      layer.style.transformOrigin = `50% ${REFERENCE_ANCHOR_Y}px`;
      layer.style.transform = `scale(${1 / zoom})`;
    });
    if (gridLayer) gridLayer.style.minHeight = `${Math.max(page.scrollHeight, window.innerHeight) * zoom}px`;
    updateAllCoordinates();
  }

  document.querySelector(".viewer-close")?.addEventListener("click", () => viewer.close());
  document.querySelector(".viewer-prev")?.addEventListener("click", () => openViewer(state.active - 1));
  document.querySelector(".viewer-next")?.addEventListener("click", () => openViewer(state.active + 1));
  viewer?.addEventListener("click", (event) => { if (event.target === viewer) viewer.close(); });
  viewer?.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") openViewer(state.active - 1);
    if (event.key === "ArrowRight") openViewer(state.active + 1);
  });
  logo?.addEventListener("click", (event) => { event.preventDefault(); resetGallery(); resetBrandLinePosition(); });
  logo?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); resetGallery(); resetBrandLinePosition(); }
  });
  brandLine?.addEventListener("pointerdown", startBrandLineDrag);
  brandLine?.addEventListener("pointermove", moveBrandLineDrag);
  brandLine?.addEventListener("pointerup", endBrandLineDrag);
  brandLine?.addEventListener("pointercancel", endBrandLineDrag);
  function relayout() { fitBrandText(); applyBrandLinePosition(); layoutGallery(); lockReferenceLayers(); }
  render();
  relayout();
  window.addEventListener("resize", relayout, { passive: true });
  window.visualViewport?.addEventListener("resize", relayout, { passive: true });
  window.visualViewport?.addEventListener("scroll", lockReferenceLayers, { passive: true });
  setInterval(lockReferenceLayers, 250);
})();
