import { schedule } from './stage_schedule.js';

// ---------- Supabase ----------
const initializeSupabase = () => {
  const supabaseUrl = "https://mhdnkndhrlrihpyshrfi.supabase.co";
  const supabaseKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZG5rbmRocmxyaWhweXNocmZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTY5NzQsImV4cCI6MjA4ODk5Mjk3NH0.gXM-8i0yz7j3RW0vlsbj9ml9MKSujOdplzPxN49IRZI";
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

let scale = 1;
let offsetX = 0;
let offsetY = 0;
let isDragging = false;

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

let countdownState = true
let leakState = true

const today = new Date().toISOString().split('T')[0]; 
const todaysSchedule = schedule[today];
 
// ---------- Main ----------
document.addEventListener("DOMContentLoaded", async () => {
  // Start clocks regardless of app init success
  startWorldClock();

  try {
    const supabase = initializeSupabase();

    // DOM elements
    const cameraGrid = document.getElementById("camera-grid");
    const addCameraBtn = document.getElementById("add-camera-btn");
    const addLeakbtn = document.getElementById("add-leak-btn");
    const cameraModal = document.getElementById("camera-modal");
    const zoomModal = document.getElementById("zoom-modal");
    const zoomPlayerElement = document.getElementById("zoomPlayerElement");
    const zoomClose = document.querySelector(".zoom-close");
    const zoomInBtn = document.getElementById("camera-zoomIn-btn");
    const zoomOutBtn = document.getElementById("camera-zoomOut-btn");
    const zoomResetBtn = document.getElementById("camera-zoomReset-btn");
    const leakModal = document.getElementById("leakModal");
    const leakClose = document.querySelector(".leak-close");
    const closeModal = document.querySelector(".close");
    const cameraForm = document.getElementById("camera-form");
    const modalTitle = document.getElementById("modal-title");
    const cancelBtn = document.getElementById("cancel-btn");

    const camsPerRowSelect = document.getElementById("camsPerRow");

    const countdownToggle = document.getElementById("toggleCountdown");
    const leaksToggle = document.getElementById("toggleLeaks");

    // Form fields
    const cameraIdField = document.getElementById("camera-id");
    const cameraTitleField = document.getElementById("camera-title");
    const cameraLocationField = document.getElementById("camera-location");
    const cameraTypeField = document.getElementById("camera-type");
    const cameraUrlField = document.getElementById("camera-url");
    const cameraScheduleLinkField = document.getElementById("schedule-link");

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

    const getUltraScheduleInfo = (allSchedules, stageName) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  const currentTimeInt = now.getHours() * 100 + now.getMinutes();

  const daySchedule = allSchedules[todayStr];
  if (!daySchedule || !daySchedule[stageName]) {
    return { current: "OFF AIR", next: "TBD", nextStart: null };
  }

  const stageSlots = daySchedule[stageName];
  let currentArtist = "OFF AIR";
  let nextArtist = "TBD";
  let stage = "UNKNOWN";
  let nextStart = null;

  for (let i = 0; i < stageSlots.length; i++) {
    const slot = stageSlots[i];
    const startInt = parseInt(slot.start.replace(":", ""));
    const endInt = parseInt(slot.end.replace(":", ""));

    if (currentTimeInt >= startInt && currentTimeInt < endInt) {
      currentArtist = slot.name;
      if (stageSlots[i + 1]) {
        nextArtist = stageSlots[i + 1].name;
        nextStart = stageSlots[i + 1].start; // Store "19:00"
      }
      stage = slot.stage;
      break;
    } else if (currentTimeInt < startInt) {
      currentArtist = "STARTING SOON";
      nextArtist = slot.name;
      nextStart = slot.start;
      break;
    }
  }

  return { current: currentArtist, next: nextArtist, nextStart, stage: stage };
};
const getCountdown = (startTimeStr) => {
  if (!startTimeStr) return "";
  
  const now = new Date();
  const [hours, minutes] = startTimeStr.split(":").map(Number);
  
  const target = new Date();
  target.setHours(hours, minutes, 0, 0);

  const diff = target - now;
  if (diff <= 0) return "Starting Now!";

  const mins = Math.floor(diff / 1000 / 60);
  const secs = Math.floor((diff / 1000) % 60);

  return `(${mins}m ${secs}s)`;
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

      //Edit BTN
      const editBtn = document.createElement("button");
      editBtn.className = "btn-icon";
      editBtn.title = "Edit";
      editBtn.innerHTML = '<span class="material-icons">edit</span>';
      editBtn.addEventListener("click", () => openModal(camera));

      if (camera.type === "hls") {
        //Zoom Btn
      const zoomBtn = document.createElement("button");
      zoomBtn.className = "btn-icon";
      zoomBtn.title = "Fullscreen";
      zoomBtn.innerHTML = '<span class="material-icons">fullscreen</span>';
      zoomBtn.addEventListener("click", () => cameraZoomModal(camera));
      cameraActions.appendChild(zoomBtn);
      };

      //Delete Btn
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

      const infoContainer = document.createElement("div");
      infoContainer.className = "camera-info-container"
      cameraInfo.appendChild(infoContainer);

      const schedInfo = getUltraScheduleInfo(schedule, camera.schedule);

      const currentlyPlayingDiv = document.createElement("div");
      currentlyPlayingDiv.className = "currently-playing-div";
      const currentlyPlayingSpan = document.createElement("span");
      currentlyPlayingSpan.className = "currently-playing-text";
      currentlyPlayingSpan.innerHTML = "Currently Playing: ";
      currentlyPlayingDiv.appendChild(currentlyPlayingSpan);
      const currentlyPlaying = document.createElement("span");
      currentlyPlaying.className = "currently-playing";
      currentlyPlaying.textContent = schedInfo.current;
      currentlyPlayingDiv.appendChild(currentlyPlaying);

      const upNextDiv = document.createElement("div");
      upNextDiv.className = "up-next-div";
      const upNextSpan = document.createElement("span");
      upNextSpan.className = "up-next-text";
      upNextSpan.innerHTML = "Up Next: ";
      upNextDiv.appendChild(upNextSpan);
      const upNext = document.createElement("span");
      upNext.className = "up-next";
      upNext.textContent = schedInfo.next;
      upNextDiv.appendChild(upNext);

      // Create timer element for up next
      const countdownSpan = document.createElement("span");
      countdownSpan.className = "up-next-countdown";

      upNextDiv.appendChild(countdownSpan);

      // Start the live update loop
      const updateUI = () => {
        const data = getUltraScheduleInfo(schedule, camera.schedule);
        currentlyPlaying.textContent = data.current;
        upNext.textContent = data.next;
  
        // Only show countdown if there is a next artist and they haven't started
        if (data.nextStart) {
          countdownSpan.textContent = getCountdown(data.nextStart);
        } else {
          countdownSpan.textContent = "";
        }
      };

      // Run every second for a smooth countdown
      const timerInterval = setInterval(updateUI, 1000);
      updateUI(); // Run once immediately

      const cameraSource = document.createElement("div");
      cameraSource.className = "camera-source";
      cameraSource.textContent = camera.type === "youtube" ? "YouTube" : "HLS";
      
      // SCHEDULE LINK ADD NEXT AND CURRENT HERE

      infoContainer.appendChild(currentlyPlayingDiv);
      infoContainer.appendChild(upNextDiv);
      if (schedInfo.stage) {
        const currentStageDiv = document.createElement("div");
        currentStageDiv.className = "current-stage-div";
        const CurrentStageSpan = document.createElement("span");
        CurrentStageSpan.className = "current-stage-text";
        CurrentStageSpan.innerHTML = "Current Stage: ";
        currentStageDiv.appendChild(CurrentStageSpan);
        const CurrentStage = document.createElement("span");
        CurrentStage.className = "current-stage";
        CurrentStage.textContent = schedInfo.stage;
        currentStageDiv.appendChild(CurrentStage);
        infoContainer.appendChild(currentStageDiv);
      };

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
    // Toggle btn's
    const Togglecountdown = () => {
      if (countdownState === false ){
        document.getElementById("mainCountdown").classList.remove('hidden');
        countdownState = true;
      } else {
        document.getElementById("mainCountdown").classList.add('hidden');
        countdownState = false;
      }
    }
    const Toggleleaks = () => {
      if (leakState === false ){
        document.getElementById("leaksPanel").classList.remove('hidden');
        leakState = true;
      } else {
        document.getElementById("leaksPanel").classList.add('hidden');
        leakState = false;
      }
    }

    countdownToggle?.addEventListener("click", () => Togglecountdown());
    leaksToggle?.addEventListener("click", () => Toggleleaks());


    // ---------- Modal ----------
    const openModal = (camera = null) => {
      if (camera) {
        modalTitle.textContent = "Edit Camera";
        cameraIdField.value = camera.id;
        cameraTitleField.value = camera.title || "";
        cameraLocationField.value = camera.location || "";
        cameraTypeField.value = camera.type || "youtube";
        cameraUrlField.value = camera.url || "";
        cameraScheduleLinkField.value = camera.schedule || "";

      } else {
        modalTitle.textContent = "Add Camera";
        cameraForm.reset();
        cameraIdField.value = "";
      }
      cameraModal.style.display = "block";
    };

    const cameraZoomModal = (camera = null) => {
      if (camera) {
        const video = document.createElement("video");
        video.id = "zoomVideo";
        video.muted = true;
        video.autoplay = true;
        video.style.width = "100%";
        video.style.height = "100%";
        zoomPlayerElement.appendChild(video);

        document.getElementById("zoom-cameraName").innerText = camera.location;

        if (window.Hls && Hls.isSupported()) {
          const hls = new Hls({
            lowLatencyMode: true,
            backBufferLength: 30,
          });

          hls.loadSource(camera.url);
          hls.attachMedia(video);
        }

        const zoomIn = () => {
          console.log("zoom in");
          scale += 0.1;
          applyTransform(true); // Enable transition for zooming
        };

        const zoomOut = () => {
          console.log("zoom out");
          scale -= 0.1;
          if (scale < 1) {
            scale = 1;
            offsetX = 0;
            offsetY = 0;
          }
          applyTransform(true); // Enable transition for zooming
        };

        const zoomReset = () => {
          scale = 1;
          offsetX = 0;
          offsetY = 0;
          applyTransform(true); // Enable transition for zooming
        };

        // Drag functionality
        let startX, startY;

        video.addEventListener('mousedown', (e) => {
          if (scale > 1) {
            isDragging = true;
            startX = e.clientX - offsetX;
            startY = e.clientY - offsetY;
            video.style.cursor = 'grabbing';
            video.style.transition = 'none'; // Disable transition during dragging
          }
        });

        video.addEventListener('mousemove', (e) => {
          if (isDragging) {
            offsetX = e.clientX - startX;
            offsetY = e.clientY - startY;
            applyTransform(false); // Disable transition during dragging
          }
        });

        video.addEventListener('mouseup', () => {
          if (isDragging) {
            isDragging = false;
            video.style.cursor = 'grab';
            video.style.transition = 'transform 0.3s ease'; // Re-enable transition after dragging
          }
        });

        video.addEventListener('mouseleave', () => {
          if (isDragging) {
            isDragging = false;
            video.style.cursor = 'grab';
            video.style.transition = 'transform 0.3s ease'; // Re-enable transition after dragging
          }
        });

        function applyTransform(enableTransition) {
          if (enableTransition) {
            video.style.transition = 'transform 0.3s ease'; // Enable transition for zooming
          }
          video.style.transform = `scale(${scale}) translate(${offsetX}px, ${offsetY}px)`;
        }
      
        zoomInBtn.addEventListener("click", () => zoomIn());
        zoomOutBtn.addEventListener("click", () => zoomOut());
        zoomResetBtn.addEventListener("click", () => zoomReset());
      }
      zoomModal.style.display = "block";
      applyTransform(true);
    };

    const openLeakModal = () => {
      leakModal.style.display = "block";
    }
    

    const closeModalWindow = () => {
      cameraModal.style.display = "none";
    };

    const closeZoomWindow = () => {
      zoomModal.style.display = "none";
      const zoomVideoElement = document.getElementById("zoomVideo");
      zoomVideoElement.remove();
    };

    const closeLeakWindow = () => {
      leakModal.style.display = "none";
    };

    const handleFormSubmit = async (e) => {
      e.preventDefault();

      const cameraData = {
        title: cameraTitleField.value.trim(),
        location: cameraLocationField.value.trim(),
        type: cameraTypeField.value,
        url: cameraUrlField.value.trim(),
        schedule: cameraScheduleLinkField.value,
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
    addLeakbtn?.addEventListener("click", () => openLeakModal());
    closeModal?.addEventListener("click", () => closeModalWindow());
    cancelBtn?.addEventListener("click", () => closeModalWindow());
    window.addEventListener("click", (e) => {
      if (e.target === cameraModal) closeModalWindow();
    });
    cameraForm?.addEventListener("submit", handleFormSubmit);
    zoomClose?.addEventListener("click", () => closeZoomWindow());
    leakClose?.addEventListener("click", () => closeLeakWindow());

    // ---------- Init ----------
    await loadCameras();
    initSortable();
  } catch (err) {
    console.error("Application initialization failed:", err);
    alert("Failed to initialize the application. Check console for details.");
  }
});