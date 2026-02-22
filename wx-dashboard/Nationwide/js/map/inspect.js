import { layerContainsLatLng } from "../utils/geo.js";
import { qs, el } from "../utils/dom.js";
import { severityBadgeClass } from "./alertsLayer.js";
import { fmtTime } from "../utils/time.js";

export function setupInspect({ map, state, openAlertPopup }) {
  const sheet = qs("#inspectSheet");
  const list = qs("#inspectList");
  const sub = qs("#inspectSubtitle");
  const closeBtn = qs("#inspectCloseBtn");

  function hide() {
    sheet.classList.add("hidden");
    list.innerHTML = "";
  }

  closeBtn.addEventListener("click", hide);

  map.on("click", (e) => {
    // Find all alerts whose layer contains this point
    const hits = [];

    for (const [id, layer] of state.alertLayersById.entries()) {
      if (layerContainsLatLng(layer, e.latlng)) {
        const a = state.alertsById.get(id);
        if (a) hits.push(a);
      }
    }

    if (hits.length === 0) {
      hide();
      return;
    }

    if (hits.length === 1) {
      hide();
      openAlertPopup(hits[0].id);
      return;
    }

    // Multiple: show picker
    sheet.classList.remove("hidden");
    sub.textContent = `${hits.length} alerts overlap here. Tap one to open its popup.`;

    list.innerHTML = "";
    hits
      .sort((a,b) => (b.sent||"").localeCompare(a.sent||""))
      .forEach((a) => {
        const sevCls = severityBadgeClass(a.severity);
        const item = el("div", { class: "alertItem" }, [
          el("div", { class: "top" }, [
            el("div", { class: "name" }, [a.name]),
            el("div", { class: `badge ${sevCls}` }, [a.severity || "Unknown"]),
          ]),
          el("div", { class: "meta" }, [`Sent: ${fmtTime(a.sent)} • ${a.areaDesc || ""}`]),
        ]);

        item.addEventListener("click", () => {
          hide();
          openAlertPopup(a.id);
        });

        list.appendChild(item);
      });
  });

  return { hide };
}