// Weather API Configuration
const WEATHER_API_KEY = '6eeb1f299bd5dcc728b801ab6f8ccc2a'; // Replace with actual API key
const MIAMI_COORDS = { lat: 25.77514011394438, lon: -80.18587099325342 };

// Fetch weather data
async function fetchWeather() {
    try {
        // Using OpenWeatherMap API - you'll need to sign up for a free API key
        const response = await fetch(
            `https://api.openweathermap.org/data/3.0/onecall?lat=${MIAMI_COORDS.lat}&lon=${MIAMI_COORDS.lon}&exclude=minutely,hourly&units=imperial&appid=${WEATHER_API_KEY}`
        );
        const data = await response.json();
        updateWeatherDisplay(data);
    } catch (error) {
        console.error('Error fetching weather:', error);
        document.getElementById('current-condition').textContent = 'Weather unavailable';
    }
}

// Update weather display
function updateWeatherDisplay(weatherData) {
    // Current weather
    const current = weatherData.current;
    document.getElementById('current-temp').textContent = `${Math.round(current.temp)}°`;
    document.getElementById('current-condition').textContent = current.weather[0].main;
    document.getElementById('feels-like').textContent = `${Math.round(current.feels_like)}°`;
    document.getElementById('humidity').textContent = `${current.humidity}%`;
    document.getElementById('current-weather-icon').textContent = getWeatherIcon(current.weather[0].id, current.weather[0].icon);
    
    // Forecast
    const forecastContainer = document.getElementById('weather-forecast');
    forecastContainer.innerHTML = '';
    
    // Show next 3 days (skip today)
    for (let i = 1; i <= 3; i++) {
        const day = weatherData.daily[i];
        const date = new Date(day.dt * 1000);
        const dayElement = document.createElement('div');
        dayElement.className = 'forecast-day';
        
        dayElement.innerHTML = `
            <div class="forecast-date">${date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
            <div class="forecast-icon">${getWeatherIcon(day.weather[0].id, day.weather[0].icon)}</div>
            <div class="forecast-temp">
                <span class="forecast-high">${Math.round(day.temp.max)}°</span>
                <span class="forecast-low">${Math.round(day.temp.min)}°</span>
            </div>
        `;
        
        forecastContainer.appendChild(dayElement);
    }
}

// Get appropriate weather icon
function getWeatherIcon(conditionCode, iconCode) {
    const isDay = iconCode.includes('d');
    
    switch (true) {
        case conditionCode >= 200 && conditionCode < 300: return '⛈️';
        case conditionCode >= 300 && conditionCode < 400: return '🌧️';
        case conditionCode >= 500 && conditionCode < 600: return isDay ? '🌦️' : '🌧️';
        case conditionCode >= 600 && conditionCode < 700: return '❄️';
        case conditionCode >= 700 && conditionCode < 800: return '🌫️';
        case conditionCode === 800: return isDay ? '☀️' : '🌙';
        case conditionCode === 801: return isDay ? '🌤️' : '☁️';
        case conditionCode > 801: return '☁️';
        default: return '🌈';
    }
}

// Update weather every 30 minutes
function startWeatherUpdates() {
    fetchWeather();
    setInterval(fetchWeather, 30 * 60 * 1000);
}

// Add this to your DOMContentLoaded event:
document.addEventListener('DOMContentLoaded', () => {
    updateTime();
    renderSchedule();
    startWeatherUpdates(); // <-- Add this line
    setInterval(updateTime, 1000);
    setInterval(checkForSetChanges, 1000);
});