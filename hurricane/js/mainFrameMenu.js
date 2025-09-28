// Modified menu creation with callback support
function createMenu() {
    const menuContainer = document.createElement('div');
    menuContainer.id = 'mainFrameMenu';
    menuContainer.style.cssText = `
        display: flex;
        background: #920A0C;
        padding: 10px;
        border-bottom: 2px solid #AC0E0D;
        gap: 10px;
        flex-wrap: wrap;
    `;

    const menuItems = [
        { 
            id: 'cameras', 
            label: 'Camera Feeds', 
            content: getCameraContent(),
            callback: initializeCameraSystem // Reference to your camera init function
        },
        { 
            id: 'radar', 
            label: 'Weather Radar', 
            content: getRadarMap(),
            callback: initializeMap2
        },
        { 
            id: 'weather', 
            label: 'Weather Data', 
            content: '<div style="padding: 20px; text-align: center;"><h3>Weather Data View</h3><p>Weather information will be displayed here</p></div>',
        },
        // ... other menu items
    ];

    menuItems.forEach((item, index) => {
        const button = document.createElement('button');
        button.id = `menu-${item.id}`;
        button.textContent = item.label;
        button.style.cssText = `
            padding: 10px 20px;
            background: #3498db;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-family: 'Roboto', sans-serif;
            font-weight: 500;
            transition: background 0.3s ease;
        `;

        button.addEventListener('click', () => {
            // Remove active class from all buttons
            document.querySelectorAll('#mainFrameMenu button').forEach(btn => {
                btn.classList.remove('active');
                btn.style.background = '#3498db';
            });
            
            // Add active class to clicked button
            button.classList.add('active');
            button.style.background = '#e74c3c';
            
            // Update mainFrame content and run callback
            updateMainFrameContent(item.content, item.callback);
        });

        if (index === 0) {
            button.classList.add('active');
            button.style.background = '#e74c3c';
        }

        menuContainer.appendChild(button);
    });

    const mainFrame = document.getElementById('MainFrame');
    mainFrame.parentNode.insertBefore(menuContainer, mainFrame);

    // Load initial content with callback
    updateMainFrameContent(menuItems[0].content, menuItems[0].callback);
}

// Modified update function to handle callbacks
function updateMainFrameContent(content, callback = null) {
    const mainFrame = document.getElementById('MainFrame');
    mainFrame.innerHTML = content;
    
    // Wait for DOM to be updated, then run callback
    setTimeout(() => {
        if (callback && typeof callback === 'function') {
            callback();
        }
    }, 100);
}

// Function to generate radar content
function getRadarMap() {
    return `
    <div id="map2"></div>
    `;
}
// Function to generate camera content

function getCameraContent() {
    return `
    <div class="cameras" id="cameraSystem">  
    <div class="container">
        <div class="controls">
            <button class="btn-primary" id="add-camera-btn">
                <span class="material-icons">add</span> Add Camera
            </button>
        </div>
        
        <div class="camera-grid" id="camera-grid">
            <!-- Example Camera Card (will be populated by JavaScript) -->
            <div class="camera-card">
                <div class="camera-header">
                    <div>
                        <span class="camera-title">Israel Skyline (Time New)</span>
                        <span class="camera-live-badge">LIVE</span>
                    </div>
                    <div class="camera-actions">
                        <button class="btn-icon" title="Edit">
                            <span class="material-icons">edit</span>
                        </button>
                        <button class="btn-icon" title="Delete">
                            <span class="material-icons">delete</span>
                        </button>
                    </div>
                </div>
                <div class="camera-player">
                    <div class="camera-offline">This live stream recording is not available.</div>
                </div>
                <div class="camera-info">
                    <div class="camera-location">Tel Aviv, Israel</div>
                    <div class="camera-source">YouTube</div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Add/Edit Camera Modal -->
    <div id="camera-modal" class="modal">
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2 id="modal-title">Add Camera</h2>
            <form id="camera-form">
                <input type="hidden" id="camera-id">
                <div class="form-group">
                    <label for="camera-title">Camera Title:</label>
                    <input type="text" id="camera-title" placeholder="e.g., Israel Skyline" required>
                </div>
                <div class="form-group">
                    <label for="camera-location">Location:</label>
                    <input type="text" id="camera-location" placeholder="e.g., Tel Aviv, Israel" required>
                </div>
                <div class="form-group">
                    <label for="camera-type">Stream Type:</label>
                    <select id="camera-type" required>
                        <option value="youtube">YouTube</option>
                        <option value="hls">HLS (.m3u8)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="camera-url">Stream URL:</label>
                    <input type="text" id="camera-url" placeholder="Enter stream URL" required>
                    <small class="form-hint">For YouTube: https://www.youtube.com/embed/VIDEO_ID</small>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" id="cancel-btn">Cancel</button>
                    <button type="submit" class="btn-primary">Save Camera</button>
                </div>
            </form>
        </div>
    </div>
</div>
    `
}



// Enhanced version with grid layout for cameras
function getCameraContentGrid() {
    return `
        <div class="cameras" id="cameraSystem">  
    <div class="container">
        <div class="controls">
            <button class="btn-primary" id="add-camera-btn">
                <span class="material-icons">add</span> Add Camera
            </button>
        </div>
        
        <div class="camera-grid" id="camera-grid">
            <!-- Example Camera Card (will be populated by JavaScript) -->
            <div class="camera-card">
                <div class="camera-header">
                    <div>
                        <span class="camera-title">Israel Skyline (Time New)</span>
                        <span class="camera-live-badge">LIVE</span>
                    </div>
                    <div class="camera-actions">
                        <button class="btn-icon" title="Edit">
                            <span class="material-icons">edit</span>
                        </button>
                        <button class="btn-icon" title="Delete">
                            <span class="material-icons">delete</span>
                        </button>
                    </div>
                </div>
                <div class="camera-player">
                    <div class="camera-offline">This live stream recording is not available.</div>
                </div>
                <div class="camera-info">
                    <div class="camera-location">Tel Aviv, Israel</div>
                    <div class="camera-source">YouTube</div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Add/Edit Camera Modal -->
    <div id="camera-modal" class="modal">
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2 id="modal-title">Add Camera</h2>
            <form id="camera-form">
                <input type="hidden" id="camera-id">
                <div class="form-group">
                    <label for="camera-title">Camera Title:</label>
                    <input type="text" id="camera-title" placeholder="e.g., Israel Skyline" required>
                </div>
                <div class="form-group">
                    <label for="camera-location">Location:</label>
                    <input type="text" id="camera-location" placeholder="e.g., Tel Aviv, Israel" required>
                </div>
                <div class="form-group">
                    <label for="camera-type">Stream Type:</label>
                    <select id="camera-type" required>
                        <option value="youtube">YouTube</option>
                        <option value="hls">HLS (.m3u8)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="camera-url">Stream URL:</label>
                    <input type="text" id="camera-url" placeholder="Enter stream URL" required>
                    <small class="form-hint">For YouTube: https://www.youtube.com/embed/VIDEO_ID</small>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" id="cancel-btn">Cancel</button>
                    <button type="submit" class="btn-primary">Save Camera</button>
                </div>
            </form>
        </div>
    </div>
</div>
    `;
}


// Initialize the menu when the page loads
document.addEventListener('DOMContentLoaded', function() {
    createMenu();
});

// Optional: Add CSS for better styling
const style = document.createElement('style');
style.textContent = `
    #mainFrameMenu button.active {
        background: #e74c3c !important;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }
    
    #mainFrameMenu button:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    
    .mainFrame {
        min-height: 500px;
    }
    
    .camera-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
        padding: 20px;
    }
`;
document.head.appendChild(style);