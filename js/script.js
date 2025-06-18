document.addEventListener("DOMContentLoaded", () => {

  // DOM elements
  const timeDisplay = document.getElementById("time-display");
  const logContent = document.getElementById("log-content");

  // Camera data (now properly structured)
  const videoSources = [
    {
      id: "hotel-rooftop",
      name: "InterContinental Hotel",
      location: "Rooftop",
      streamUrl: "https://usw01-smr03-relay.ozolio.com/hls-live/_definst_/relay01.ymswdhc.fd0.sm1.av2.mt0.at0.as0.dv0.sh2.rt24724.rc0.edge.basic.stream/playlist.m3u8"
    }
  ];

  // Initialize the camera grid
  createCameraGrid(videoSources);

  function initializeSystem() {
    // Set current time
    updateTime();
    setInterval(updateTime, 1000);

    // Log initialization
    logEvent("SYSTEM INITIALIZED");
    logEvent("LOADING CAMERA FEEDS...");

  }

  // Update time display
  function updateTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    timeDisplay.textContent = `${hours}:${minutes}:${seconds}`;
  }

  // Log events to terminal
  function logEvent(message) {
    const timestamp = timeDisplay.textContent;
    logContent.innerHTML =
      `> [${timestamp}] ${message}<br>` + logContent.innerHTML;
    logContent.scrollTop = 0;
  }

  // Toggle fullscreen for a camera when clicked
  cameraFeeds.forEach((feed) => {
    feed.addEventListener("click", () => {
      // If already fullscreen, revert back
      if (feed.classList.contains("fullscreen")) {
        feed.classList.remove("fullscreen");
        document.body.style.overflow = "auto";
      } else {
        // Remove fullscreen from any other feed
        document.querySelectorAll(".camera-feed.fullscreen").forEach((f) => {
          f.classList.remove("fullscreen");
        });

        // Make this feed fullscreen
        feed.classList.add("fullscreen");
        document.body.style.overflow = "hidden";

        // Log the action
        const cameraId = feed.querySelector(".camera-id").textContent;
        logEvent(`EXPANDED VIEW: ${cameraId}`);
      }
    });
  });

  // Handle escape key to exit fullscreen
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      const fullscreenCamera = document.querySelector(
        ".camera-feed.fullscreen"
      );
      if (fullscreenCamera) {
        fullscreenCamera.classList.remove("fullscreen");
        document.body.style.overflow = "auto";
      }
    }
  });
  initializeSystem();
});

function createCameraGrid(cameras, containerSelector = 'body') {
  const container = document.querySelector(containerSelector) || document.body;
  
  // Use existing grid or create one
  let grid = document.querySelector('.camera-grid');
  if (!grid) {
    grid = document.createElement('div');
    grid.className = 'camera-grid';
    container.appendChild(grid);
  }

  // Clear existing content
  grid.innerHTML = '';

  // Create a camera feed for each entry
  cameras.forEach((camera) => {
    const cameraFeed = document.createElement('div');
    cameraFeed.className = 'camera-feed';
    cameraFeed.id = `camera-${camera.id}`;

    // Camera header
    const header = document.createElement('div');
    header.className = 'camera-header';
    header.innerHTML = `
      <span class="camera-id">${camera.name}</span>
      <span class="camera-status">LIVE</span>
    `;

    // Video container
    const content = document.createElement('div');
    content.className = 'camera-content';

    const video = document.createElement('video');
    video.className = 'camera-video';
    video.id = `video-${camera.id}`;
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;

    content.appendChild(video);
    
    // Camera footer
    const footer = document.createElement('div');
    footer.className = 'camera-footer';
    footer.textContent = camera.location;

    // Assemble the feed
    cameraFeed.appendChild(header);
    cameraFeed.appendChild(content);
    cameraFeed.appendChild(footer);
    grid.appendChild(cameraFeed);

    // Load HLS stream
    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(camera.streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(e => console.error(`Autoplay failed for ${camera.name}:`, e));
      });
    } 
    // Safari fallback
    else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = camera.streamUrl;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(e => console.error(`Autoplay failed for ${camera.name}:`, e));
      });
    } else {
      console.error(`HLS not supported for ${camera.name}`);
    }
  });
}