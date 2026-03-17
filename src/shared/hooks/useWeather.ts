import { useState, useEffect } from 'react';

// Estepona coordinates
const LAT = 36.4267;
const LON = -5.1459;

interface WeatherData {
  temperature: number;
  windSpeed: number;
  weatherCode: number;
  icon: string;
  description: string;
}

// WMO Weather interpretation codes → description + icon
function interpretWeatherCode(code: number): { description: string; icon: string } {
  if (code === 0) return { description: 'Ensoleillé', icon: '☀️' };
  if (code === 1) return { description: 'Plutôt dégagé', icon: '🌤️' };
  if (code === 2) return { description: 'Partiellement nuageux', icon: '⛅' };
  if (code === 3) return { description: 'Couvert', icon: '☁️' };
  if (code >= 45 && code <= 48) return { description: 'Brouillard', icon: '🌫️' };
  if (code >= 51 && code <= 55) return { description: 'Bruine', icon: '🌦️' };
  if (code >= 61 && code <= 65) return { description: 'Pluie', icon: '🌧️' };
  if (code >= 66 && code <= 67) return { description: 'Pluie verglaçante', icon: '🌧️' };
  if (code >= 71 && code <= 77) return { description: 'Neige', icon: '❄️' };
  if (code >= 80 && code <= 82) return { description: 'Averses', icon: '🌦️' };
  if (code >= 95) return { description: 'Orage', icon: '⛈️' };
  return { description: 'Variable', icon: '🌤️' };
}

function windDescription(speed: number): string {
  if (speed < 5) return 'Calme';
  if (speed < 15) return 'Vent léger';
  if (speed < 30) return 'Vent modéré';
  return 'Vent fort';
}

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchWeather() {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weather_code,wind_speed_10m&timezone=Europe/Madrid`;
        const res = await fetch(url);
        const data = await res.json();

        if (cancelled) return;

        const current = data.current;
        const { description, icon } = interpretWeatherCode(current.weather_code);

        setWeather({
          temperature: Math.round(current.temperature_2m),
          windSpeed: Math.round(current.wind_speed_10m),
          weatherCode: current.weather_code,
          icon,
          description,
        });
      } catch {
        // Silently fail — keep showing nothing
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchWeather();
    // Refresh every 15 minutes
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { weather, loading, windDescription };
}

export { windDescription };
