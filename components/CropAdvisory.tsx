import React, { useState, useEffect } from 'react';
import { getAdvisory } from '../services/geminiService';
import { useGeolocation } from '../hooks/useGeolocation';
import type { AdvisoryStage, GroundingSource } from '../types';
import { Crop } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import { 
  Spinner, 
  SearchIcon, 
  AlertTriangleIcon, 
  SproutIcon,
  WifiOffIcon,
  DatabaseIcon,
  BookmarkIcon,
  CheckIcon
} from './common/icons';
import { 
  saveCachedAdvisory, 
  getCachedAdvisory, 
  saveUserOfflineTip 
} from '../services/offlineCacheService';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useNotifications } from '../contexts/NotificationContext';

const CropAdvisory: React.FC = () => {
  const { location, loading: geoLoading, error: geoError } = useGeolocation();
  const { isOnline } = useNetworkStatus();
  const { addNotification } = useNotifications();

  const [selectedCrop, setSelectedCrop] = useState<Crop>(Crop.Maize);
  const [plantingDate, setPlantingDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [advisory, setAdvisory] = useState<AdvisoryStage[]>([]);
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCached, setIsCached] = useState(false);
  const [cachedDate, setCachedDate] = useState('');
  const [savedStageIndexes, setSavedStageIndexes] = useState<number[]>([]);

  // Check for cached advisory on crop change
  useEffect(() => {
    const cached = getCachedAdvisory(selectedCrop);
    if (cached && cached.stages && cached.stages.length > 0) {
      setAdvisory(cached.stages);
      setSources(cached.sources || []);
      setPlantingDate(cached.plantingDate || new Date().toISOString().split('T')[0]);
      setIsCached(true);
      setCachedDate(cached.formattedDate);
    } else {
      setIsCached(false);
      setCachedDate('');
    }
  }, [selectedCrop]);

  const handleGenerate = async () => {
    if (!location && isOnline) {
      setError('Waiting for GPS coordinates to assess local climate conditions.');
      return;
    }

    if (!isOnline) {
      const cached = getCachedAdvisory(selectedCrop);
      if (cached) {
        setAdvisory(cached.stages);
        setSources(cached.sources || []);
        setIsCached(true);
        setCachedDate(cached.formattedDate);
        setError('');
      } else {
        setError('You are offline. Cannot generate a new custom advisory without an internet connection, and no cached advisory is saved for this crop yet.');
      }
      return;
    }

    setLoading(true);
    setError('');
    setSavedStageIndexes([]);

    try {
      const locToUse = location || { latitude: 5.6037, longitude: -0.1870 }; // default Accra if pending
      const response = await getAdvisory(selectedCrop, plantingDate, locToUse);
      setAdvisory(response.data);
      setSources(response.sources);
      setIsCached(false);

      // Save to local storage for offline farm work
      saveCachedAdvisory(selectedCrop, plantingDate, response.data, response.sources);
      setCachedDate(new Date().toLocaleString());

      addNotification({
        type: 'advisory',
        title: 'Advisory Plan Ready & Cached',
        message: `${selectedCrop} management plan saved to device for offline field use.`,
        view: 'ADVISORY'
      });
    } catch (err) {
      console.error(err);
      // Fallback to cache if available
      const cached = getCachedAdvisory(selectedCrop);
      if (cached) {
        setAdvisory(cached.stages);
        setSources(cached.sources || []);
        setIsCached(true);
        setCachedDate(cached.formattedDate);
        setError('Could not connect to live AI services. Loaded your previously cached offline plan.');
      } else {
        setError('Failed to generate advisory. Please check your internet connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Save single stage into Offline Tips & Guides
  const handleSaveStageAsTip = (stage: AdvisoryStage, index: number) => {
    saveUserOfflineTip({
      title: `${selectedCrop}: ${stage.stage} (${stage.timeline})`,
      category: 'advisory',
      crop: selectedCrop,
      content: stage.instructions.join('\n• '),
      tags: [selectedCrop, stage.timeline, 'Custom Advisory']
    });

    setSavedStageIndexes(prev => [...prev, index]);

    addNotification({
      type: 'offline',
      title: 'Saved to Offline Field Tips',
      message: `"${stage.stage}" has been saved to your Offline Field Guide!`,
      view: 'OFFLINE_GUIDE'
    });
  };

  return (
    <Card>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-green-100 rounded-full text-green-700">
            <SproutIcon className="w-6 h-6 text-green-700" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-green-800">Smart Crop Advisory</h2>
            <p className="text-xs text-gray-500">Tailored agricultural guidance saved for offline field visits</p>
          </div>
        </div>

        {isCached && (
          <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-900 border border-amber-300 font-semibold px-2.5 py-1 rounded-full">
            <DatabaseIcon className="w-3.5 h-3.5 text-amber-700" /> Cached ({cachedDate || 'Offline'})
          </span>
        )}
      </div>

      {/* Input Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Select Crop</label>
          <select
            value={selectedCrop}
            onChange={(e) => setSelectedCrop(e.target.value as Crop)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-sm"
          >
            {Object.values(Crop).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Planting / Sowing Date</label>
          <input
            type="date"
            value={plantingDate}
            onChange={(e) => setPlantingDate(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-sm"
          >
          </input>
        </div>
      </div>

      {geoError && !location && (
        <div className="mb-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 p-2.5 rounded-lg">
          GPS Note: {geoError}. Advisory will use regional Ghana conditions.
        </div>
      )}

      <div className="flex justify-end mb-6">
        <Button 
          onClick={handleGenerate} 
          disabled={loading || (!isOnline && !getCachedAdvisory(selectedCrop))} 
          isLoading={loading}
          className="w-full md:w-auto"
        >
          {loading ? 'Generating Custom Plan...' : isOnline ? 'Generate / Update Plan' : 'Load Saved Offline Plan'}
        </Button>
      </div>

      {error && (
        <div className="p-3.5 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 mb-4 text-xs sm:text-sm flex items-start gap-2">
          <AlertTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Advisory Stages List */}
      <div className="space-y-6 relative mt-4">
        {advisory.length > 0 && (
          <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-green-200"></div>
        )}
        
        {advisory.map((stage, index) => {
          const isSaved = savedStageIndexes.includes(index);
          return (
            <div key={index} className="relative pl-10 animate-fade-in" style={{ animationDelay: `${index * 80}ms` }}>
              <div className="absolute left-0 top-1 p-1.5 bg-green-600 rounded-full border-4 border-white shadow-sm z-10">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base sm:text-lg text-gray-900">{stage.stage}</h3>
                    <span className="bg-green-100 text-green-800 text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {stage.timeline}
                    </span>
                  </div>

                  <button
                    onClick={() => handleSaveStageAsTip(stage, index)}
                    className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-colors self-start sm:self-auto ${
                      isSaved 
                        ? 'bg-amber-100 text-amber-800 border-amber-300 font-semibold' 
                        : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-green-50 hover:text-green-700 hover:border-green-300'
                    }`}
                    title="Bookmark this stage to your permanent Offline Field Guide"
                  >
                    {isSaved ? <CheckIcon className="w-3.5 h-3.5 text-amber-700" /> : <BookmarkIcon className="w-3.5 h-3.5 text-gray-500" />}
                    <span>{isSaved ? 'Saved Offline' : 'Save to Offline Guide'}</span>
                  </button>
                </div>

                <ul className="space-y-2">
                  {stage.instructions.map((instruction, i) => (
                    <li key={i} className="flex items-start text-xs sm:text-sm text-gray-700 leading-relaxed">
                      <span className="mr-2 mt-1.5 w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0"></span>
                      <span>{instruction}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {sources.length > 0 && (
        <div className="mt-8 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 flex items-center gap-1 mb-2 font-semibold">
            <SearchIcon className="w-3 h-3" /> Data Sources:
          </p>
          <div className="flex flex-wrap gap-2">
            {sources.map((source, idx) => (
              <a 
                key={idx} 
                href={source.uri} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-xs bg-gray-50 hover:bg-gray-100 border border-gray-200 text-blue-600 px-2 py-1 rounded-md truncate max-w-[250px] transition-colors"
                title={source.title}
              >
                {source.title}
              </a>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default CropAdvisory;
