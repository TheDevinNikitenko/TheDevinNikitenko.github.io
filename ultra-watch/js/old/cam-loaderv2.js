document.addEventListener('DOMContentLoaded', function() {
    // Camera configuration with categories
    const cameraConfig = [
        { 
            id: '',
            url: 'bk8r4QXTkoA',
            type: 'youtube',
            name: 'Israel Skyline (Times News)',
            location: 'Tel Aviv, Israel',
            category: 'Israel'
        },
        { 
            id: '',
            url: 'LjeNQdOM5Jg',
            type: 'youtube',
            name: 'Israel Skyline (Associated Press)',
            location: 'Tel Aviv, Israel',
            category: 'Israel'
        },

    ];

    // Get all unique categories
    const categories = ['all', ...new Set(cameraConfig.map(cam => cam.category))];
    const categorySelect = document.getElementById('category-select');
    
    // Populate category dropdown
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category === 'all' ? 'All Cameras' : 
                            category.charAt(0).toUpperCase() + category.slice(1);
        categorySelect.appendChild(option);
    });
    
    // Current active cameras
    let activeCameras = [];
    
    // Load cameras based on selected category
    function loadCameras(category) {
        // Clear existing cameras
        document.querySelector('.camera-grid').innerHTML = '';
        activeCameras = [];
        
        // Filter cameras by category
        const camerasToLoad = category === 'all' 
            ? cameraConfig 
            : cameraConfig.filter(cam => cam.category === category);
        
        // Initialize cameras
        camerasToLoad.forEach((camera, index) => {
            const container = ensureCameraContainer(index + 1, camera);
            activeCameras.push(container);
            
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
            
            setupFullscreenClick(container);
        });
    }
    
    // Category change handler
    categorySelect.addEventListener('change', function() {
        loadCameras(this.value);
    });
    
    // Initial load (show all cameras by default)
    loadCameras('all');

    // Ensure camera container exists with proper structure
    function ensureCameraContainer(num, camera) {
        const container = document.createElement('div');
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

    // Initialize direct video stream
    function initDirectCamera(container, camera) {
        const content = container.querySelector('.camera-content');
        content.innerHTML = '';
        
        const video = document.createElement('video');
        video.id = camera.id;
        video.className = 'camera-video';
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        video.controls = false;
        video.src = camera.url;
        
        content.appendChild(video);
        video.play().catch(e => console.warn('Autoplay prevented:', e));
    }

    // Setup fullscreen on click for any camera
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
    function updateTimes() {
        const now = new Date();
            
        // Zulu Time (UTC)
        const utcTime = now.toISOString().substr(11, 8) + "Z";
        document.getElementById('zulu-time').textContent = utcTime;
            
        // Israel Time (IST) - CORRECTED
        const israelFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Jerusalem',
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'short'
        });
    
        const israelParts = israelFormatter.formatToParts(now);
        const israelTime = {
            hour: israelParts.find(part => part.type === 'hour').value.padStart(2, '0'),
            minute: israelParts.find(part => part.type === 'minute').value.padStart(2, '0'),
            second: israelParts.find(part => part.type === 'second').value.padStart(2, '0')
        };
        const israelStr = `${israelTime.hour}:${israelTime.minute}:${israelTime.second}`;
        document.getElementById('israel-time').textContent = israelStr;
            
        // Eastern Time (EST - UTC-5)
        // For Eastern Time
        const estFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/New_York',
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
    });

    function formatTime(date) {
        return estFormatter.format(date).replace(/^24/, '00');
    }

    document.getElementById('est-time').textContent = formatTime(new Date());
    }

    setInterval(updateTimes, 1000);
    updateTimes(); // Initial call
});