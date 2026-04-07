// app.js

// ---------- Supabase ----------
const initializeSupabase = () => {
  const supabaseUrl = "https://fobsgqoqlnxtxabqsowv.supabase.co";
  const supabaseKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvYnNncW9xbG54dHhhYnFzb3d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzgxNTksImV4cCI6MjA4Nzg1NDE1OX0.rsFkfcP88yKtQ32yB2tOTlaVp0_6_0ZUlksJ7iOQJ3I";
  return supabase.createClient(supabaseUrl, supabaseKey);
};

// ---------- YouTube helpers ----------
function toYouTubeEmbedUrl(inputUrl) {
  let url;
  try {
    url = new URL(inputUrl);
  } catch {
    return null;
  }

  // Already embed
  if (url.hostname.includes("youtube.com") && url.pathname.startsWith("/embed/")) {
    const embed = new URL(inputUrl);
    embed.searchParams.set("autoplay", "1");
    embed.searchParams.set("mute", "1");
    embed.searchParams.set("playsinline", "1");
    return embed.toString();
  }

  // youtu.be/<id>
  if (url.hostname === "youtu.be") {
    const id = url.pathname.replace("/", "");
    if (!id) return null;
    const embed = new URL(`https://www.youtube-nocookie.com/embed/${id}`);
    embed.searchParams.set("autoplay", "1");
    embed.searchParams.set("mute", "1");
    embed.searchParams.set("playsinline", "1");
    return embed.toString();
  }

  // youtube.com/watch?v=<id>
  if (url.hostname.includes("youtube.com")) {
    const id = url.searchParams.get("v");
    if (!id) return null;
    const embed = new URL(`https://www.youtube-nocookie.com/embed/${id}`);
    embed.searchParams.set("autoplay", "1");
    embed.searchParams.set("mute", "1");
    embed.searchParams.set("playsinline", "1");
    return embed.toString();
  }

  return null;
}

// ---------- Badge helpers ----------
function setBadge(id, state) {
  const el = document.getElementById(`badge-${id}`);
  if (!el) return;
  el.dataset.state = state; // live | offline | loading
  el.textContent =
    state === "live" ? "LIVE" : state === "offline" ? "OFFLINE" : "LOADING";
}

// ---------- World clock ----------
function startWorldClock() {
  function updateTimes() {
    const now = new Date();

    // Zulu
    const utcTime = now.toISOString().substr(11, 8) + "Z";
    const zuluEl = document.getElementById("zulu-time");
    if (zuluEl) zuluEl.textContent = utcTime;

    // Israel
    const israelFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jerusalem",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    });
    const israelParts = israelFormatter.formatToParts(now);
    const israelTime = {
      hour: (israelParts.find((p) => p.type === "hour")?.value || "00").padStart(2, "0"),
      minute: (israelParts.find((p) => p.type === "minute")?.value || "00").padStart(2, "0"),
      second: (israelParts.find((p) => p.type === "second")?.value || "00").padStart(2, "0"),
    };
    const israelStr = `${israelTime.hour}:${israelTime.minute}:${israelTime.second}`;
    const israelEl = document.getElementById("israel-time");
    if (israelEl) israelEl.textContent = israelStr;

    // Eastern
    const estFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const estEl = document.getElementById("est-time");
    if (estEl) {
      const t = estFormatter.format(now).replace(/^24/, "00");
      estEl.textContent = t;
    }
  }

  updateTimes();
  setInterval(updateTimes, 1000);
}

// ---------- Main ----------
document.addEventListener("DOMContentLoaded", async () => {
  // Start clocks regardless of app init success
  startWorldClock();

  try {
    const supabase = initializeSupabase();

    // DOM elements
    const cameraGrid = document.getElementById("camera-grid");
    const addCameraBtn = document.getElementById("add-camera-btn");
    const cameraModal = document.getElementById("camera-modal");
    const closeModal = document.querySelector(".close");
    const cameraForm = document.getElementById("camera-form");
    const modalTitle = document.getElementById("modal-title");
    const cancelBtn = document.getElementById("cancel-btn");

    // Optional: layout selector (cameras per row)
    const camsPerRowSelect = document.getElementById("camsPerRow");

    // Form fields
    const cameraIdField = document.getElementById("camera-id");
    const cameraTitleField = document.getElementById("camera-title");
    const cameraLocationField = document.getElementById("camera-location");
    const cameraTypeField = document.getElementById("camera-type");
    const cameraUrlField = document.getElementById("camera-url");

    // HLS instances for cleanup
    const hlsInstances = {};

    // ---------- Camera loading ----------
    const loadCameras = async () => {
      try {
        const { data, error } = await supabase
          .from("cameras")
          .select("*")
          .order("sort_order", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: true });

        if (error) throw error;

        cameraGrid.innerHTML = "";

        if (data && data.length > 0) {
          data.forEach((camera) => addCameraToGrid(camera));
        } else {
          cameraGrid.innerHTML = "<p class='muted'>No cameras found. Add one to get started.</p>";
        }
      } catch (err) {
        console.error("Error loading cameras:", err?.message || err);
        alert("Failed to load cameras. Check console for details.");
      }
    };

    // ---------- Card creation ----------
    const addCameraToGrid = (camera) => {
      const cameraCard = document.createElement("div");
      cameraCard.className = "camera-card";
      cameraCard.dataset.id = camera.id;

      // Header
      const cameraHeader = document.createElement("div");
      cameraHeader.className = "camera-header drag-handle"; // drag handle for SortableJS

      const titleContainer = document.createElement("div");
      titleContainer.style.display = "flex";
      titleContainer.style.alignItems = "center";
      titleContainer.style.gap = "8px";
      titleContainer.style.minWidth = "0";

      const cameraTitle = document.createElement("span");
      cameraTitle.className = "camera-title";
      cameraTitle.textContent = camera.title || "Untitled";

      const liveBadge = document.createElement("span");
      liveBadge.className = "camera-live-badge";
      liveBadge.id = `badge-${camera.id}`;
      liveBadge.textContent = "LOADING";
      liveBadge.dataset.state = "loading";

      titleContainer.appendChild(cameraTitle);
      titleContainer.appendChild(liveBadge);

      const cameraActions = document.createElement("div");
      cameraActions.className = "camera-actions";

      const editBtn = document.createElement("button");
      editBtn.className = "btn-icon";
      editBtn.title = "Edit";
      editBtn.innerHTML = '<span class="material-icons">edit</span>';
      editBtn.addEventListener("click", () => openModal(camera));

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn-icon";
      deleteBtn.title = "Delete";
      deleteBtn.innerHTML = '<span class="material-icons">delete</span>';
      deleteBtn.addEventListener("click", () => deleteCamera(camera.id));

      cameraActions.appendChild(editBtn);
      cameraActions.appendChild(deleteBtn);

      cameraHeader.appendChild(titleContainer);
      cameraHeader.appendChild(cameraActions);

      // Player
      const cameraPlayer = document.createElement("div");
      cameraPlayer.className = "camera-player";
      cameraPlayer.id = `player-${camera.id}`;

      // Footer
      const cameraInfo = document.createElement("div");
      cameraInfo.className = "camera-info";

      const cameraLocation = document.createElement("div");
      cameraLocation.className = "camera-location";
      cameraLocation.textContent = camera.location || "";

      const cameraSource = document.createElement("div");
      cameraSource.className = "camera-source";
      cameraSource.textContent = camera.type === "youtube" ? "YouTube" : "HLS";

      cameraInfo.appendChild(cameraLocation);
      cameraInfo.appendChild(cameraSource);

      cameraCard.appendChild(cameraHeader);
      cameraCard.appendChild(cameraPlayer);
      cameraCard.appendChild(cameraInfo);

      cameraGrid.appendChild(cameraCard);

      initPlayer(camera);
    };

    // ---------- Player init ----------
    const initPlayer = (camera) => {
      const playerElement = document.getElementById(`player-${camera.id}`);
      if (!playerElement) return;
      playerElement.innerHTML = "";

      setBadge(camera.id, "loading");

      if (camera.type === "youtube") {
        const embedUrl = toYouTubeEmbedUrl(camera.url || "");
        if (!embedUrl) {
          playerElement.innerHTML = '<div class="camera-offline">Invalid YouTube URL</div>';
          setBadge(camera.id, "offline");
          return;
        }

        // NOTE: iframe "PLAYING" vs "LIVE" is not reliably detectable without YT IFrame API.
        // Here we treat "embeddable" as live-ish. If it errors, it will show player error UI.
        playerElement.innerHTML = `
          <iframe
            width="100%"
            height="100%"
            src="${embedUrl}"
            frameborder="0"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowfullscreen
            referrerpolicy="strict-origin-when-cross-origin">
          </iframe>
        `;
        setBadge(camera.id, "live");
        return;
      }

      // HLS
      const video = document.createElement("video");
      video.controls = true;
      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;
      video.style.width = "100%";
      video.style.height = "100%";
      playerElement.appendChild(video);

      // Native HLS (Safari)
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = camera.url;
        video.addEventListener("playing", () => setBadge(camera.id, "live"));
        video.addEventListener("error", () => setBadge(camera.id, "offline"));
        video.addEventListener("stalled", () => setBadge(camera.id, "loading"));
        return;
      }

      // hls.js
      if (window.Hls && Hls.isSupported()) {
        const hls = new Hls({
          lowLatencyMode: true,
          backBufferLength: 30,
        });

        hls.loadSource(camera.url);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setBadge(camera.id, "live");
          video.play().catch(() => {});
        });

        hls.on(Hls.Events.ERROR, (_evt, data) => {
          // Non-fatal errors happen, but fatal means it’s dead unless reloaded
          if (data?.fatal) {
            console.warn("HLS fatal error", camera.id, data);
            setBadge(camera.id, "offline");
            try {
              hls.destroy();
            } catch {}
            delete hlsInstances[camera.id];
          } else {
            // keep it "loading" if it’s struggling
            setBadge(camera.id, "loading");
          }
        });

        video.addEventListener("playing", () => setBadge(camera.id, "live"));
        video.addEventListener("stalled", () => setBadge(camera.id, "loading"));
        video.addEventListener("error", () => setBadge(camera.id, "offline"));

        hlsInstances[camera.id] = hls;
      } else {
        playerElement.innerHTML = '<div class="camera-offline">HLS is not supported in this browser.</div>';
        setBadge(camera.id, "offline");
      }
    };

    // ---------- Modal ----------
    const openModal = (camera = null) => {
      if (camera) {
        modalTitle.textContent = "Edit Camera";
        cameraIdField.value = camera.id;
        cameraTitleField.value = camera.title || "";
        cameraLocationField.value = camera.location || "";
        cameraTypeField.value = camera.type || "youtube";
        cameraUrlField.value = camera.url || "";
      } else {
        modalTitle.textContent = "Add Camera";
        cameraForm.reset();
        cameraIdField.value = "";
      }
      cameraModal.style.display = "block";
    };

    const closeModalWindow = () => {
      cameraModal.style.display = "none";
    };

    const handleFormSubmit = async (e) => {
      e.preventDefault();

      const cameraData = {
        title: cameraTitleField.value.trim(),
        location: cameraLocationField.value.trim(),
        type: cameraTypeField.value,
        url: cameraUrlField.value.trim(),
      };

      if (cameraIdField.value) {
        await updateCamera(cameraIdField.value, cameraData);
      } else {
        await addCamera(cameraData);
      }

      closeModalWindow();
    };

    // ---------- CRUD ----------
    const addCamera = async (cameraData) => {
      try {
        // Put new cameras at the end
        const { data: maxRows, error: maxErr } = await supabase
          .from("cameras")
          .select("sort_order")
          .order("sort_order", { ascending: false, nullsFirst: false })
          .limit(1);

        if (maxErr) throw maxErr;

        const nextOrder = (maxRows?.[0]?.sort_order ?? 0) + 1;
        cameraData.sort_order = nextOrder;

        const { data, error } = await supabase.from("cameras").insert([cameraData]).select();
        if (error) throw error;

        if (data && data.length > 0) {
          addCameraToGrid(data[0]);
        }
      } catch (err) {
        console.error("Error adding camera:", err?.message || err);
        alert("Failed to add camera. Check console for details.");
      }
    };

    const updateCamera = async (id, cameraData) => {
      try {
        const { data, error } = await supabase
          .from("cameras")
          .update(cameraData)
          .eq("id", id)
          .select();

        if (error) throw error;

        if (data && data.length > 0) {
          const cameraElement = document.querySelector(`.camera-card[data-id="${id}"]`);
          if (cameraElement) cameraElement.remove();

          if (hlsInstances[id]) {
            try {
              hlsInstances[id].destroy();
            } catch {}
            delete hlsInstances[id];
          }

          addCameraToGrid(data[0]);
        }
      } catch (err) {
        console.error("Error updating camera:", err?.message || err);
        alert("Failed to update camera. Check console for details.");
      }
    };

    const deleteCamera = async (id) => {
      if (!confirm("Are you sure you want to delete this camera?")) return;

      try {
        const { error } = await supabase.from("cameras").delete().eq("id", id);
        if (error) throw error;

        const cameraElement = document.querySelector(`.camera-card[data-id="${id}"]`);
        if (cameraElement) cameraElement.remove();

        if (hlsInstances[id]) {
          try {
            hlsInstances[id].destroy();
          } catch {}
          delete hlsInstances[id];
        }
      } catch (err) {
        console.error("Error deleting camera:", err?.message || err);
        alert("Failed to delete camera. Check console for details.");
      }
    };

    // ---------- Cameras per row control ----------
    const initCamsPerRowControl = () => {
      if (!camsPerRowSelect) return;

      const apply = (value) => {
        document.documentElement.style.setProperty("--cams-per-row", String(value));
      };

      const saved = localStorage.getItem("camsPerRow");
      if (saved) {
        camsPerRowSelect.value = saved;
        apply(saved);
      } else {
        apply(camsPerRowSelect.value || 3);
      }

      camsPerRowSelect.addEventListener("change", (e) => {
        const value = e.target.value;
        apply(value);
        localStorage.setItem("camsPerRow", value);
      });
    };

    // Layout buttons
  const initLayoutButtons = () => {
  const featuredBtn = document.getElementById("layout-featured");
  const col2Btn = document.getElementById("layout-2col");
  const col3Btn = document.getElementById("layout-3col");
  const col4Btn = document.getElementById("layout-4col");

  featuredBtn.addEventListener("click", () => {
    cameraGrid.classList.add("featured");
    document.documentElement.style.setProperty("--featured-mode", 1);
    
  });

  col2Btn.addEventListener("click", () => {
    cameraGrid.classList.remove("featured");
    document.documentElement.style.setProperty("--cams-per-row", 2);
  });

  col3Btn.addEventListener("click", () => {
    cameraGrid.classList.remove("featured");
    document.documentElement.style.setProperty("--cams-per-row", 3);
  });

  col4Btn.addEventListener("click", () => {
    cameraGrid.classList.remove("featured");
    document.documentElement.style.setProperty("--cams-per-row", 4);
  });
};

// Initialize
initLayoutButtons();

    // ---------- SortableJS reorder + persist ----------
    const initSortable = () => {
      if (!window.Sortable) {
        console.warn("SortableJS not found. Add the SortableJS script tag to enable drag-reorder.");
        return;
      }

      Sortable.create(cameraGrid, {
        animation: 150,
        handle: ".drag-handle",
        draggable: ".camera-card",
        ghostClass: "drag-ghost",
        chosenClass: "drag-chosen",

        onEnd: async () => {
          try {
            const cards = [...cameraGrid.querySelectorAll(".camera-card")];
            const updates = cards.map((card, idx) => ({
              id: card.dataset.id,
              sort_order: idx + 1,
            }));

            const { error } = await supabase
              .from("cameras")
              .upsert(updates, { onConflict: "id" });

            if (error) throw error;
          } catch (err) {
            console.error("Failed saving order:", err?.message || err);
            alert("Could not save new order. Check console.");
          }
        },
      });
    };

    // ---------- Events ----------
    addCameraBtn?.addEventListener("click", () => openModal());
    closeModal?.addEventListener("click", () => closeModalWindow());
    cancelBtn?.addEventListener("click", () => closeModalWindow());
    window.addEventListener("click", (e) => {
      if (e.target === cameraModal) closeModalWindow();
    });
    cameraForm?.addEventListener("submit", handleFormSubmit);

    // ---------- Init ----------
    initCamsPerRowControl();
    await loadCameras();
    initSortable();
  } catch (err) {
    console.error("Application initialization failed:", err);
    alert("Failed to initialize the application. Check console for details.");
  }
});