// Grid Inch Zoom - v13 ready (i18n)
const MODULE_ID = "grid-inch-zoom";

/* Measure how many CSS px correspond to 1 CSS inch */
function measureCssInchPixels() {
  const el = document.createElement("div");
  el.style.width = "1in";
  el.style.height = "0";
  el.style.position = "absolute";
  el.style.visibility = "hidden";
  el.style.pointerEvents = "none";
  document.body.appendChild(el);
  const cssPx = el.getBoundingClientRect().width; // CSS pixels
  el.remove();
  return cssPx || 96; // standard fallback
}

/* Apply zoom so that 1 square ≈ target physical inches */
async function applyZoomToOneInch({ animate = true } = {}) {
  if (!canvas?.ready) return;
  const scene = canvas.scene;
  if (!scene) return;

  const gridSize = scene.grid?.size ?? 0;
  if (!gridSize) return; // no grid? exit

  const enabled = game.settings.get(MODULE_ID, "autoApply");
  if (!enabled) return;

  const calibration = Number(game.settings.get(MODULE_ID, "calibrationFactor")) || 1.0;
  const targetInches = Number(game.settings.get(MODULE_ID, "targetInchesPerSquare")) || 1.0;

  // 1 CSS inch in px (usually 96)
  const pxPerInch = measureCssInchPixels();

  // Desired pixels per square based on target inches (default 1")
  const targetPxPerSquare = pxPerInch * targetInches * calibration;

  // Canvas scale required: grid.size * scale = targetPxPerSquare
  let desiredScale = targetPxPerSquare / gridSize;

  // Clamp to a safe range; in v13 these values are reasonable
  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
  desiredScale = clamp(desiredScale, 0.1, 6.0);

  // Keep current pan (center/pivot) and apply only the scale
  const view = canvas.scene._viewPosition ?? {
    x: canvas.stage.pivot.x,
    y: canvas.stage.pivot.y
  };

  if (animate) {
    await canvas.animatePan({ x: view.x, y: view.y, scale: desiredScale, duration: 250 });
  } else {
    // Instant application without animation
    canvas.pan({ x: view.x, y: view.y, scale: desiredScale });
  }
}

/* Settings registration and hooks */
Hooks.once("init", function () {
  game.settings.register(MODULE_ID, "autoApply", {
    name: game.i18n.localize("grid-inch-zoom.autoApply.name"),
    hint: game.i18n.localize("grid-inch-zoom.autoApply.hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "calibrationFactor", {
    name: game.i18n.localize("grid-inch-zoom.calibrationFactor.name"),
    hint: game.i18n.localize("grid-inch-zoom.calibrationFactor.hint"),
    scope: "client",
    config: true,
    type: Number,
    range: { min: 0.5, max: 2.0, step: 0.005 },
    default: 1.0
  });

  game.settings.register(MODULE_ID, "targetInchesPerSquare", {
    name: game.i18n.localize("grid-inch-zoom.targetInchesPerSquare.name"),
    hint: game.i18n.localize("grid-inch-zoom.targetInchesPerSquare.hint"),
    scope: "client",
    config: true,
    type: Number,
    range: { min: 0.25, max: 3.0, step: 0.05 },
    default: 1.0
  });
});

/* v13: canvasReady is still valid to run when the canvas/scene is ready */
Hooks.on("canvasReady", () => {
  // Small timeout to ensure layout and bounding are stable
  // (useful on some browsers/zooms)
  setTimeout(() => applyZoomToOneInch({ animate: true }), 50);
});

/* Re-apply optionally on window resize (lightweight option) */
Hooks.on("resize", () => {
  const auto = game.settings.get(MODULE_ID, "autoApply");
  if (!auto) return;
  // Do not animate on continuous resize to avoid flicker
  applyZoomToOneInch({ animate: false });
});

/* Console utility */
Hooks.on("ready", () => {
  game[MODULE_ID] = { apply: applyZoomToOneInch };
});
