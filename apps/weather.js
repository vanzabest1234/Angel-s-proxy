const CODES = {
  0: ['Clear sky', '☀️'],
  1: ['Mostly clear', '🌤️'],
  2: ['Partly cloudy', '⛅'],
  3: ['Overcast', '☁️'],
  45: ['Fog', '🌫️'],
  48: ['Freezing fog', '🌫️'],
  51: ['Light drizzle', '🌦️'],
  53: ['Drizzle', '🌦️'],
  55: ['Heavy drizzle', '🌧️'],
  61: ['Light rain', '🌦️'],
  63: ['Rain', '🌧️'],
  65: ['Heavy rain', '🌧️'],
  71: ['Light snow', '🌨️'],
  73: ['Snow', '🌨️'],
  75: ['Heavy snow', '❄️'],
  80: ['Rain showers', '🌦️'],
  81: ['Showers', '🌧️'],
  82: ['Heavy showers', '⛈️'],
  95: ['Thunderstorm', '⛈️'],
  96: ['Storm with hail', '⛈️'],
  99: ['Storm with hail', '⛈️'],
};

const describe = (code) => CODES[code] || ['Cloudy', '☁️'];
const round = (n) => `${Math.round(Number(n))}°`;

async function geocode(city) {
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
  const data = await res.json();
  return (data.results || [])[0] || null;
}

async function forecast(place) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}`
    + '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code'
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5';
  return fetch(url).then((res) => res.json());
}

export function renderWeather(body) {
  body.innerHTML = `
    <div class="weather">
      <form class="weather-search">
        <input class="weather-input" aria-label="City" placeholder="City name" autocomplete="off">
        <button class="weather-go" type="submit">Check</button>
      </form>
      <div data-panel><p class="app-loading">Fetching the forecast…</p></div>
    </div>`;

  const panel = body.querySelector('[data-panel]');
  const input = body.querySelector('.weather-input');
  const saved = localStorage.getItem('angel.city') || 'New York';
  input.value = saved;

  const load = async (city) => {
    const name = String(city || '').trim() || 'New York';
    panel.innerHTML = `<p class="app-loading">Fetching the weather for ${name}…</p>`;
    try {
      const place = await geocode(name);
      if (!place) {
        panel.innerHTML = `<div class="weather-empty"><h2>No place called “${name.replace(/</g, '&lt;')}”</h2><p class="muted">Try a city like New York, London or Tokyo.</p></div>`;
        return;
      }
      const data = await forecast(place);
      const [text, icon] = describe(data.current.weather_code);
      const where = [place.name, place.country_code].filter(Boolean).join(', ');
      localStorage.setItem('angel.city', place.name);

      panel.innerHTML = `
        <div class="weather-now">
          <div class="weather-icon" aria-hidden="true">${icon}</div>
          <div>
            <p class="weather-temp">${round(data.current.temperature_2m)}</p>
            <p class="weather-text">${text} · ${where}</p>
          </div>
        </div>
        <dl class="weather-facts">
          <div><dt>High / low</dt><dd>${round(data.daily.temperature_2m_max[0])} / ${round(data.daily.temperature_2m_min[0])}</dd></div>
          <div><dt>Humidity</dt><dd>${Math.round(data.current.relative_humidity_2m)}%</dd></div>
          <div><dt>Wind</dt><dd>${Math.round(data.current.wind_speed_10m)} km/h</dd></div>
        </dl>
        <h2 class="weather-sub">Next days</h2>
        <div class="weather-days">
          ${data.daily.time.map((day, i) => {
            const [label] = describe(data.daily.weather_code[i]);
            const date = new Date(`${day}T12:00:00`);
            return `<div class="weather-day">
              <span class="weather-day-name">${date.toLocaleDateString([], { weekday: 'short' })}</span>
              <span class="weather-day-icon" aria-hidden="true">${describe(data.daily.weather_code[i])[1]}</span>
              <span class="weather-day-range">${round(data.daily.temperature_2m_max[i])} <em>${round(data.daily.temperature_2m_min[i])}</em></span>
              <span class="weather-day-label">${label}</span>
            </div>`;
          }).join('')}
        </div>
        <p class="weather-credit">Live from Open-Meteo.</p>`;
    } catch {
      panel.innerHTML = `<div class="weather-empty"><h2>The forecast didn't arrive</h2><p class="muted">Check the connection and press Check again.</p></div>`;
    }
  };

  body.querySelector('.weather-search').addEventListener('submit', (event) => {
    event.preventDefault();
    load(input.value);
  });

  load(saved);
}

export const weather = {
  name: 'Weather',
  title: 'Weather',
  tile: 'tile-weather',
  desc: 'The live forecast for any city, right on the desktop.',
  render: renderWeather,
};
