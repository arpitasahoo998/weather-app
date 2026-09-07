document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('citySearch');
    const searchResults = document.getElementById('searchResults');
    
    // UI Elements
    const cityNameEl = document.getElementById('cityName');
    const localTimeEl = document.getElementById('localTime');
    const currentTempEl = document.getElementById('currentTemp');
    const weatherDescEl = document.getElementById('weatherDesc');
    const highTempEl = document.getElementById('highTemp');
    const lowTempEl = document.getElementById('lowTemp');
    const hourlyContainer = document.getElementById('hourlyContainer');
    const dailyContainer = document.getElementById('dailyContainer');
    
    // Metrics
    const uvIndexEl = document.getElementById('uvIndex');
    const uvDescEl = document.getElementById('uvDesc');
    const windSpeedEl = document.getElementById('windSpeed');
    const humidityEl = document.getElementById('humidity');
    const visibilityEl = document.getElementById('visibility');

    let debounceTimer;

    // Open-Meteo WMO Weather interpretation codes
    function getWeatherCodeDetails(code, isDay = 1) {
        const codes = {
            0: { desc: 'Clear sky', icon: isDay ? 'bx-sun' : 'bx-moon', theme: 'weather-clear-day' },
            1: { desc: 'Mainly clear', icon: isDay ? 'bx-sun' : 'bx-moon', theme: 'weather-clear-day' },
            2: { desc: 'Partly cloudy', icon: 'bx-cloud', theme: 'weather-cloudy-day' },
            3: { desc: 'Overcast', icon: 'bx-cloud', theme: 'weather-cloudy-day' },
            45: { desc: 'Fog', icon: 'bx-water', theme: 'weather-cloudy-day' },
            48: { desc: 'Depositing rime fog', icon: 'bx-water', theme: 'weather-cloudy-day' },
            51: { desc: 'Light drizzle', icon: 'bx-cloud-drizzle', theme: 'weather-rain' },
            53: { desc: 'Moderate drizzle', icon: 'bx-cloud-drizzle', theme: 'weather-rain' },
            55: { desc: 'Dense drizzle', icon: 'bx-cloud-drizzle', theme: 'weather-rain' },
            61: { desc: 'Slight rain', icon: 'bx-cloud-rain', theme: 'weather-rain' },
            63: { desc: 'Moderate rain', icon: 'bx-cloud-rain', theme: 'weather-rain' },
            65: { desc: 'Heavy rain', icon: 'bx-cloud-rain', theme: 'weather-rain' },
            71: { desc: 'Slight snow fall', icon: 'bx-cloud-snow', theme: 'weather-snow' },
            73: { desc: 'Moderate snow fall', icon: 'bx-cloud-snow', theme: 'weather-snow' },
            75: { desc: 'Heavy snow fall', icon: 'bx-cloud-snow', theme: 'weather-snow' },
            95: { desc: 'Thunderstorm', icon: 'bx-cloud-lightning', theme: 'weather-rain' },
        };
        return codes[code] || { desc: 'Unknown', icon: 'bx-cloud', theme: 'weather-cloudy-day' };
    }

    // Initialize with a default city (e.g. Bhubaneswar)
    fetchWeather(20.2961, 85.8245, 'Bhubaneswar');

    // Debounced Search Input
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const query = e.target.value.trim();
        
        if (query.length < 2) {
            searchResults.classList.add('hidden');
            return;
        }

        debounceTimer = setTimeout(() => {
            searchCity(query);
        }, 500);
    });

    // Close search results on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-header')) {
            searchResults.classList.add('hidden');
        }
    });

    async function searchCity(query) {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
            const data = await res.json();
            
            searchResults.innerHTML = '';
            if (data.length === 0) {
                searchResults.innerHTML = '<li>No results found</li>';
            } else {
                data.forEach(place => {
                    const li = document.createElement('li');
                    // Format nice display name
                    const nameParts = place.display_name.split(', ');
                    li.textContent = `${nameParts[0]}, ${nameParts[nameParts.length-1]}`;
                    li.addEventListener('click', () => {
                        searchInput.value = '';
                        searchResults.classList.add('hidden');
                        fetchWeather(place.lat, place.lon, nameParts[0]);
                    });
                    searchResults.appendChild(li);
                });
            }
            searchResults.classList.remove('hidden');
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    async function fetchWeather(lat, lon, cityName) {
        try {
            // Display loading state
            cityNameEl.textContent = cityName;
            weatherDescEl.textContent = 'Fetching forecast...';

            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,is_day,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max&timezone=auto`;
            
            const res = await fetch(url);
            const data = await res.json();

            updateUI(data, cityName);
        } catch (error) {
            console.error('Weather fetch error:', error);
            weatherDescEl.textContent = 'Error loading data';
        }
    }

    function updateUI(data, cityName) {
        // Current weather
        const current = data.current;
        const daily = data.daily;
        const details = getWeatherCodeDetails(current.weather_code, current.is_day);

        // Update Theme
        document.body.className = '';
        if (current.is_day === 0 && details.theme.includes('day')) {
            document.body.classList.add(details.theme.replace('day', 'night'));
        } else {
            document.body.classList.add(details.theme);
        }

        // Header
        const timeParts = current.time.split('T')[1].split(':'); // e.g. "14:15" -> ["14", "15"]
        let hour = parseInt(timeParts[0]);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12 || 12; // convert to 12-hour format
        localTimeEl.textContent = `${hour}:${timeParts[1]} ${ampm}`;

        currentTempEl.innerHTML = `${Math.round(current.temperature_2m)}&deg;`;
        weatherDescEl.textContent = details.desc;
        highTempEl.innerHTML = `H:${Math.round(daily.temperature_2m_max[0])}&deg;`;
        lowTempEl.innerHTML = `L:${Math.round(daily.temperature_2m_min[0])}&deg;`;

        // Hourly
        hourlyContainer.innerHTML = '';
        
        // Find the current hour in the target location's timezone
        const currentHourPrefix = current.time.substring(0, 13) + ":00";
        let startIndex = data.hourly.time.indexOf(currentHourPrefix);
        if (startIndex === -1) startIndex = 0; // fallback

        // Just take the next 24 hours
        for (let i = startIndex; i < startIndex + 24; i++) {
            const hData = data.hourly;
            if (!hData.time[i]) break; // prevent out of bounds

            const hourCode = getWeatherCodeDetails(hData.weather_code[i], hData.is_day[i]);
            
            // Format time manually to avoid browser timezone shift
            const timeStr = hData.time[i]; // e.g. "2024-05-18T14:00"
            let hourNum = parseInt(timeStr.split('T')[1].split(':')[0]);
            
            let displayTime;
            if (i === startIndex) {
                displayTime = 'Now';
            } else {
                const ampm = hourNum >= 12 ? 'PM' : 'AM';
                hourNum = hourNum % 12 || 12;
                displayTime = `${hourNum} ${ampm}`;
            }

            hourlyContainer.innerHTML += `
                <div class="hourly-item">
                    <span class="hourly-time">${displayTime}</span>
                    <i class='bx ${hourCode.icon} hourly-icon'></i>
                    <span class="hourly-temp">${Math.round(hData.temperature_2m[i])}&deg;</span>
                </div>
            `;
        }

        // Daily
        dailyContainer.innerHTML = '';
        for (let i = 0; i < 7; i++) {
            if (!daily.time[i]) break;
            // Parse as UTC to prevent browser timezone from shifting the day
            const date = new Date(daily.time[i] + 'T12:00:00Z');
            const dayName = i === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
            const dCode = getWeatherCodeDetails(daily.weather_code[i]);
            const min = Math.round(daily.temperature_2m_min[i]);
            const max = Math.round(daily.temperature_2m_max[i]);

            // Calculate bar width (naive approach for visual effect)
            const minOfWeek = Math.min(...daily.temperature_2m_min.slice(0,7));
            const maxOfWeek = Math.max(...daily.temperature_2m_max.slice(0,7));
            const range = maxOfWeek - minOfWeek;
            const leftPct = ((min - minOfWeek) / range) * 100;
            const widthPct = ((max - min) / range) * 100;

            dailyContainer.innerHTML += `
                <div class="daily-item">
                    <span class="daily-day">${dayName}</span>
                    <i class='bx ${dCode.icon} daily-icon'></i>
                    <div class="daily-temps">
                        <span class="daily-low">${min}&deg;</span>
                        <div class="daily-bar">
                            <div class="daily-bar-fill" style="left: ${leftPct}%; width: ${widthPct}%"></div>
                        </div>
                        <span class="daily-high">${max}&deg;</span>
                    </div>
                </div>
            `;
        }

        // Metrics
        const uv = daily.uv_index_max[0];
        uvIndexEl.textContent = uv ? Math.round(uv) : '--';
        uvDescEl.textContent = uv > 5 ? 'High' : (uv > 2 ? 'Moderate' : 'Low');
        
        windSpeedEl.textContent = `${current.wind_speed_10m} km/h`;
        humidityEl.textContent = `${current.relative_humidity_2m}%`;
        visibilityEl.textContent = '10 km'; // Mocked as open-meteo basic doesn't always have current vis
    }
});
