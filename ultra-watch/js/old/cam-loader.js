document.addEventListener('DOMContentLoaded', function() {
    // Camera configuration
    const cameraConfig = [
        { 
            id: 'video1', 
            url: 'https://usw01-smr03-relay.ozolio.com/hls-live/_definst_/relay01.ymswdhc.fd0.sm1.av2.mt0.at0.as0.dv0.sh2.rt24724.rc0.edge.basic.stream/playlist.m3u8',
            type: 'hls',
            name: 'InterContinental Hotel',
            location: 'Rooftop'
          },
          { 
            id: 'video2', 
            url: 'https://cdn77.ptztv.live/9XWPVhv6dkzdOX-VN-heTA==,1743382663/cdnorigin/pmw1mux.stream/playlist.m3u8?DVR',
            type: 'hls',
            name: 'PTZtv',
            location: 'Port of Miami'
          },
          { 
            id: 'video3',
            url: 'J-ADY6_9nnE',
            type: 'youtube',
            name: 'Ultra Miami',
            location: 'Mainstage'
          },
          { 
            id: 'video4',
            url: '87HdMoXKs_A',
            type: 'youtube',
            name: 'Ultra Miami',
            location: 'Megastructure'
          },
          { 
            id: 'video5',
            url: 'w8KO39bC1Rk',
            type: 'youtube',
            name: 'Ultra Miami',
            location: 'Cove'
          },
          { 
            id: 'video6',
            url: 'Gys7O4hJYBE',
            type: 'youtube',
            name: 'Ultra Miami',
            location: 'Worldwide'
          },
    ];
  
    // Initialize all cameras
    cameraConfig.forEach((camera, index) => {
      const cameraNum = index + 1;
      const container = ensureCameraContainer(cameraNum, camera);
      
      switch(camera.type) {
        case 'hls':
          initHlsCamera(container, camera);
          break;
        case 'youtube':
          initYouTubeCamera(container, camera);
          break;
        case 'direct':
          initDirectCamera(container, camera);
          break;
      }
      
      // Make clickable for fullscreen
      setupFullscreenClick(container);
    });
  
    // Ensure camera container exists with proper structure
    function ensureCameraContainer(num, camera) {
      let container = document.getElementById(`camera${num}`) || 
                     document.getElementById(camera.id)?.parentElement;
      
      if (!container) {
        container = document.createElement('div');
        container.id = `camera${num}`;
        container.className = 'camera-feed';
        document.querySelector('.camera-grid').appendChild(container);
        
        container.innerHTML = `
          <div class="camera-header">
            <span class="camera-id">${camera.name}</span>
            <span class="camera-status">LIVE</span>
          </div>
          <div class="camera-content"></div>
          <div class="camera-footer">${camera.location}</div>
        `;
      }
      return container;
    }
  
    // Initialize HLS camera with no controls
    function initHlsCamera(container, camera) {
      const content = container.querySelector('.camera-content');
      content.innerHTML = '';
      
      const video = document.createElement('video');
      video.id = camera.id;
      video.className = 'camera-video';
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.disablePictureInPicture = true;
      video.controls = false;
      
      content.appendChild(video);
      
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(camera.url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = camera.url;
        video.addEventListener('loadedmetadata', () => video.play());
      }
    }
  
    // Initialize YouTube with no controls
    function initYouTubeCamera(container, camera) {
        const content = container.querySelector('.camera-content');
        content.innerHTML = '';
        
        const videoId = camera.url.includes('youtube.com') ? 
                       camera.url.split('v=')[1].split('&')[0] : 
                       camera.url;
        
        // Create protective container
        const youtubeWrapper = document.createElement('div');
        youtubeWrapper.className = 'youtube-protected';
        content.appendChild(youtubeWrapper);
        
        // Create the iframe
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&disablekb=1&fs=0&modestbranding=1&playsinline=1&rel=0&enablejsapi=1&loop=1&playlist=${videoId}`;
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allow', 'accelerometer; autoplay; encrypted-media; gyroscope');
        iframe.className = 'youtube-iframe';
        youtubeWrapper.appendChild(iframe);
        
        // Create click-blocking overlay
        const overlay = document.createElement('div');
        overlay.className = 'youtube-overlay';
        youtubeWrapper.appendChild(overlay);
        
        // Add critical CSS
        const style = document.createElement('style');
        style.textContent = `
            .youtube-protected {
                position: relative;
                width: 100%;
                height: 100%;
            }
            .youtube-iframe {
                width: 100%;
                height: 100%;
                border: none;
            }
            .youtube-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10;
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);
        
        // Nuclear option to prevent pausing
        const forcePlay = setInterval(() => {
            try {
                iframe.contentWindow.postMessage(JSON.stringify({
                    event: 'command',
                    func: 'playVideo',
                    args: ''
                }), '*');
            } catch (e) {
                console.warn('YouTube control failed', e);
            }
        }, 1000); // Every second
        
        // Cleanup when leaving page
        window.addEventListener('beforeunload', () => {
            clearInterval(forcePlay);
        });
    }
  
    // Setup fullscreen on click for any camera
    // Modified fullscreen click handler
function setupFullscreenClick(container) {
  container.addEventListener('click', function() {
      const content = container.querySelector('.camera-content');
      
      // Check if currently in fullscreen
      if (document.fullscreenElement || 
          document.webkitFullscreenElement || 
          document.msFullscreenElement) {
          // Exit fullscreen
          if (document.exitFullscreen) {
              document.exitFullscreen();
          } else if (document.webkitExitFullscreen) {
              document.webkitExitFullscreen();
          } else if (document.msExitFullscreen) {
              document.msExitFullscreen();
          }
      } else {
          // Enter fullscreen
          if (content.requestFullscreen) {
              content.requestFullscreen({navigationUI: 'hide'});
          } else if (content.webkitRequestFullscreen) {
              content.webkitRequestFullscreen();
          } else if (content.msRequestFullscreen) {
              content.msRequestFullscreen();
          }
      }
  });
  
  // Style indicator for fullscreen state
  container.style.transition = 'all 0.3s';
  container.style.cursor = 'pointer';
  
  // Visual feedback when in fullscreen
  document.addEventListener('fullscreenchange', updateFullscreenStyle);
  document.addEventListener('webkitfullscreenchange', updateFullscreenStyle);
  document.addEventListener('msfullscreenchange', updateFullscreenStyle);
  
  function updateFullscreenStyle() {
      if (document.fullscreenElement) {
          container.style.boxShadow = '0 0 0 3px var(--glitch-color)';
      } else {
          container.style.boxShadow = 'none';
      }
  }
}
  
    // Time display
    function updateTime() {
      document.getElementById('time-display').textContent = 
        new Date().toLocaleTimeString('en-US', {hour12: false});
    }
    setInterval(updateTime, 1000);
    updateTime();
  });