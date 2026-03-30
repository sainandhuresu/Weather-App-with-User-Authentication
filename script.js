// ---------- State & Authentication ---------- //
document.addEventListener('DOMContentLoaded', () => {
  // If we're on the dashboard, initialize the weather
  if (document.getElementById('dashboard')) {
    initDashboard();
  }

  // Handle City Search
  if (document.getElementById('searchBtn')) {
    document.getElementById('searchBtn').addEventListener('click', () => {
      const city = document.getElementById('citySearch').value;
      if (city) fetchWeather(city);
    });
    document.getElementById('citySearch').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const city = e.target.value;
        if (city) fetchWeather(city);
      }
    });
  }
});

// ---------- Weather Application Logic ---------- //

let weatherChartInstance = null;

function initDashboard() {
  // Default City
  fetchWeather('London');
}

async function fetchWeather(city) {
  try {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('weatherContent').style.display = 'none';

    // 1. Geocoding API to get lat, lon
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      alert("City not found!");
      document.getElementById('loading').style.display = 'none';
      document.getElementById('weatherContent').style.display = 'block';
      return;
    }

    const location = geoData.results[0];
    const lat = location.latitude;
    const lon = location.longitude;
    const cityName = location.name;

    // 2. Weather API (Current & Daily Forecast & Hourly for Graph)
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&hourly=temperature_2m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`
    );
    const weatherData = await weatherRes.json();

    updateUI(cityName, weatherData);
  } catch (error) {
    console.error("Error fetching weather:", error);
    alert("An error occurred while fetching weather data.");
  } finally {
    document.getElementById('loading').style.display = 'none';
  }
}

function updateUI(cityName, data) {
  // --- Update Current Weather ---
  document.getElementById('cityName').innerText = cityName;
  document.getElementById('currentTemp').innerText = `${Math.round(data.current.temperature_2m)}°`;
  document.getElementById('currentHum').innerText = `${data.current.relative_humidity_2m}%`;
  document.getElementById('currentWind').innerText = `${data.current.wind_speed_10m} km/h`;

  const { label: currentDesc, icon: currentIcon } = getWeatherDesc(data.current.weather_code);
  document.getElementById('currentDesc').innerText = currentDesc;
  document.getElementById('currentIcon').className = `ph ph-${currentIcon} ph-3x`;

  // Display content
  document.getElementById('weatherContent').style.display = 'block';

  // --- Update Forecast Grid ---
  const grid = document.getElementById('forecastGrid');
  grid.innerHTML = '';

  // Show next 5 days
  for (let i = 1; i < 6; i++) {
    const d = new Date(data.daily.time[i]);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const maxTemp = Math.round(data.daily.temperature_2m_max[i]);
    const minTemp = Math.round(data.daily.temperature_2m_min[i]);
    const { icon } = getWeatherDesc(data.daily.weather_code[i]);

    const card = document.createElement('div');
    card.className = 'forecast-card';
    card.innerHTML = `
      <div class="forecast-day">${dayName}</div>
      <i class="ph ph-${icon} forecast-icon"></i>
      <div class="forecast-temp">${maxTemp}° <span style="font-size: 0.8em; color: var(--text-secondary)">${minTemp}°</span></div>
    `;
    grid.appendChild(card);
  }

  // --- Update Graph ---
  renderGraph(data.hourly.time.slice(0, 24), data.hourly.temperature_2m.slice(0, 24));
}

function renderGraph(times, temps) {
  const ctx = document.getElementById('weatherChart').getContext('2d');

  // Format times for X axis (e.g., "14:00")
  const labels = times.map(t => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  if (weatherChartInstance) {
    weatherChartInstance.destroy();
  }

  // Create gradient
  let gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, 'rgba(56, 189, 248, 0.5)'); // accent color
  gradient.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

  weatherChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Temperature (°C)',
        data: temps,
        borderColor: '#38bdf8',
        backgroundColor: gradient,
        borderWidth: 3,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#38bdf8',
        pointRadius: 4,
        fill: true,
        tension: 0.4 // S curve
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          titleColor: '#fff',
          bodyColor: '#38bdf8',
          padding: 10,
          cornerRadius: 8,
          displayColors: false
        }
      },
      scales: {
        x: {
          grid: { display: false, drawBorder: false },
          ticks: { color: '#94a3b8', maxTicksLimit: 6 }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
          ticks: { color: '#94a3b8' }
        }
      }
    }
  });
}

// Map WMO Weather codes to descriptive text and Phosohor icons
function getWeatherDesc(code) {
  let label = 'Clear Sky';
  let icon = 'sun';

  if (code === 0) { label = 'Clear Sky'; icon = 'sun'; }
  else if (code === 1 || code === 2 || code === 3) { label = 'Partly Cloudy'; icon = 'cloud-sun'; }
  else if (code === 45 || code === 48) { label = 'Foggy'; icon = 'cloud-fog'; }
  else if (code === 51 || code === 53 || code === 55) { label = 'Drizzle'; icon = 'cloud-rain'; }
  else if (code === 61 || code === 63 || code === 65) { label = 'Rain'; icon = 'cloud-rain'; }
  else if (code === 71 || code === 73 || code === 75 || code === 77) { label = 'Snow'; icon = 'snowflake'; }
  else if (code === 95 || code === 96 || code === 99) { label = 'Thunderstorm'; icon = 'cloud-lightning'; }

  return { label, icon };
}
