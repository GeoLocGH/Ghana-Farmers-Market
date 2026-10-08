import React, { useEffect, useState } from 'react';
import { useGeolocation } from '../hooks/useGeolocation';
import { getLocalWeather } from '../services/geminiService';
import type { WeatherForecast, GroundingSource, GeoLocation } from '../types';
import Card from './common/Card';
import { 
  SunIcon, 
  RainIcon, 
  CloudyIcon, 
  Spinner, 
  WindIcon, 
  DropletIcon, 
  EyeIcon, 
  GaugeIcon, 
  SproutIcon, 
  SearchIcon,
  WifiOffIcon,
  DatabaseIcon,
  RefreshCwIcon,
  CheckIcon,
  BellIcon,
  BarChartIcon
} from './common/icons';
import { useNotifications } from '../contexts/NotificationContext';
import { saveCachedWeather, getCachedWeather, getLastKnownLocation } from '../services/offlineCacheService';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { WeatherTrendChart } from './WeatherTrendChart';

const WeatherIcon: React.FC<{ condition: WeatherForecast['condition']; className?: string }> = ({ condition, className }) => {
  switch (condition) {
    case 'Sunny':
      return <SunIcon className={className} />;
    case 'Rainy':
      return <RainIcon className={className} />;
    case 'Stormy':
      return <RainIcon className={className} />; 
    case 'Cloudy':
    default:
      return <CloudyIcon className={className} />;
  }
};

const Weather: React.FC = () => {
  const { location: geoLoc, loading: geoLoading, error: geoError } = useGeolocation();
  const { isOnline } = useNetworkStatus();
  const { addNotification, sendRegionalPushNotification, setIsSettingsOpen } = useNotifications();
  
  const [forecasts, setForecasts] = useState<WeatherForecast[]>([]);
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [regionName, setRegionName] = useState<string>('');
  const [isCachedData, setIsCachedData] = useState<boolean>(false);
  const [cachedDate, setCachedDate] = useState<string>('');
  const [activeLocation, setActiveLocation] = useState<GeoLocation | null>(null);
  const [showChart, setShowChart] = useState<boolean>(true);

  // 1. Initial check for cached weather so UI is instantaneous even offline
  useEffect(() => {
    const cached = getCachedWeather();
    if (cached && cached.forecasts && cached.forecasts.length > 0) {
      setForecasts(cached.forecasts);
      setSources(cached.sources || []);
      setRegionName(cached.region || '');
      setIsCachedData(true);
      setCachedDate(cached.formattedDate);
      if (cached.location) {
        setActiveLocation(cached.location);
      }
    } else {
      const lastLoc = getLastKnownLocation();
      if (lastLoc) {
        setActiveLocation(lastLoc);
      }
    }
  }, []);

  // Update active location when geolocation succeeds
  useEffect(() => {
    if (geoLoc) {
      setActiveLocation(geoLoc);
    }
  }, [geoLoc]);

  // 2. Fetch fresh weather if online and location is available
  const fetchWeather = async (locToUse: GeoLocation, forceFresh = false) => {
    const cached = getCachedWeather();
    const isFresh = cached && cached.forecasts && (Date.now() - cached.timestamp < 30 * 60 * 1000);

    if (cached && cached.forecasts && cached.forecasts.length > 0) {
      setForecasts(cached.forecasts);
      setSources(cached.sources || []);
      setRegionName(cached.region || '');
      setIsCachedData(true);
      setCachedDate(cached.formattedDate);
      if (isFresh && !forceFresh) {
        return;
      }
    }

    if (!navigator.onLine) {
      return;
    }

    setLoadingForecast(true);
    try {
      const response = await getLocalWeather(locToUse);
      const data = response.data;
      if (data && data.length > 0) {
        setForecasts(data);
        setSources(response.sources || []);
        const reg = data[0].region || 'Ghana Regional Area';
        setRegionName(reg);
        setIsCachedData(false);

        // Save immediately to local-storage caching
        saveCachedWeather(data, response.sources, reg, locToUse);
        setCachedDate(new Date().toLocaleString());

        const stormyForecast = data.find(f => f.condition === 'Stormy' || f.wind > 25);
        if (stormyForecast) {
          sendRegionalPushNotification({
            type: 'weather',
            title: 'Severe Weather Warning',
            message: `${stormyForecast.condition === 'Stormy' ? 'Severe convective storm' : 'High convective winds'} expected ${stormyForecast.day.toLowerCase()} in ${reg}. Take field precautions and protect harvested crops.`,
            region: reg,
            severity: 'critical',
            view: 'WEATHER'
          });
        }
      }
    } catch (err) {
      console.warn("Live weather fetch failed, attempting cached fallback:", err);
      if (cached && cached.forecasts) {
        setForecasts(cached.forecasts);
        setSources(cached.sources || []);
        setRegionName(cached.region || '');
        setIsCachedData(true);
        setCachedDate(cached.formattedDate);
        addNotification({
          type: 'weather',
          title: 'Offline Weather Loaded',
          message: `Connection unstable. Displaying cached weather for ${cached.region || 'your area'}.`,
          view: 'WEATHER'
        });
      }
    } finally {
      setLoadingForecast(false);
    }
  };

  useEffect(() => {
    if (activeLocation && isOnline) {
      fetchWeather(activeLocation);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLocation, isOnline]);

  const handleManualRefresh = () => {
    if (activeLocation) {
      fetchWeather(activeLocation, true);
    }
  };

  return (
    <Card>
      {/* Header with Title and Sector Badge */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-3 gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-green-100 rounded-full text-green-700">
            <SunIcon className="w-6 h-6 text-green-700" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-green-800">Regional Weather & Agro-Advisory</h2>
            <p className="text-xs text-gray-500">Hyperlocal farming forecasts with offline field caching</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {regionName && (
            <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full border border-green-200">
              Sector: {regionName}
            </span>
          )}

          <button
            onClick={() => setShowChart(!showChart)}
            className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition-colors ${
              showChart 
                ? 'bg-green-700 text-white border-green-800 shadow-xs' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
            title="Toggle 7-day temperature and rainfall trend chart"
          >
            <BarChartIcon className="w-3.5 h-3.5" />
            <span>7-Day Trend Chart</span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs bg-green-50 hover:bg-green-100 text-green-800 px-2.5 py-1.5 rounded-lg border border-green-300 font-semibold transition-colors"
            title="Configure regional push alerts"
          >
            <BellIcon className="w-3.5 h-3.5 text-green-700" />
            <span>Push Alerts</span>
          </button>

          {isOnline && (
            <button
              onClick={handleManualRefresh}
              disabled={loadingForecast}
              className="inline-flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1.5 rounded-lg border border-gray-300 font-medium transition-colors"
              title="Refresh live forecast"
            >
              <RefreshCwIcon className={`w-3.5 h-3.5 ${loadingForecast ? 'animate-spin text-green-600' : ''}`} />
              <span>{loadingForecast ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Offline / Cached Status Banner */}
      {isCachedData ? (
        <div className="mb-4 bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs sm:text-sm text-amber-900 flex items-start gap-2 shadow-sm">
          <WifiOffIcon className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-grow">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <span className="font-bold text-amber-800 flex items-center gap-1">
                <DatabaseIcon className="w-3.5 h-3.5" /> Offline Cached Forecast
              </span>
              <span className="text-amber-700 text-xs">Saved: {cachedDate || 'Earlier session'}</span>
            </div>
            <p className="mt-0.5 text-amber-800/90 text-xs">
              This forecast is stored locally on your device and remains accessible in remote fields with zero internet connectivity.
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-xs text-green-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-1.5">
            <CheckIcon className="w-4 h-4 text-green-600" />
            <span className="font-semibold">Live Regional Data Active</span>
            <span className="text-green-600 hidden sm:inline">• Automatically saved for offline field visits</span>
          </div>
          <span className="text-gray-500 text-[11px]">{cachedDate ? `Synced: ${cachedDate}` : 'Synced now'}</span>
        </div>
      )}

      {/* Loading Indicator */}
      {(geoLoading || loadingForecast) && forecasts.length === 0 && (
        <div className="flex items-center justify-center p-6 bg-orange-50 border border-orange-200 rounded-xl shadow-sm my-4">
          <Spinner className="animate-spin h-6 w-6 text-orange-600" /> 
          <span className="ml-3 font-bold text-orange-700 text-base animate-pulse">
            {isOnline ? 'Fetching live regional meteorological data...' : 'Loading saved offline forecast...'}
          </span>
        </div>
      )}

      {/* Geolocation Warning (if any, but don't block if we have cached data) */}
      {geoError && forecasts.length === 0 && (
        <div role="alert" className="error-notification text-black font-semibold bg-amber-50 border border-amber-300 p-3 rounded-md text-sm mb-4">
          Location detection note: {geoError}. Showing regional default forecast.
        </div>
      )}

      {/* Forecast Cards Display */}
      {forecasts.length > 0 && (
        <div>
          {activeLocation && (
            <p className="text-gray-500 mb-3 text-xs flex items-center justify-between">
              <span>Coordinates: Lat {activeLocation.latitude.toFixed(2)}, Lon {activeLocation.longitude.toFixed(2)}</span>
              {isCachedData && <span className="text-amber-600 font-semibold">[Offline Cache]</span>}
            </p>
          )}

          {/* 7-Day Temperature & Rainfall Trend Chart (Powered by Recharts) */}
          {showChart && (
            <WeatherTrendChart 
              forecasts={forecasts} 
              regionName={regionName} 
            />
          )}

          {/* Section Divider & Daily Cards Title */}
          <div className="flex items-center justify-between mt-6 mb-3">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>Detailed Day-by-Day Forecast</span>
              <span className="text-xs font-normal text-gray-500 lowercase">({forecasts.length} days)</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {forecasts.map((forecast) => (
              <div 
                key={forecast.day} 
                className="bg-slate-800 text-white rounded-xl p-4 shadow-lg flex flex-col justify-between relative overflow-hidden border border-slate-700"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    {/* Left: Temp & Icon */}
                    <div className="flex items-center gap-3">
                      <WeatherIcon 
                        condition={forecast.condition} 
                        className={`w-12 h-12 ${forecast.condition === 'Stormy' ? 'text-red-400' : 'text-yellow-400'}`} 
                      />
                      <div>
                        <div className="text-3xl font-bold tracking-tight">
                          {forecast.temp}°C 
                          <span className="text-sm text-gray-400 font-normal ml-1">
                            / {Math.round(forecast.temp * 9/5 + 32)}°F
                          </span>
                        </div>
                        <div className="text-xs text-gray-300 font-medium">{forecast.condition}</div>
                      </div>
                    </div>

                    <span className="text-xs font-bold uppercase tracking-wider bg-slate-700 px-2 py-1 rounded text-slate-300">
                      {forecast.day}
                    </span>
                  </div>

                  {/* Weather Metrics */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/50">
                    <div className="flex items-center gap-2">
                      <WindIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>Wind: {forecast.wind} km/h</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DropletIcon className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                      <span>Humidity: {forecast.humidity || '--'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <EyeIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>Vis: {forecast.visibility || '--'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <GaugeIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>Baro: {forecast.pressure || '--'}</span>
                    </div>
                  </div>
                </div>

                {/* Agrometeorological Note for Ghanaian Farmers */}
                {forecast.agromet_note && (
                  <div className="mt-3 pt-2.5 border-t border-slate-700">
                    <div className="flex items-start gap-2 bg-green-950/40 p-2 rounded border border-green-800/40">
                      <SproutIcon className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-green-200 font-medium leading-relaxed">
                        {forecast.agromet_note}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Sources Section */}
          {sources && sources.length > 0 && (
            <div className="mt-5 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 flex items-center gap-1 mb-2 font-semibold">
                <SearchIcon className="w-3 h-3" /> Grounding Sources:
              </p>
              <div className="flex flex-wrap gap-2">
                {sources.map((source, idx) => (
                  <a 
                    key={idx} 
                    href={source.uri} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xs bg-gray-50 hover:bg-gray-100 border border-gray-200 text-green-700 px-2.5 py-1 rounded-md truncate max-w-[220px]"
                  >
                    {source.title}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* If no data yet and offline */}
      {!loadingForecast && forecasts.length === 0 && (
        <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-200 my-4">
          <WifiOffIcon className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <h3 className="font-bold text-gray-700 text-base">No Weather Data Cached Yet</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
            Connect to the internet once while at home or in town to automatically cache your regional weather forecasts for offline farm visits.
          </p>
        </div>
      )}
    </Card>
  );
};

export default Weather;
