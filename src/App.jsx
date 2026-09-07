import React, { useState, useEffect } from 'react';
import { Search, Droplets, Wind, Thermometer, CloudRain, Sun, Cloud, CloudLightning, Snowflake } from 'lucide-react';
import axios from 'axios';
import './index.css';

function App() {
  const [city, setCity] = useState('');
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Default city on load
  useEffect(() => {
    fetchWeather('New York');
  }, []);

  const fetchWeather = async (searchCity) => {
    if (!searchCity) return;
    
    setLoading(true);
    setError('');
    
    try {
      // 1. Get coordinates for the city using Open-Meteo Geocoding API
      const geoRes = await axios.get(`https://geocoding-api.open-meteo.com/v1/search?name=${searchCity}&count=1&language=en&format=json`);
      
      if (!geoRes.data.results || geoRes.data.results.length === 0) {
        throw new Error('City not found');
      }
      
      const location = geoRes.data.results[0];
      const { latitude, longitude, name, country } = location;
      
      // 2. Get weather data using coordinates
      const weatherRes = await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`);
      
      const current = weatherRes.data.current;
      
      setWeatherData({
        name,
        country,
        temperature: Math.round(current.temperature_2m),
        feelsLike: Math.round(current.apparent_temperature),
        humidity: current.relative_humidity_2m,
        windSpeed: current.wind_speed_10m,
        weatherCode: current.weather_code,
        isDay: current.is_day
      });
      
    } catch (err) {
      setError(err.message === 'City not found' ? 'City not found. Please try again.' : 'Failed to fetch weather data.');
      setWeatherData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchWeather(city);
  };

  const getWeatherIcon = (code, isDay) => {
    // WMO Weather interpretation codes (WW)
    // 0: Clear sky
    // 1, 2, 3: Mainly clear, partly cloudy, and overcast
    // 45, 48: Fog and depositing rime fog
    // 51, 53, 55: Drizzle: Light, moderate, and dense intensity
    // 56, 57: Freezing Drizzle: Light and dense intensity
    // 61, 63, 65: Rain: Slight, moderate and heavy intensity
    // 66, 67: Freezing Rain: Light and heavy intensity
    // 71, 73, 75: Snow fall: Slight, moderate, and heavy intensity
    // 77: Snow grains
    // 80, 81, 82: Rain showers: Slight, moderate, and violent
    // 85, 86: Snow showers slight and heavy
    // 95: Thunderstorm: Slight or moderate
    // 96, 99: Thunderstorm with slight and heavy hail
    
    if (code === 0) return isDay ? <Sun size={64} className="weather-icon-large" /> : <Sun size={64} className="weather-icon-large" color="#e2e8f0" />;
    if (code >= 1 && code <= 3) return <Cloud size={64} className="weather-icon-large" color="#94a3b8" />;
    if (code >= 51 && code <= 67) return <CloudRain size={64} className="weather-icon-large" color="#60a5fa" />;
    if (code >= 71 && code <= 77) return <Snowflake size={64} className="weather-icon-large" color="#bae6fd" />;
    if (code >= 80 && code <= 82) return <CloudRain size={64} className="weather-icon-large" color="#3b82f6" />;
    if (code >= 85 && code <= 86) return <Snowflake size={64} className="weather-icon-large" color="#bae6fd" />;
    if (code >= 95 && code <= 99) return <CloudLightning size={64} className="weather-icon-large" color="#a78bfa" />;
    
    return <Sun size={64} className="weather-icon-large" />;
  };

  const getWeatherDescription = (code) => {
    if (code === 0) return 'Clear sky';
    if (code === 1) return 'Mainly clear';
    if (code === 2) return 'Partly cloudy';
    if (code === 3) return 'Overcast';
    if (code >= 45 && code <= 48) return 'Fog';
    if (code >= 51 && code <= 55) return 'Drizzle';
    if (code >= 61 && code <= 65) return 'Rain';
    if (code >= 71 && code <= 75) return 'Snow';
    if (code >= 80 && code <= 82) return 'Rain showers';
    if (code >= 95 && code <= 99) return 'Thunderstorm';
    return 'Unknown';
  };

  return (
    <div className="app-container">
      <div className="header">
        <h1>WeatherSphere</h1>
        <p>Real-time weather data & forecasts</p>
      </div>

      <form onSubmit={handleSearch} className="search-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Search for a city..."
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <button type="submit" className="search-button">
          <Search size={20} />
        </button>
      </form>

      {loading && <div className="loading">Fetching weather data...</div>}
      
      {error && <div className="error-message">{error}</div>}

      {weatherData && !loading && (
        <div className="weather-card">
          <div className="weather-header">
            <div className="city-info">
              <h2>{weatherData.name}</h2>
              <p>{weatherData.country}</p>
              <p style={{ marginTop: '0.5rem', color: 'var(--accent-color)', fontWeight: '500' }}>
                {getWeatherDescription(weatherData.weatherCode)}
              </p>
            </div>
            <div className="current-temp">
              {getWeatherIcon(weatherData.weatherCode, weatherData.isDay)}
              <span className="temp-value">{weatherData.temperature}°C</span>
            </div>
          </div>

          <div className="weather-details">
            <div className="detail-item">
              <div className="detail-icon">
                <Thermometer size={24} />
              </div>
              <div className="detail-info">
                <span className="detail-label">Feels Like</span>
                <span className="detail-value">{weatherData.feelsLike}°C</span>
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-icon">
                <Droplets size={24} />
              </div>
              <div className="detail-info">
                <span className="detail-label">Humidity</span>
                <span className="detail-value">{weatherData.humidity}%</span>
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-icon">
                <Wind size={24} />
              </div>
              <div className="detail-info">
                <span className="detail-label">Wind Speed</span>
                <span className="detail-value">{weatherData.windSpeed} km/h</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
