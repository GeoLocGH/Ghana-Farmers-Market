import React, { useState, useEffect } from 'react';
import Card from './common/Card';
import { 
  OfflineTip, 
  Crop, 
  View 
} from '../types';
import { 
  getAllOfflineTips, 
  saveUserOfflineTip, 
  deleteUserOfflineTip, 
  toggleBookmarkTip, 
  getOfflineCacheStats, 
  clearOfflineCache, 
  getCachedWeather, 
  getAllCachedPricesSummary,
  CacheStatistics
} from '../services/offlineCacheService';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useNotifications } from '../contexts/NotificationContext';
import { 
  DatabaseIcon, 
  WifiOffIcon, 
  WifiIcon, 
  BookmarkIcon, 
  BookmarkSolidIcon, 
  BookOpenIcon, 
  PlusIcon, 
  SearchIcon, 
  SunIcon, 
  TagIcon, 
  SproutIcon, 
  CheckIcon, 
  DownloadIcon, 
  RefreshCwIcon,
  XIcon
} from './common/icons';

interface OfflineGuideProps {
  setActiveView?: (view: View) => void;
}

const CATEGORIES = [
  { id: 'all', label: 'All Tips' },
  { id: 'bookmarked', label: 'Saved / Bookmarks' },
  { id: 'pest', label: 'Pest & Diseases' },
  { id: 'soil', label: 'Soil & Water' },
  { id: 'storage', label: 'Post-Harvest & Storage' },
  { id: 'contacts', label: 'MoFA Hotlines' },
  { id: 'advisory', label: 'Crop Advisory Notes' }
];

const OfflineGuide: React.FC<OfflineGuideProps> = ({ setActiveView }) => {
  const { isOnline } = useNetworkStatus();
  const { addNotification } = useNotifications();

  const [tips, setTips] = useState<OfflineTip[]>([]);
  const [stats, setStats] = useState<CacheStatistics | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);

  // New tip form state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<OfflineTip['category']>('general');
  const [newCrop, setNewCrop] = useState('');

  // Cached summary state for inspection
  const [cachedWeather, setCachedWeather] = useState(getCachedWeather());
  const [cachedPricesSummary, setCachedPricesSummary] = useState(getAllCachedPricesSummary());

  const refreshData = () => {
    setTips(getAllOfflineTips());
    setStats(getOfflineCacheStats());
    setCachedWeather(getCachedWeather());
    setCachedPricesSummary(getAllCachedPricesSummary());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleToggleBookmark = (tipId: string) => {
    toggleBookmarkTip(tipId);
    refreshData();
  };

  const handleDeleteTip = (tipId: string) => {
    if (confirm("Are you sure you want to remove this saved offline tip?")) {
      deleteUserOfflineTip(tipId);
      refreshData();
      addNotification({
        type: 'offline',
        title: 'Tip Removed',
        message: 'Tip removed from your offline storage.',
        view: 'OFFLINE_GUIDE'
      });
    }
  };

  const handleCreateTip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      alert("Please provide both a title and instructions/content.");
      return;
    }

    saveUserOfflineTip({
      title: newTitle.trim(),
      content: newContent.trim(),
      category: newCategory,
      crop: newCrop.trim() || undefined,
      tags: [newCategory, newCrop].filter(Boolean) as string[]
    });

    setNewTitle('');
    setNewContent('');
    setNewCrop('');
    setShowAddForm(false);
    refreshData();

    addNotification({
      type: 'offline',
      title: 'Custom Field Tip Saved',
      message: `"${newTitle}" is now stored offline on your device!`,
      view: 'OFFLINE_GUIDE'
    });
  };

  const handleClearCache = (scope: 'all' | 'weather' | 'prices' | 'tips') => {
    const msg = scope === 'all' 
      ? 'Clear all cached offline data (weather, prices, and saved notes)?'
      : `Clear cached ${scope} data?`;
    if (confirm(msg)) {
      clearOfflineCache(scope);
      refreshData();
      addNotification({
        type: 'offline',
        title: 'Cache Cleared',
        message: `Offline ${scope} cache has been reset.`,
        view: 'OFFLINE_GUIDE'
      });
    }
  };

  // Filtered tips
  const filteredTips = tips.filter((tip) => {
    const matchesCat = 
      activeCategory === 'all' ? true :
      activeCategory === 'bookmarked' ? tip.isBookmarked :
      tip.category === activeCategory;

    const matchesSearch = 
      searchQuery === '' ||
      tip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tip.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tip.crop && tip.crop.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tip.tags && tip.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));

    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <Card>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-100 rounded-xl text-green-700">
              <BookOpenIcon className="w-7 h-7 text-green-700" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-green-800 flex items-center gap-2">
                <span>Offline Farm Guide & Local Storage Hub</span>
              </h2>
              <p className="text-xs text-gray-500">
                Guaranteed access to crucial farming information, prices, and weather when you have zero network coverage.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${
              isOnline 
                ? 'bg-green-50 text-green-800 border-green-300' 
                : 'bg-amber-100 text-amber-900 border-amber-300'
            }`}>
              {isOnline ? <WifiIcon className="w-3.5 h-3.5 text-green-600" /> : <WifiOffIcon className="w-3.5 h-3.5 text-amber-600" />}
              <span>{isOnline ? 'Online (Connected)' : 'Offline Mode (Local Storage)'}</span>
            </span>
          </div>
        </div>

        {/* Offline Readiness Metrics Dashboard */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Weather Cache</span>
              <SunIcon className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-base font-extrabold text-slate-800">
              {stats?.hasWeather ? 'Cached ✓' : 'Empty'}
            </div>
            <div className="text-[11px] text-slate-500 truncate mt-0.5">
              {stats?.weatherRegion || 'No region saved yet'}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Market Prices</span>
              <TagIcon className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-base font-extrabold text-slate-800">
              {stats?.cachedCropsCount || 0} Crops
            </div>
            <div className="text-[11px] text-slate-500 truncate mt-0.5">
              Available without data
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Saved Tips</span>
              <BookmarkSolidIcon className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-base font-extrabold text-slate-800">
              {stats?.totalTipsCount || 0} Total
            </div>
            <div className="text-[11px] text-slate-500 truncate mt-0.5">
              {stats?.savedTipsCount || 0} custom notes
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Device Storage</span>
              <DatabaseIcon className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-base font-extrabold text-slate-800">
              {stats?.approximateStorageKb || 0} KB
            </div>
            <div className="text-[11px] text-slate-500 truncate mt-0.5">
              Local Storage + SW
            </div>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center gap-1.5 text-xs bg-green-700 hover:bg-green-800 text-white font-semibold px-3 py-1.5 rounded-lg shadow-xs transition-colors"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>Add Field Note / Custom Tip</span>
            </button>

            {setActiveView && (
              <button
                onClick={() => setActiveView('PRICES')}
                className="inline-flex items-center gap-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-3 py-1.5 rounded-lg border border-gray-300 transition-colors"
              >
                <TagIcon className="w-3.5 h-3.5 text-green-700" />
                <span>Go to Prices</span>
              </button>
            )}

            {setActiveView && (
              <button
                onClick={() => setActiveView('WEATHER')}
                className="inline-flex items-center gap-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-3 py-1.5 rounded-lg border border-gray-300 transition-colors"
              >
                <SunIcon className="w-3.5 h-3.5 text-amber-600" />
                <span>Go to Weather</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleClearCache('all')}
              className="text-xs text-red-600 hover:text-red-800 hover:underline px-2 py-1"
              title="Reset all cached offline records"
            >
              Reset Cache
            </button>
          </div>
        </div>
      </Card>

      {/* Add Custom Tip Form */}
      {showAddForm && (
        <Card>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-base text-gray-800 flex items-center gap-2">
              <PlusIcon className="w-4 h-4 text-green-700" /> Add Custom Offline Farm Note
            </h3>
            <button 
              onClick={() => setShowAddForm(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleCreateTip} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Tip / Note Title *</label>
              <input
                type="text"
                placeholder="e.g. Organic Soap Spray for Aphids on Cassava"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as OfflineTip['category'])}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                  <option value="pest">Pest & Diseases</option>
                  <option value="soil">Soil & Water Management</option>
                  <option value="storage">Post-Harvest & Storage</option>
                  <option value="weather">Weather Preparedness</option>
                  <option value="contacts">Extension Contacts</option>
                  <option value="general">General Field Note</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Related Crop (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Maize, Cocoa, Tomato"
                  value={newCrop}
                  onChange={(e) => setNewCrop(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Actionable Content & Instructions *</label>
              <textarea
                rows={4}
                placeholder="Write step-by-step instructions, dosages, observation notes, or telephone contacts..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs bg-green-700 hover:bg-green-800 text-white font-bold rounded-lg shadow-xs"
              >
                Save to Device Storage
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Main Guides & Tips Section */}
      <Card>
        {/* Search & Category Filter */}
        <div className="space-y-3 mb-6">
          <div className="relative">
            <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search offline tips, pests, MoFA hotlines, storage methods..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                  activeCategory === cat.id
                    ? 'bg-green-800 text-white font-bold shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tips Grid */}
        {filteredTips.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <BookOpenIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-700 font-semibold text-sm">No tips match your filter.</p>
            <p className="text-xs text-gray-500 mt-0.5">Try searching for a different keyword or select "All Tips".</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTips.map((tip) => (
              <div 
                key={tip.id} 
                className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-800 px-2 py-0.5 rounded">
                        {tip.category}
                      </span>
                      {tip.crop && (
                        <span className="text-[10px] font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                          {tip.crop}
                        </span>
                      )}
                      {tip.isCustom && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                          User Note
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleBookmark(tip.id)}
                        className="p-1 text-gray-400 hover:text-amber-500 transition-colors"
                        title={tip.isBookmarked ? "Remove bookmark" : "Bookmark for quick access"}
                      >
                        {tip.isBookmarked ? (
                          <BookmarkSolidIcon className="w-4 h-4 text-amber-500" />
                        ) : (
                          <BookmarkIcon className="w-4 h-4" />
                        )}
                      </button>

                      {tip.isCustom && (
                        <button
                          onClick={() => handleDeleteTip(tip.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete custom note"
                        >
                          <XIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-base text-gray-900 mb-2 leading-snug">
                    {tip.title}
                  </h3>

                  <div className="text-xs text-gray-700 whitespace-pre-line leading-relaxed mb-3">
                    {tip.content}
                  </div>
                </div>

                <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                  <span>{tip.createdAt}</span>
                  {tip.tags && tip.tags.length > 0 && (
                    <span className="text-gray-500">#{tip.tags[0]}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Snapshot of Stored Offline Prices & Weather */}
      {(cachedWeather || cachedPricesSummary.length > 0) && (
        <Card>
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
            <DatabaseIcon className="w-5 h-5 text-green-700" />
            <h3 className="font-bold text-base text-gray-800">
              Offline Storage Inventory
            </h3>
          </div>

          <div className="space-y-4">
            {/* Weather Snapshot */}
            {cachedWeather && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <SunIcon className="w-4 h-4 text-amber-500" /> Cached Weather: {cachedWeather.region}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">Saved: {cachedWeather.formattedDate}</p>
                  </div>
                  {setActiveView && (
                    <button
                      onClick={() => setActiveView('WEATHER')}
                      className="text-xs text-green-700 font-bold hover:underline"
                    >
                      Open Forecast →
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-200 text-xs">
                  {cachedWeather.forecasts.map((f, i) => (
                    <div key={i} className="text-center p-1.5 bg-white rounded border border-slate-200">
                      <div className="font-semibold text-slate-700 text-[11px]">{f.day}</div>
                      <div className="text-sm font-bold text-green-700">{f.temp}°C</div>
                      <div className="text-[10px] text-slate-500">{f.condition}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cached Crop Prices Inventory */}
            {cachedPricesSummary.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <TagIcon className="w-4 h-4 text-green-600" /> Cached Wholesale Price Sheets ({cachedPricesSummary.length} crops)
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">Ready for reference in off-grid markets</p>
                  </div>
                  {setActiveView && (
                    <button
                      onClick={() => setActiveView('PRICES')}
                      className="text-xs text-green-700 font-bold hover:underline"
                    >
                      View Price Sheets →
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pt-2 border-t border-slate-200">
                  {cachedPricesSummary.map((item, i) => (
                    <div key={i} className="p-2 bg-white rounded-lg border border-slate-200 text-xs">
                      <div className="font-bold text-slate-800 truncate">{item.crop}</div>
                      <div className="text-green-700 font-extrabold mt-0.5">Avg GHS {item.avgPrice}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{item.count} markets</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default OfflineGuide;
