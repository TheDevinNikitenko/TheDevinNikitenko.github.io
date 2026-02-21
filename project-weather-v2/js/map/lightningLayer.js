// js/map/lightningLayer.js
// Lightning tiles are frequently blocked by browser ORB/CORP policies without a proxy.
// This "no-op" layer keeps the dashboard clean and prevents console spam.

export function createLightningLayer(map) {
  return {
    show() { /* intentionally empty */ },
    hide() { /* intentionally empty */ },
  };
}