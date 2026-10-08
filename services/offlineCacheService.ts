import { WeatherForecast, GroundingSource, PriceData, Crop, AdvisoryStage, CachedDataWrapper, OfflineTip, GeoLocation } from '../types';

const STORAGE_KEYS = {
  WEATHER: 'agro_offline_weather_data',
  WEATHER_ALERT: 'agro_offline_weather_alert',
  LAST_LOCATION: 'agro_offline_last_location',
  PRICES_PREFIX: 'agro_offline_price_',
  PRICES_INDEX: 'agro_offline_price_crops_index',
  ADVISORY_PREFIX: 'agro_offline_advisory_',
  SAVED_TIPS: 'agro_offline_user_saved_tips',
  BOOKMARKS: 'agro_offline_tip_bookmarks',
  LAST_SYNC: 'agro_offline_last_full_sync'
};

// Safe LocalStorage Helpers
const getItem = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn(`[OfflineCache] Failed to read ${key}:`, e);
    return null;
  }
};

const setItem = <T>(key: string, value: T): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn(`[OfflineCache] Failed to write ${key}:`, e);
    return false;
  }
};

// ==========================================
// 1. WEATHER CACHING
// ==========================================

export interface CachedWeatherPayload {
  forecasts: WeatherForecast[];
  sources: GroundingSource[];
  region: string;
  location?: GeoLocation | null;
  timestamp: number;
  formattedDate: string;
}

export const saveCachedWeather = (
  forecasts: WeatherForecast[],
  sources: GroundingSource[] = [],
  region: string = '',
  location?: GeoLocation | null
): void => {
  if (!forecasts || forecasts.length === 0) return;
  const payload: CachedWeatherPayload = {
    forecasts,
    sources,
    region: region || forecasts[0]?.region || 'Ghana Regional Area',
    location: location || null,
    timestamp: Date.now(),
    formattedDate: new Date().toLocaleString()
  };
  setItem(STORAGE_KEYS.WEATHER, payload);
  if (location) {
    setItem(STORAGE_KEYS.LAST_LOCATION, location);
  }
};

export const getCachedWeather = (): CachedWeatherPayload | null => {
  return getItem<CachedWeatherPayload>(STORAGE_KEYS.WEATHER);
};

export const saveCachedWeatherAlert = (alertText: string): void => {
  if (!alertText) return;
  setItem(STORAGE_KEYS.WEATHER_ALERT, {
    alert: alertText,
    timestamp: Date.now(),
    formattedDate: new Date().toLocaleString()
  });
};

export const getCachedWeatherAlert = (): { alert: string; timestamp: number; formattedDate: string } | null => {
  return getItem(STORAGE_KEYS.WEATHER_ALERT);
};

export const getLastKnownLocation = (): GeoLocation | null => {
  return getItem<GeoLocation>(STORAGE_KEYS.LAST_LOCATION);
};

// ==========================================
// 2. MARKET PRICES CACHING
// ==========================================

export interface CachedPricePayload {
  crop: Crop;
  prices: PriceData[];
  sources: GroundingSource[];
  timestamp: number;
  formattedDate: string;
}

export const saveCachedPrices = (
  crop: Crop,
  prices: PriceData[],
  sources: GroundingSource[] = []
): void => {
  if (!prices || prices.length === 0) return;
  const key = `${STORAGE_KEYS.PRICES_PREFIX}${crop}`;
  const payload: CachedPricePayload = {
    crop,
    prices,
    sources,
    timestamp: Date.now(),
    formattedDate: new Date().toLocaleString()
  };
  setItem(key, payload);

  // Update indexed list of crops
  const existingIndex = getItem<string[]>(STORAGE_KEYS.PRICES_INDEX) || [];
  if (!existingIndex.includes(crop)) {
    existingIndex.push(crop);
    setItem(STORAGE_KEYS.PRICES_INDEX, existingIndex);
  }
};

export const getCachedPrices = (crop: Crop): CachedPricePayload | null => {
  const key = `${STORAGE_KEYS.PRICES_PREFIX}${crop}`;
  return getItem<CachedPricePayload>(key);
};

export const getAllCachedCropsIndex = (): string[] => {
  return getItem<string[]>(STORAGE_KEYS.PRICES_INDEX) || [];
};

export const getAllCachedPricesSummary = (): { crop: string; count: number; formattedDate: string; avgPrice: number }[] => {
  const index = getAllCachedCropsIndex();
  const summaries: { crop: string; count: number; formattedDate: string; avgPrice: number }[] = [];

  for (const cropName of index) {
    const data = getItem<CachedPricePayload>(`${STORAGE_KEYS.PRICES_PREFIX}${cropName}`);
    if (data && data.prices?.length > 0) {
      const avg = Math.round(data.prices.reduce((sum, p) => sum + (p.price || 0), 0) / data.prices.length);
      summaries.push({
        crop: cropName,
        count: data.prices.length,
        formattedDate: data.formattedDate,
        avgPrice: avg
      });
    }
  }

  return summaries;
};

// ==========================================
// 3. CROP ADVISORY CACHING
// ==========================================

export interface CachedAdvisoryPayload {
  crop: Crop;
  plantingDate: string;
  stages: AdvisoryStage[];
  sources: GroundingSource[];
  timestamp: number;
  formattedDate: string;
}

export const saveCachedAdvisory = (
  crop: Crop,
  plantingDate: string,
  stages: AdvisoryStage[],
  sources: GroundingSource[] = []
): void => {
  if (!stages || stages.length === 0) return;
  const key = `${STORAGE_KEYS.ADVISORY_PREFIX}${crop}`;
  const payload: CachedAdvisoryPayload = {
    crop,
    plantingDate,
    stages,
    sources,
    timestamp: Date.now(),
    formattedDate: new Date().toLocaleString()
  };
  setItem(key, payload);
};

export const getCachedAdvisory = (crop: Crop): CachedAdvisoryPayload | null => {
  const key = `${STORAGE_KEYS.ADVISORY_PREFIX}${crop}`;
  return getItem<CachedAdvisoryPayload>(key);
};

// ==========================================
// 4. PRELOADED GHANAIAN OFFLINE FARMING TIPS & MANUALS
// ==========================================

export const PRELOADED_OFFLINE_TIPS: OfflineTip[] = [
  {
    id: 'tip-faw-ash-neem',
    title: 'Emergency Fall Armyworm Control (Ash & Neem Extract)',
    category: 'pest',
    crop: Crop.Maize,
    content: '1. Mix 2 handfuls of fine, dry wood ash with 1 handful of fine sand or dried soil. Drop a pinch directly into the leaf funnel (whorl) of young maize plants where larvae hide. This suffocates and lacerates the caterpillars naturally.\n2. Neem Extract: Pound 500g of fresh neem seeds or leaves in 5 liters of water. Soak overnight, strain through a cloth, add a spoonful of soap (acts as spreader), and spray at dawn or dusk when larvae are feeding.\n3. Scout fields early morning twice weekly during the 2nd to 6th week after germination.',
    tags: ['Fall Armyworm', 'Organic Pest Control', 'Maize', 'Neem Spray'],
    createdAt: 'MoFA Recommended Practice'
  },
  {
    id: 'tip-cocoa-blackpod',
    title: 'Cocoa Black Pod (Phytophthora) Emergency Management',
    category: 'pest',
    crop: Crop.Cocoa,
    content: '1. Regular Sanitary Harvesting: Every 7 to 10 days, remove all infected and mummified black pods with a sharp harvesting hook and bury them away from the farm.\n2. Canopy & Shade Management: Prune mistletoe and excess chupons to allow sunlight and breeze to penetrate the canopy, reducing the high humidity the fungus thrives on.\n3. Drainage: Clear watercourses and weed around the base of cocoa trees during the heavy rains in June-July and September-October.',
    tags: ['Cocoa', 'Black Pod', 'Pruning', 'Disease Control'],
    createdAt: 'COCOBOD / CRIG Guideline'
  },
  {
    id: 'tip-drought-mulching',
    title: 'Soil Moisture Retention & Zai Pits for Dry Spells',
    category: 'soil',
    crop: 'General Crops',
    content: '1. Heavy Mulching: Cover soil around plants with 5-10 cm of dry grass, rice straw, or maize stalks. Mulching reduces soil temperature by 4-6°C and cuts evaporation by up to 50%.\n2. Zai Pits (Planting Basins): Dig small pits (20cm wide, 15cm deep) spaced 75cm apart. Fill with 2 handfuls of decomposed manure or compost and topsoil. Plant seeds in the basins to capture every drop of early rains.\n3. Water at sunset or before 7:00 AM to prevent rapid midday evaporation.',
    tags: ['Water Conservation', 'Mulching', 'Zai Pits', 'Climate Resilience'],
    createdAt: 'SARI / CSIR Dryland Farming'
  },
  {
    id: 'tip-grain-pics-storage',
    title: 'PICS Hermetic Bags & Grain Storage without Toxic Chemicals',
    category: 'storage',
    crop: Crop.Maize,
    content: '1. Purdue Improved Crop Storage (PICS) Bags: Use 3-layer hermetic bags to store maize, cowpeas, and sorghum. Tie each inner polyethylene liner tightly with string. Weevils and borers die of oxygen deprivation within 3-4 weeks.\n2. The Salt Bottle Dryness Test: Place a handful of dry grains with a spoonful of dry salt in a clean, dry glass jar. Shake well and leave for 10 minutes. If salt sticks to the sides of the glass, the grain moisture is above 13% and will rot—dry on clean tarpaulins for 2 more sunny days.\n3. Store bags on wooden pallets, never directly on cement or dirt floors.',
    tags: ['Grain Storage', 'PICS Bags', 'Post-Harvest', 'Weevil Prevention'],
    createdAt: 'MoFA Post-Harvest Unit'
  },
  {
    id: 'tip-tomato-blight',
    title: 'Tomato & Pepper Early/Late Blight and Bacterial Wilt Field Protection',
    category: 'pest',
    crop: Crop.Tomato,
    content: '1. Never plant tomatoes or peppers in soil where tomatoes, garden eggs, or potatoes grew in the last 2 seasons (rotate with maize, sorghum, or cassava).\n2. Stake tomato vines off the wet ground using sturdy bamboo or wooden sticks to prevent soil-splash pathogens from reaching foliage.\n3. Make raised beds (20-30 cm high) during the minor and major rainy seasons to prevent waterlogging around roots.\n4. Remove bottom leaves touching the soil (bottom 15cm).',
    tags: ['Tomatoes', 'Pepper', 'Bacterial Wilt', 'Staking', 'Drainage'],
    createdAt: 'Vegetable Producers Association Guide'
  },
  {
    id: 'tip-organic-compost',
    title: 'Rapid Farm Compost with Neem & Poultry Manure',
    category: 'soil',
    crop: 'All Crops',
    content: '1. The 3:1 Carbon-to-Nitrogen Layer: Alternate 3 parts dry brown material (dried maize stalks, straw, dry grass) with 1 part green nitrogen-rich material (poultry droppings, fresh weeds, kitchen scraps).\n2. Add crushed neem leaves to each layer to deter subterranean termites and root-knot nematodes.\n3. Keep the heap moist like a damp sponge. Turn the pile once every 14 days. Rich dark compost is ready in 6-8 weeks, reducing chemical fertilizer expenditure by up to 40%.',
    tags: ['Compost', 'Organic Fertilizer', 'Poultry Manure', 'Cost Saving'],
    createdAt: 'Eco-Farming Ghana'
  },
  {
    id: 'tip-mofa-emergency-contacts',
    title: 'Ministry of Food and Agriculture (MoFA) & Extension Hotlines',
    category: 'contacts',
    crop: 'National Support',
    content: 'Keep these emergency agricultural extension contacts saved on your phone for immediate field support:\n- MoFA National Help Desk: +233 (0)302 666 567 / Toll Free 1888\n- Greater Accra Regional Director of Agric: +233 (0)302 662 571\n- Ashanti Regional Agric Directorate (Kumasi): +233 (0)322 022 396\n- Northern Region Agric Directorate (Tamale): +233 (0)372 022 419\n- Eastern Region Agric Office (Koforidua): +233 (0)342 022 284\n- Volta Region Agric Directorate (Ho): +233 (0)362 026 438\n- Western Region Agric Office (Sekondi): +233 (0)312 046 312\n- Plant Protection and Regulatory Services (PPRSD - Pokuase): +233 (0)302 912 360',
    tags: ['MoFA', 'Extension Officers', 'Emergency Contacts', 'Hotline'],
    createdAt: 'Official MoFA Directory'
  }
];

// ==========================================
// 5. USER SAVED OFFLINE TIPS & BOOKMARKS
// ==========================================

export const getUserSavedTips = (): OfflineTip[] => {
  return getItem<OfflineTip[]>(STORAGE_KEYS.SAVED_TIPS) || [];
};

export const saveUserOfflineTip = (tipData: Omit<OfflineTip, 'id' | 'createdAt' | 'isCustom'>): OfflineTip => {
  const current = getUserSavedTips();
  const newTip: OfflineTip = {
    ...tipData,
    id: `custom-tip-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    createdAt: new Date().toLocaleDateString(),
    isCustom: true,
    isBookmarked: true
  };
  current.unshift(newTip);
  setItem(STORAGE_KEYS.SAVED_TIPS, current);
  return newTip;
};

export const deleteUserOfflineTip = (id: string): void => {
  const current = getUserSavedTips();
  const updated = current.filter(t => t.id !== id);
  setItem(STORAGE_KEYS.SAVED_TIPS, updated);
};

export const getBookmarkedTipIds = (): string[] => {
  return getItem<string[]>(STORAGE_KEYS.BOOKMARKS) || [];
};

export const toggleBookmarkTip = (tipId: string): boolean => {
  const bookmarks = getBookmarkedTipIds();
  const exists = bookmarks.includes(tipId);
  const updated = exists ? bookmarks.filter(id => id !== tipId) : [...bookmarks, tipId];
  setItem(STORAGE_KEYS.BOOKMARKS, updated);
  return !exists;
};

export const getAllOfflineTips = (): OfflineTip[] => {
  const custom = getUserSavedTips();
  const bookmarks = getBookmarkedTipIds();

  // Combine custom tips first, then preloaded
  const all = [...custom, ...PRELOADED_OFFLINE_TIPS];
  return all.map(t => ({
    ...t,
    isBookmarked: t.isCustom || bookmarks.includes(t.id)
  }));
};

// ==========================================
// 6. CACHE DIAGNOSTICS & MANAGEMENT
// ==========================================

export interface CacheStatistics {
  hasWeather: boolean;
  weatherDate: string | null;
  weatherRegion: string | null;
  cachedCropsCount: number;
  cachedCropsList: string[];
  savedTipsCount: number;
  totalTipsCount: number;
  approximateStorageKb: number;
  lastSyncFormatted: string | null;
}

export const getOfflineCacheStats = (): CacheStatistics => {
  const weather = getCachedWeather();
  const crops = getAllCachedCropsIndex();
  const customTips = getUserSavedTips();
  const lastSync = getItem<string>(STORAGE_KEYS.LAST_SYNC);

  // Calculate approximate storage usage
  let totalBytes = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('agro_offline_')) {
      const val = localStorage.getItem(key) || '';
      totalBytes += key.length + val.length;
    }
  }

  return {
    hasWeather: !!weather,
    weatherDate: weather ? weather.formattedDate : null,
    weatherRegion: weather ? weather.region : null,
    cachedCropsCount: crops.length,
    cachedCropsList: crops,
    savedTipsCount: customTips.length,
    totalTipsCount: customTips.length + PRELOADED_OFFLINE_TIPS.length,
    approximateStorageKb: Math.round(totalBytes / 1024 * 10) / 10,
    lastSyncFormatted: lastSync || (weather ? weather.formattedDate : null)
  };
};

export const recordFullSyncTimestamp = (): void => {
  setItem(STORAGE_KEYS.LAST_SYNC, new Date().toLocaleString());
};

export const clearOfflineCache = (scope: 'all' | 'weather' | 'prices' | 'tips' = 'all'): void => {
  if (scope === 'all' || scope === 'weather') {
    localStorage.removeItem(STORAGE_KEYS.WEATHER);
    localStorage.removeItem(STORAGE_KEYS.WEATHER_ALERT);
  }
  if (scope === 'all' || scope === 'prices') {
    const crops = getAllCachedCropsIndex();
    for (const crop of crops) {
      localStorage.removeItem(`${STORAGE_KEYS.PRICES_PREFIX}${crop}`);
    }
    localStorage.removeItem(STORAGE_KEYS.PRICES_INDEX);
  }
  if (scope === 'all' || scope === 'tips') {
    localStorage.removeItem(STORAGE_KEYS.SAVED_TIPS);
    localStorage.removeItem(STORAGE_KEYS.BOOKMARKS);
  }
  if (scope === 'all') {
    localStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
  }
};
