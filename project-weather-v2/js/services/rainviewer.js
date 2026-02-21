// js/services/rainviewer.js
// No RainViewer. We generate a timeline of timestamps for IEM WMS-T radar.

export function buildRadarFrames({ minutesBack = 90, stepMinutes = 5 } = {}) {
  const frames = [];
  const now = Date.now();

  const stepMs = stepMinutes * 60 * 1000;
  const backMs = minutesBack * 60 * 1000;

  // Align to step boundary
  const aligned = now - (now % stepMs);

  for (let t = aligned - backMs; t <= aligned; t += stepMs) {
    frames.push({
      timeMs: t,
      timeISO: new Date(t).toISOString(), // WMS TIME param
      label: new Date(t).toLocaleString(),
    });
  }
  return frames;
}