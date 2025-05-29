// Mapping of weather codes to descriptions and Weather Icons font classes.
const weatherIcons = {
  0:  { description: "Clear sky", iconClass: "wi-day-sunny" },
  1:  { description: "Mainly clear", iconClass: "wi-day-sunny-overcast" },
  2:  { description: "Partly cloudy", iconClass: "wi-day-cloudy" },
  3:  { description: "Overcast", iconClass: "wi-cloudy" },
  45: { description: "Fog", iconClass: "wi-fog" },
  48: { description: "Depositing rime fog", iconClass: "wi-fog" },
  51: { description: "Light drizzle", iconClass: "wi-sprinkle" },
  53: { description: "Moderate drizzle", iconClass: "wi-sprinkle" },
  55: { description: "Dense drizzle", iconClass: "wi-showers" },
  56: { description: "Light freezing drizzle", iconClass: "wi-hail" },
  57: { description: "Dense freezing drizzle", iconClass: "wi-hail" },
  61: { description: "Slight rain", iconClass: "wi-sprinkle" },
  63: { description: "Moderate rain", iconClass: "wi-rain" },
  65: { description: "Heavy rain", iconClass: "wi-rain-wind" },
  66: { description: "Light freezing rain", iconClass: "wi-rain-mix" },
  67: { description: "Heavy freezing rain", iconClass: "wi-rain-mix" },
  71: { description: "Slight snowfall", iconClass: "wi-snow" },
  73: { description: "Moderate snowfall", iconClass: "wi-snow" },
  75: { description: "Heavy snowfall", iconClass: "wi-snow" },
  77: { description: "Snow grains", iconClass: "wi-snowflake-cold" },
  80: { description: "Slight rain showers", iconClass: "wi-showers" },
  81: { description: "Moderate rain showers", iconClass: "wi-showers" },
  82: { description: "Violent rain showers", iconClass: "wi-storm-showers" },
  85: { description: "Slight snow showers", iconClass: "wi-snow" },
  86: { description: "Heavy snow showers", iconClass: "wi-snow" },
  95: { description: "Thunderstorm", iconClass: "wi-thunderstorm" },
  96: { description: "Thunderstorm with slight hail", iconClass: "wi-thunderstorm" },
  99: { description: "Thunderstorm with heavy hail", iconClass: "wi-thunderstorm" }
};

/**
 * Escapes special characters from a string to safely render it as HTML text.
 * 
 * @param {string} text - The text to escape.
 * @returns {string} The escaped text.
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.toString().replace(/[&<>"']/g, m => map[m]);
}

/**
 * Helper function to perform a fetch with a timeout and return JSON.
 * Throws a custom error message if the request fails.
 *
 * @param {string} url - The API endpoint.
 * @param {string} errorMessage - Message to include in case of failure.
 * @param {number} timeout - Timeout in milliseconds (default: 5000).
 * @returns {Promise<Object>} The parsed JSON response.
 */
async function fetchJSON(url, errorMessage, timeout = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) {
      throw new Error(errorMessage);
    }
    return await response.json();
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error("Request timed out. Please try again later.");
    }
    throw new Error(errorMessage);
  }
}

/**
 * Retrieves current weather information and a 5-day forecast for a given city.
 *
 * This function first uses the Open-Meteo Geocoding API to obtain the latitude,
 * longitude, and validated city name based on the user-provided city input. It then
 * fetches both current weather and daily forecast data from the Open-Meteo API.
 *
 * The returned data includes the current weather (with temperature, description,
 * and icon class) and an array of forecast objects for today plus the next 4 days.
 *
 * @param {string} city - The city name entered by the user. This parameter must be a non-empty string.
 * @returns {Promise<Object>} A promise that resolves to an object containing:
 *   - city {string}: The normalized city name as recognized by the API.
 *   - currentWeather {Object}: An object representing the current weather details:
 *       - temperature {number}: The current temperature in Celsius.
 *       - weatherDescription {string}: A textual description of the current weather condition.
 *       - iconClass {string}: A CSS class corresponding to the weather icon.
 *   - forecast {Array<Object>}: An array of forecast objects (one per day), each containing:
 *       - date {string}: The forecast date in YYYY-MM-DD format.
 *       - maxTemp {number}: The maximum temperature forecast for the day in Celsius.
 *       - minTemp {number}: The minimum temperature forecast for the day in Celsius.
 *       - sunrise {string}: The sunrise time for the day.
 *       - sunset {string}: The sunset time for the day.
 *       - weatherDescription {string}: A description of the forecasted weather condition.
 *       - iconClass {string}: A CSS class corresponding to the forecasted weather icon.
 *
 * @throws {Error} Throws an error if:
 *   - The city parameter is empty.
 *   - The geocoding API fails or returns no results.
 *   - The weather API returns an error or missing data.
 */
async function getWeather(city) {
  if (!city) {
    throw new Error("City name is required.");
  }

  try {
    // 1. Retrieve latitude and longitude using the geocoding API.
    const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}`;
    const geocodeData = await fetchJSON(geocodeUrl, "Failed to fetch geocode data. Please try again later.");

    if (!geocodeData.results || geocodeData.results.length === 0) {
      throw new Error("City not found. Please enter a valid city name.");
    }

    // Use the first available result.
    const { latitude, longitude, name } = geocodeData.results[0];

    // 2. Define the date range for the forecast: today plus the next 4 days.
    const today = new Date();
    const startDate = today.toISOString().split("T")[0];
    const endDateObj = new Date(today);
    endDateObj.setDate(today.getDate() + 4);
    const endDate = endDateObj.toISOString().split("T")[0];

    // 3. Construct a combined API endpoint that retrieves both current weather and daily forecast.
    const weatherUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}` +
      `&longitude=${longitude}` +
      `&current_weather=true` +
      `&daily=weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset` +
      `&timezone=auto&start_date=${startDate}&end_date=${endDate}`;
      
    const weatherData = await fetchJSON(weatherUrl, "Failed to fetch weather data. Please try again later.");

    // 4. Validate the returned data.
    if (!weatherData.current_weather) {
      throw new Error("Current weather data not available at the moment.");
    }
    if (!weatherData.daily) {
      throw new Error("Forecast data not available at the moment.");
    }
    
    // 5. Process current weather information.
    const { temperature, weathercode } = weatherData.current_weather;
    const currentWeatherInfo = weatherIcons[weathercode] || { description: "Unknown condition", iconClass: "wi-na" };

    // 6. Process the forecast data.
    const forecastArray = weatherData.daily.time.map((date, index) => {
      const fcWeatherCode = weatherData.daily.weathercode[index];
      const fcWeatherInfo = weatherIcons[fcWeatherCode] || { description: "Unknown condition", iconClass: "wi-na" };

      return {
        date,
        maxTemp: weatherData.daily.temperature_2m_max[index],
        minTemp: weatherData.daily.temperature_2m_min[index],
        sunrise: weatherData.daily.sunrise[index],
        sunset: weatherData.daily.sunset[index],
        weatherDescription: fcWeatherInfo.description,
        iconClass: fcWeatherInfo.iconClass
      };
    });

    // 7. Return combined weather data.
    return {
      city: name,
      currentWeather: {
        temperature,
        weatherDescription: currentWeatherInfo.description,
        iconClass: currentWeatherInfo.iconClass
      },
      forecast: forecastArray
    };

  } catch (error) {
    throw new Error(error.message);
  }
}

// Event listener for the form submission to fetch and display weather information.
document.getElementById('weatherForm').addEventListener('submit', async (event) => {
  event.preventDefault();

  const cityInput = document.getElementById('cityInput').value.trim();
  const resultDiv = document.getElementById('weatherResult');
  resultDiv.textContent = "Loading...";

  try {
    // Retrieve both current weather and forecast data.
    const weatherData = await getWeather(cityInput);
    
    // Use escapeHtml to ensure the dynamic city name is safely rendered.
    const safeCity = escapeHtml(weatherData.city);
    
    // Build HTML content for current weather.
    let html = `<h2>Weather in ${safeCity}</h2>`;
    html += `
      <div class="current-weather">
        <i class="wi ${weatherData.currentWeather.iconClass}" style="font-size: 80px;"></i>
        <p>Temperature: ${weatherData.currentWeather.temperature}°C</p>
        <p>Conditions: ${weatherData.currentWeather.weatherDescription}</p>
      </div>
    `;
    
    // Build HTML content for the 5-day forecast.
    html += `<h3>5-Day Forecast</h3>`;
    html += `<div class="forecast-container">`;
    weatherData.forecast.forEach(day => {
      html += `
        <div class="forecast-day">
          <h4>${day.date}</h4>
          <i class="wi ${day.iconClass}" style="font-size: 48px;"></i>
          <p>Max: ${day.maxTemp}°C, Min: ${day.minTemp}°C</p>
          <p>Sunrise: ${new Date(day.sunrise).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          <p>Sunset: ${new Date(day.sunset).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          <p>${day.weatherDescription}</p>
        </div>
      `;
    });
    html += `</div>`;
    
    resultDiv.innerHTML = html;

  } catch (error) {
    resultDiv.textContent = `Error: ${error.message}`;
  }
});
