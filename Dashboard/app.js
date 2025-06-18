// Initialize Supabase client
const initializeSupabase = () => {
    const supabaseUrl = 'https://ydnehaauuwonrogrzyxz.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbmVoYWF1dXdvbnJvZ3J6eXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxOTcyNTMsImV4cCI6MjA2NTc3MzI1M30.XQ9mpxMb9zSQUZZnLQ-hjnGf6YCGmvZYx0HqQO4IMxs';
    return supabase.createClient(supabaseUrl, supabaseKey);
};

// Main application
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize Supabase
        const supabase = initializeSupabase();
        
        // DOM elements
        const cameraGrid = document.getElementById('camera-grid');
        const addCameraBtn = document.getElementById('add-camera-btn');
        const cameraModal = document.getElementById('camera-modal');
        const closeModal = document.querySelector('.close');
        const cameraForm = document.getElementById('camera-form');
        const modalTitle = document.getElementById('modal-title');
        const cancelBtn = document.getElementById('cancel-btn');

        // Form fields
        const cameraIdField = document.getElementById('camera-id');
        const cameraTitleField = document.getElementById('camera-title');
        const cameraLocationField = document.getElementById('camera-location');
        const cameraTypeField = document.getElementById('camera-type');
        const cameraUrlField = document.getElementById('camera-url');

        // HLS.js instances
        const hlsInstances = {};

        // Load cameras from Supabase
        const loadCameras = async () => {
            try {
                const { data, error } = await supabase
                    .from('cameras')
                    .select('*')
                    .order('created_at', { ascending: true });
                
                if (error) throw error;
                
                cameraGrid.innerHTML = '';
                
                if (data && data.length > 0) {
                    data.forEach(camera => {
                        addCameraToGrid(camera);
                    });
                } else {
                    cameraGrid.innerHTML = '<p>No cameras found. Add one to get started.</p>';
                }
            } catch (error) {
                console.error('Error loading cameras:', error.message);
                alert('Failed to load cameras. Check console for details.');
            }
        };

        // Add camera to the grid
        const addCameraToGrid = (camera) => {
            const cameraCard = document.createElement('div');
            cameraCard.className = 'camera-card';
            cameraCard.dataset.id = camera.id;
            
            // Camera Header
            const cameraHeader = document.createElement('div');
            cameraHeader.className = 'camera-header';
            
            const titleContainer = document.createElement('div');
            
            const cameraTitle = document.createElement('span');
            cameraTitle.className = 'camera-title';
            cameraTitle.textContent = camera.title;
            
            const liveBadge = document.createElement('span');
            liveBadge.className = 'camera-live-badge';
            liveBadge.textContent = 'LIVE';
            
            titleContainer.appendChild(cameraTitle);
            titleContainer.appendChild(liveBadge);
            
            const cameraActions = document.createElement('div');
            cameraActions.className = 'camera-actions';
            
            // Edit button with icon
            const editBtn = document.createElement('button');
            editBtn.className = 'btn-icon';
            editBtn.title = 'Edit';
            editBtn.innerHTML = '<span class="material-icons">edit</span>';
            editBtn.addEventListener('click', () => openModal(camera));
            
            // Delete button with icon
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-icon';
            deleteBtn.title = 'Delete';
            deleteBtn.innerHTML = '<span class="material-icons">delete</span>';
            deleteBtn.addEventListener('click', () => deleteCamera(camera.id));
            
            cameraActions.appendChild(editBtn);
            cameraActions.appendChild(deleteBtn);
            
            cameraHeader.appendChild(titleContainer);
            cameraHeader.appendChild(cameraActions);
            
            // Camera Player
            const cameraPlayer = document.createElement('div');
            cameraPlayer.className = 'camera-player';
            cameraPlayer.id = `player-${camera.id}`;
            
            // Camera Info Footer
            const cameraInfo = document.createElement('div');
            cameraInfo.className = 'camera-info';
            
            const cameraLocation = document.createElement('div');
            cameraLocation.className = 'camera-location';
            cameraLocation.textContent = camera.location;
            
            const cameraSource = document.createElement('div');
            cameraSource.className = 'camera-source';
            cameraSource.textContent = camera.type === 'youtube' ? 'YouTube' : 'HLS';
            
            cameraInfo.appendChild(cameraLocation);
            cameraInfo.appendChild(cameraSource);
            
            // Assemble card
            cameraCard.appendChild(cameraHeader);
            cameraCard.appendChild(cameraPlayer);
            cameraCard.appendChild(cameraInfo);
            
            cameraGrid.appendChild(cameraCard);
            
            // Initialize the player
            initPlayer(camera);
        };

        // Initialize the video player based on stream type
        const initPlayer = (camera) => {
            const playerElement = document.getElementById(`player-${camera.id}`);
            
            if (camera.type === 'youtube') {
                // YouTube embed
                playerElement.innerHTML = `
                    <iframe 
                        width="100%" 
                        height="100%" 
                        src="${camera.url}?autoplay=1&mute=1" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen>
                    </iframe>
                `;
            } else if (camera.type === 'hls') {
                // HLS stream
                if (Hls.isSupported()) {
                    const video = document.createElement('video');
                    video.controls = true;
                    video.muted = true;
                    video.autoplay = true;
                    video.style.width = '100%';
                    video.style.height = '100%';
                    playerElement.appendChild(video);
                    
                    const hls = new Hls();
                    hls.loadSource(camera.url);
                    hls.attachMedia(video);
                    hls.on(Hls.Events.MANIFEST_PARSED, function() {
                        video.play();
                    });
                    
                    // Store HLS instance for cleanup
                    hlsInstances[camera.id] = hls;
                } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                    // For Safari
                    const video = document.createElement('video');
                    video.controls = true;
                    video.muted = true;
                    video.autoplay = true;
                    video.style.width = '100%';
                    video.style.height = '100%';
                    playerElement.appendChild(video);
                    video.src = camera.url;
                } else {
                    playerElement.innerHTML = '<div class="camera-offline">HLS is not supported in this browser.</div>';
                }
            }
        };

        // Open modal for adding/editing camera
        const openModal = (camera = null) => {
            if (camera) {
                // Edit mode
                modalTitle.textContent = 'Edit Camera';
                cameraIdField.value = camera.id;
                cameraTitleField.value = camera.title;
                cameraLocationField.value = camera.location;
                cameraTypeField.value = camera.type;
                cameraUrlField.value = camera.url;
            } else {
                // Add mode
                modalTitle.textContent = 'Add Camera';
                cameraForm.reset();
                cameraIdField.value = '';
            }
            
            cameraModal.style.display = 'block';
        };

        // Close modal
        const closeModalWindow = () => {
            cameraModal.style.display = 'none';
        };

        // Handle form submission
        const handleFormSubmit = async (e) => {
            e.preventDefault();
            
            const cameraData = {
                title: cameraTitleField.value.trim(),
                location: cameraLocationField.value.trim(),
                type: cameraTypeField.value,
                url: cameraUrlField.value.trim()
            };
            
            if (cameraIdField.value) {
                // Update existing camera
                await updateCamera(cameraIdField.value, cameraData);
            } else {
                // Add new camera
                await addCamera(cameraData);
            }
            
            closeModalWindow();
        };

        // Add new camera to Supabase
        const addCamera = async (cameraData) => {
            try {
                const { data, error } = await supabase
                    .from('cameras')
                    .insert([cameraData])
                    .select();
                
                if (error) throw error;
                
                if (data && data.length > 0) {
                    addCameraToGrid(data[0]);
                }
            } catch (error) {
                console.error('Error adding camera:', error.message);
                alert('Failed to add camera. Check console for details.');
            }
        };

        // Update camera in Supabase
        const updateCamera = async (id, cameraData) => {
            try {
                const { data, error } = await supabase
                    .from('cameras')
                    .update(cameraData)
                    .eq('id', id)
                    .select();
                
                if (error) throw error;
                
                if (data && data.length > 0) {
                    // Remove old camera and add updated one
                    const cameraElement = document.querySelector(`.camera-card[data-id="${id}"]`);
                    if (cameraElement) cameraElement.remove();
                    
                    // Clean up HLS instance if it exists
                    if (hlsInstances[id]) {
                        hlsInstances[id].destroy();
                        delete hlsInstances[id];
                    }
                    
                    addCameraToGrid(data[0]);
                }
            } catch (error) {
                console.error('Error updating camera:', error.message);
                alert('Failed to update camera. Check console for details.');
            }
        };

        // Delete camera from Supabase
        const deleteCamera = async (id) => {
            if (!confirm('Are you sure you want to delete this camera?')) return;
            
            try {
                const { error } = await supabase
                    .from('cameras')
                    .delete()
                    .eq('id', id);
                
                if (error) throw error;
                
                // Remove camera from DOM
                const cameraElement = document.querySelector(`.camera-card[data-id="${id}"]`);
                if (cameraElement) cameraElement.remove();
                
                // Clean up HLS instance if it exists
                if (hlsInstances[id]) {
                    hlsInstances[id].destroy();
                    delete hlsInstances[id];
                }
            } catch (error) {
                console.error('Error deleting camera:', error.message);
                alert('Failed to delete camera. Check console for details.');
            }
        };

        // Event listeners
        addCameraBtn.addEventListener('click', () => openModal());
        closeModal.addEventListener('click', () => closeModalWindow());
        cancelBtn.addEventListener('click', () => closeModalWindow());
        window.addEventListener('click', (e) => {
            if (e.target === cameraModal) closeModalWindow();
        });
        
        cameraForm.addEventListener('submit', handleFormSubmit);

        // Initial load
        await loadCameras();

    } catch (error) {
        console.error('Application initialization failed:', error);
        alert('Failed to initialize the application. Check console for details.');
    }

    //World Clock(s)
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