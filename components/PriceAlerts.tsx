import React, { useState, useEffect } from 'react';
import { Crop, PriceData, GroundingSource } from '../types';
import Card from './common/Card';
import { useNotifications } from '../contexts/NotificationContext';
import { getMarketPrices } from '../services/geminiService';
import { 
  Spinner, 
  TagIcon, 
  ArrowUpIcon, 
  ArrowDownIcon, 
  SearchIcon,
  WifiOffIcon,
  DatabaseIcon,
  RefreshCwIcon,
  DownloadIcon,
  CheckIcon,
  BellIcon
} from './common/icons';
import { 
  saveCachedPrices, 
  getCachedPrices, 
  getAllCachedCropsIndex,
  recordFullSyncTimestamp
} from '../services/offlineCacheService';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

// Baseline reference for alerting logic only (approximate averages)
const priceBaselines: Record<Crop, number> = {
  [Crop.Maize]: 240,
  [Crop.Cassava]: 140,
  [Crop.Yam]: 380,
  [Crop.Cocoa]: 820,
  [Crop.Rice]: 330,
  [Crop.Tomato]: 100,
  [Crop.Pepper]: 120,
  [Crop.Okro]: 180,
  [Crop.Eggplant]: 130,
  [Crop.Plantain]: 60,
  [Crop.Banana]: 90,
  [Crop.KpakpoShito]: 220,
  [Crop.Onion]: 500,
  [Crop.Orange]: 150,
  [Crop.Ginger]: 350,
  [Crop.Sorghum]: 280,
  [Crop.Soyabean]: 300,
  [Crop.Millet]: 290,
};

const MAJOR_OFFLINE_CROPS: Crop[] = [
  Crop.Maize,
  Crop.Cassava,
  Crop.Yam,
  Crop.Cocoa,
  Crop.Rice,
  Crop.Tomato,
  Crop.Plantain,
  Crop.Pepper
];

const getRegionFromMarket = (marketName: string): string => {
  const m = marketName.toLowerCase();
  if (m.includes('techiman')) return 'Bono / Techiman';
  if (m.includes('agbogbloshie') || m.includes('accra') || m.includes('makola')) return 'Greater Accra';
  if (m.includes('kumasi') || m.includes('kejetia')) return 'Ashanti';
  if (m.includes('tamale')) return 'Northern / Tamale';
  if (m.includes('ho ') || m.includes('volta')) return 'Volta';
  if (m.includes('takoradi') || m.includes('sekondi')) return 'Western';
  if (m.includes('cape coast') || m.includes('mankessim')) return 'Central';
  if (m.includes('koforidua')) return 'Eastern';
  return 'All Regions';
};

const PriceAlerts: React.FC = () => {
  const [selectedCrop, setSelectedCrop] = useState<Crop>(Crop.Maize);
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isCached, setIsCached] = useState<boolean>(false);
  const [cachedCrops, setCachedCrops] = useState<string[]>([]);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; cropName: string } | null>(null);

  const { isOnline } = useNetworkStatus();
  const { addNotification, sendRegionalPushNotification, setIsSettingsOpen, preferences } = useNotifications();

  // Refresh cached crop index list
  const refreshCachedIndex = () => {
    setCachedCrops(getAllCachedCropsIndex());
  };

  useEffect(() => {
    refreshCachedIndex();
  }, []);

  const fetchPricesForCrop = async (cropToFetch: Crop, forceFresh = false) => {
    // 1. Immediately check offline cache first for instant display
    const cached = getCachedPrices(cropToFetch);
    const isFresh = cached && cached.prices && (Date.now() - cached.timestamp < 30 * 60 * 1000);

    if (cached && cached.prices && cached.prices.length > 0) {
      setPriceData(cached.prices);
      setSources(cached.sources || []);
      setLastUpdated(cached.formattedDate);
      setIsCached(true);
      if (isFresh && !forceFresh) {
        return;
      }
    }

    // 2. If offline, don't attempt network call
    if (!navigator.onLine) {
      if (!cached) {
        setPriceData([]);
        setSources([]);
        setLastUpdated('');
        setIsCached(false);
      }
      return;
    }

    // 3. Online: Fetch latest prices from service
    setLoading(true);
    try {
      const response = await getMarketPrices(cropToFetch);
      const data = response.data;
      if (data && data.length > 0) {
        setPriceData(data);
        setSources(response.sources || []);
        const nowStr = new Date().toLocaleString();
        setLastUpdated(nowStr);
        setIsCached(false);

        // Store to local-storage cache
        saveCachedPrices(cropToFetch, data, response.sources);
        refreshCachedIndex();

        // Check for Significant Price Surge Alerts
        const basePrice = priceBaselines[cropToFetch];
        const thresholdPct = preferences?.price_threshold_pct || 15;
        const thresholdMultiplier = 1 + (thresholdPct / 100);
        let hasAlert = false;
        data.forEach(p => {
          const isSurge = (basePrice && p.price >= basePrice * thresholdMultiplier) || p.trend === 'up';
          if (isSurge && !hasAlert) {
            const marketReg = getRegionFromMarket(p.market);
            sendRegionalPushNotification({
              type: 'price',
              title: `Significant Price Surge: ${cropToFetch}`,
              message: `Wholesale price climbed to GHS ${p.price} per ${p.unit} at ${p.market}. Market trend is upward.`,
              region: marketReg,
              severity: 'warning',
              view: 'PRICES'
            });
            hasAlert = true;
          }
        });
      } else if (!cached) {
        setPriceData([]);
      }
    } catch (err) {
      console.warn("Failed to fetch fresh prices, relying on cache:", err);
      if (cached) {
        setIsCached(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricesForCrop(selectedCrop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCrop, isOnline]);

  // Bulk Pre-cache feature for offline field visits
  const handlePrecacheAllCrops = async () => {
    if (!isOnline) {
      alert("Please connect to the internet to pre-cache offline market prices.");
      return;
    }

    setIsSyncingAll(true);
    let completed = 0;

    for (const crop of MAJOR_OFFLINE_CROPS) {
      setSyncProgress({
        current: completed + 1,
        total: MAJOR_OFFLINE_CROPS.length,
        cropName: crop
      });

      try {
        const resp = await getMarketPrices(crop);
        if (resp.data && resp.data.length > 0) {
          saveCachedPrices(crop, resp.data, resp.sources);
        }
      } catch (e) {
        console.warn(`Failed precaching for ${crop}:`, e);
      }

      completed++;
      // Polite delay between model calls
      await new Promise(r => setTimeout(r, 600));
    }

    recordFullSyncTimestamp();
    refreshCachedIndex();
    setIsSyncingAll(false);
    setSyncProgress(null);

    // Refresh currently selected crop display
    fetchPricesForCrop(selectedCrop);

    addNotification({
      type: 'price',
      title: 'Offline Price Pack Ready',
      message: `Cached market prices for ${MAJOR_OFFLINE_CROPS.length} staple crops. Ready for offline field visits!`,
      view: 'PRICES'
    });
  };

  return (
    <Card>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-green-100 rounded-full text-green-700">
            <TagIcon className="w-6 h-6 text-green-700" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-green-800">Nationwide Market Prices</h2>
            <p className="text-xs text-gray-500">Real-time commodity data with offline local caching</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-2.5 py-1.5 rounded-lg border border-emerald-300 font-semibold transition-colors"
            title="Configure regional push alerts"
          >
            <BellIcon className="w-3.5 h-3.5 text-emerald-700" />
            <span>Push Alerts</span>
          </button>

          {isOnline && (
            <button
              onClick={handlePrecacheAllCrops}
              disabled={isSyncingAll || loading}
              className="inline-flex items-center gap-1.5 text-xs bg-green-700 hover:bg-green-800 text-white font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-all disabled:opacity-50"
              title="Download major crop prices to device for offline field use"
            >
              <DownloadIcon className="w-4 h-4" />
              <span>{isSyncingAll ? 'Pre-caching...' : 'Pre-cache All Crops'}</span>
            </button>
          )}

          {isOnline && (
            <button
              onClick={() => fetchPricesForCrop(selectedCrop, true)}
              disabled={loading || isSyncingAll}
              className="inline-flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1.5 rounded-lg border border-gray-300 font-medium transition-colors"
              title="Refresh prices"
            >
              <RefreshCwIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-green-600' : ''}`} />
              <span>Refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* Sync Progress Bar */}
      {isSyncingAll && syncProgress && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-3 shadow-xs">
          <div className="flex items-center justify-between text-xs text-green-900 font-bold mb-1.5">
            <span>Pre-caching: {syncProgress.cropName}</span>
            <span>{syncProgress.current} / {syncProgress.total} crops</span>
          </div>
          <div className="w-full bg-green-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
            />
          </div>
          <p className="text-[11px] text-green-700 mt-1">
            Downloading wholesale market data so you can check rates in the field with 0 signal.
          </p>
        </div>
      )}

      {/* Offline / Cached Notice Banner */}
      {isCached ? (
        <div className="mb-4 bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs sm:text-sm text-amber-900 flex items-start gap-2 shadow-sm">
          <WifiOffIcon className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-grow">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <span className="font-bold text-amber-800 flex items-center gap-1">
                <DatabaseIcon className="w-3.5 h-3.5" /> Offline Cached Prices for {selectedCrop}
              </span>
              <span className="text-amber-700 text-xs">Saved: {lastUpdated}</span>
            </div>
            <p className="mt-0.5 text-amber-800/90 text-xs">
              Showing prices stored on your device. Great for rural markets (Techiman, Agbogbloshie, Kumasi) with poor cell service.
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-xs text-green-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-1.5">
            <CheckIcon className="w-4 h-4 text-green-600" />
            <span className="font-semibold">Live Market Prices</span>
            <span className="text-green-600 hidden sm:inline">• Cached locally on your device</span>
          </div>
          <span className="text-gray-500 text-[11px]">{lastUpdated ? `Updated: ${lastUpdated}` : 'Live'}</span>
        </div>
      )}

      {/* Crop Selector Controls */}
      <div className="mb-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
        <label htmlFor="crop-select" className="block text-sm font-semibold text-gray-800 mb-1">
          Select Crop:
        </label>
        <select
          id="crop-select"
          value={selectedCrop}
          onChange={(e) => setSelectedCrop(e.target.value as Crop)}
          className="block w-full px-3 py-2.5 text-base font-medium text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          {Object.values(Crop).map((crop) => {
            const isCachedForCrop = cachedCrops.includes(crop);
            return (
              <option key={crop} value={crop}>
                {crop} {isCachedForCrop ? ' (Available Offline ✓)' : ''}
              </option>
            );
          })}
        </select>

        {/* Quick Offline Shortcuts */}
        {cachedCrops.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-gray-200">
            <span className="text-xs font-semibold text-gray-500 block mb-1.5 flex items-center gap-1">
              <DatabaseIcon className="w-3 h-3 text-green-600" /> Saved Offline for Field Visits:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {cachedCrops.map((cropName) => (
                <button
                  key={cropName}
                  onClick={() => setSelectedCrop(cropName as Crop)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                    selectedCrop === cropName 
                      ? 'bg-green-700 text-white border-green-800 font-bold' 
                      : 'bg-white text-gray-700 border-gray-300 hover:border-green-500'
                  }`}
                >
                  {cropName}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2">
            <span>Wholesale Prices: {selectedCrop}</span>
            {isCached && (
              <span className="text-[11px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full border border-amber-200">
                Cached
              </span>
            )}
          </h3>
          {lastUpdated && <span className="text-xs text-gray-400">Date: {lastUpdated}</span>}
        </div>

        {loading && priceData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-xl border border-gray-200">
            <Spinner className="w-8 h-8 text-green-600 mb-2" />
            <p className="text-sm text-green-700 font-medium animate-pulse">
              Scanning wholesale commodity prices across Ghana...
            </p>
          </div>
        ) : priceData.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <WifiOffIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-700 font-medium">No cached price data found for {selectedCrop}.</p>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {isOnline 
                ? 'Try refreshing or select another crop.'
                : 'You are currently offline. Connect to the internet once to save prices for this crop.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th scope="col" className="px-5 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Trading Market</th>
                  <th scope="col" className="px-5 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Price (GHS)</th>
                  <th scope="col" className="px-5 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Standard Unit</th>
                  <th scope="col" className="px-5 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Trend</th>
                  <th scope="col" className="px-5 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Report Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {priceData.map((data, idx) => (
                  <tr key={idx} className="hover:bg-green-50/50 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      {data.market}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm font-extrabold text-green-700">
                      GHS {typeof data.price === 'number' ? data.price.toFixed(2) : data.price}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-xs text-gray-600 font-medium">{data.unit || '100kg bag'}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-xs">
                      {data.trend === 'up' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full font-bold bg-green-100 text-green-800">
                          <ArrowUpIcon className="w-3 h-3 mr-1 text-green-700"/> Rising
                        </span>
                      )}
                      {data.trend === 'down' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-800">
                          <ArrowDownIcon className="w-3 h-3 mr-1 text-red-600"/> Falling
                        </span>
                      )}
                      {(!data.trend || data.trend === 'stable') && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-700">
                          Stable
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-xs text-gray-400">{data.date || 'Current'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Sources Section */}
        {sources.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-200">
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
        
        <div className="mt-4 p-3 bg-amber-50 text-amber-900 text-xs rounded-lg border border-amber-200 leading-relaxed flex items-start gap-2">
          <DatabaseIcon className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
          <div>
            <strong>Offline Tip for Farmers:</strong> Before heading out to the farm or trade center, use the 
            <em> "Pre-cache All Crops"</em> button to save fresh wholesale rates for Maize, Yam, Cocoa, and Cassava on your device. You can then reference these prices offline when negotiating with aggregators.
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PriceAlerts;
