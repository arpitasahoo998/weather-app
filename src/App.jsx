import React, { useState, useEffect, useRef } from 'react';
import { Search, Droplets, Wind, Thermometer, CloudRain, Sun, Cloud, CloudLightning, Snowflake } from 'lucide-react';
import axios from 'axios';
import './index.css';

function App() {
  const [city, setCity] = useState('');
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Set theme class on body based on weather
  useEffect(() => {
    if (!weatherData) return;
    
    const code = weatherData.weatherCode;
    const isDay = weatherData.isDay;
    
    document.body.classList.remove('theme-day', 'theme-night', 'theme-rain');
    
    if (code >= 51 && code <= 99) {
      document.body.classList.add('theme-rain');
    } else if (isDay) {
      document.body.classList.add('theme-day');
    } else {
      document.body.classList.add('theme-night');
    }
  }, [weatherData]);

  // Default city on load
  useEffect(() => {
    const fetchDefault = async () => {
      setLoading(true);
      try {
        const geoRes = await axios.get(`https://geocoding-api.open-meteo.com/v1/search?name=New Delhi&count=1&language=en&format=json`);
        if (geoRes.data.results && geoRes.data.results.length > 0) {
          fetchWeatherForLocation(geoRes.data.results[0]);
        }
      } catch (err) {
        setLoading(false);
      }
    };
    fetchDefault();
  }, []);

  // Debounce search as user types
  useEffect(() => {
    const timer = setTimeout(() => {
      if (city.trim().length >= 2) {
        fetchSuggestions(city);
      } else {
        setShowDropdown(false);
        setSearchResults([]);
      }
    }, 400); // 400ms delay

    return () => clearTimeout(timer);
  }, [city]);

  const fetchSuggestions = async (searchQuery) => {
    try {
      const geoRes = await axios.get(`https://geocoding-api.open-meteo.com/v1/search?name=${searchQuery}&count=10&language=en&format=json`);
      if (geoRes.data.results && geoRes.data.results.length > 0) {
        setSearchResults(geoRes.data.results);
        setShowDropdown(true);
      } else {
        setShowDropdown(false);
        setSearchResults([]);
      }
    } catch (err) {
      // silently fail for autocomplete suggestions
      setShowDropdown(false);
    }
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!city.trim()) return;
    
    setLoading(true);
    setError('');
    setShowDropdown(false);
    
    try {
      const geoRes = await axios.get(`https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=10&language=en&format=json`);
      
      if (!geoRes.data.results || geoRes.data.results.length === 0) {
        throw new Error('City not found');
      }
      
      // On direct submit, just fetch the very first best match automatically
      fetchWeatherForLocation(geoRes.data.results[0]);
      
    } catch (err) {
      setError(err.message === 'City not found' ? 'City not found. Please try a different name.' : 'Failed to search for location.');
      setWeatherData(null);
      setLoading(false);
    }
  };

  const fetchWeatherForLocation = async (location) => {
    setShowDropdown(false);
    setLoading(true);
    setError('');
    
    try {
      const { latitude, longitude, name, country, admin1 } = location;
      
      const weatherRes = await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`);
      
      const current = weatherRes.data.current;
      const daily = weatherRes.data.daily;
      
      const forecast = [];
      for (let i = 1; i <= 5; i++) {
        if (daily.time[i]) {
          const date = new Date(daily.time[i]);
          forecast.push({
            dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
            maxTemp: Math.round(daily.temperature_2m_max[i]),
            minTemp: Math.round(daily.temperature_2m_min[i]),
            code: daily.weather_code[i]
          });
        }
      }
      
      setWeatherData({
        name,
        country: admin1 ? `${admin1}, ${country}` : country,
        temperature: Math.round(current.temperature_2m),
        feelsLike: Math.round(current.apparent_temperature),
        humidity: current.relative_humidity_2m,
        windSpeed: current.wind_speed_10m,
        weatherCode: current.weather_code,
        isDay: current.is_day,
        forecast
      });
      
      // Clear input box after selection
      setCity('');
      
    } catch (err) {
      setError('Failed to fetch weather data for this location.');
      setWeatherData(null);
    } finally {
      setLoading(false);
    }
  };

  const getWeatherIcon = (code, isDay, size = 64, className = "weather-icon-large") => {
    if (code === 0) return isDay ? <Sun size={size} className={className} /> : <Sun size={size} className={className} color="#e2e8f0" />;
    if (code >= 1 && code <= 3) return <Cloud size={size} className={className} color="#94a3b8" />;
    if (code >= 51 && code <= 67) return <CloudRain size={size} className={className} color="#60a5fa" />;
    if (code >= 71 && code <= 77) return <Snowflake size={size} className={className} color="#bae6fd" />;
    if (code >= 80 && code <= 82) return <CloudRain size={size} className={className} color="#3b82f6" />;
    if (code >= 85 && code <= 86) return <Snowflake size={size} className={className} color="#bae6fd" />;
    if (code >= 95 && code <= 99) return <CloudLightning size={size} className={className} color="#a78bfa" />;
    
    return <Sun size={size} className={className} />;
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
        <h1>SkyPulse</h1>
        <p>Real-time weather data & forecasts</p>
      </div>

      <div className="search-container" ref={dropdownRef}>
        <form onSubmit={handleSearchSubmit} className="search-bar">
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

        {showDropdown && searchResults.length > 0 && (
          <div className="search-dropdown">
            {searchResults.map((result) => (
              <div 
                key={result.id} 
                className="search-item"
                onClick={() => {
                  fetchWeatherForLocation(result);
                }}
              >
                <span className="search-item-name">{result.name}</span>
                <span className="search-item-country">
                  {result.admin1 ? `${result.admin1}, ` : ''}{result.country}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

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
          
          {weatherData.forecast && weatherData.forecast.length > 0 && (
            <div className="forecast-section">
              <h3>5-Day Forecast</h3>
              <div className="forecast-grid">
                {weatherData.forecast.map((day, index) => (
                  <div key={index} className="forecast-day">
                    <span className="forecast-date">{day.dayName}</span>
                    {getWeatherIcon(day.code, 1, 32, "forecast-icon")}
                    <div className="forecast-temps">
                      <span className="temp-max">{day.maxTemp}°</span>
                      <span className="temp-min">{day.minTemp}°</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
        </div>
      )}
    </div>
  );
}

export default App;
