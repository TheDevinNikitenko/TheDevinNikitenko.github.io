export function setStatus(text, kind = "info") {
  const line = document.getElementById("statusLine");
  const pill = line.querySelector(".status__pill");
  const label = line.querySelector(".status__text");
  label.textContent = text;

  pill.style.color =
    kind === "ok" ? "#22c55e" :
    kind === "warn" ? "#f59e0b" :
    kind === "err" ? "#ef4444" :
    "#60a5fa";
}

export function renderTypeChips(container, types, onToggle) {
  container.innerHTML = "";
  for (const [k, on] of Object.entries(types)) {
    const el = document.createElement("div");
    el.className = "chip" + (on ? " chip--on" : "");
    el.textContent = k;
    el.addEventListener("click", () => onToggle(k));
    container.appendChild(el);
  }
}

export function renderSeverityGraph(container, counts) {
  container.innerHTML = "";
  const order = ["Extreme","Severe","Moderate","Minor","Unknown"];
  for (const key of order) {
    const el = document.createElement("div");
    el.className = "bar";
    el.innerHTML = `<div class="bar__k">${key}</div><div class="bar__v">${counts[key] ?? 0}</div>`;
    container.appendChild(el);
  }
}

/**
 * HARD stop scroll chaining (trackpad will try to scroll map/page).
 * This keeps scroll strictly inside the sidebar list.
 */
export function lockScrollToSidebarList(listEl) {
  // Prevent any wheel scroll outside list
  window.addEventListener("wheel", (e) => {
    if (listEl && listEl.contains(e.target)) return;
    e.preventDefault();
  }, { passive: false });

  // Prevent chain when list hits top/bottom
  listEl.addEventListener("wheel", (e) => {
    const atTop = listEl.scrollTop <= 0;
    const atBottom = listEl.scrollTop + listEl.clientHeight >= listEl.scrollHeight - 1;
    const up = e.deltaY < 0;
    const down = e.deltaY > 0;
    if ((atTop && up) || (atBottom && down)) e.preventDefault();
  }, { passive: false });
}