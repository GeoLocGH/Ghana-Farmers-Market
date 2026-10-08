
import React, { useEffect, useState, useRef } from 'react';
import Card from './common/Card';
import { 
  CloudIcon, 
  TagIcon, 
  BugIcon, 
  ShoppingCartIcon, 
  SproutIcon, 
  UsersIcon, 
  AlertTriangleIcon, 
  HarvesterIcon, 
  WalletIcon, 
  TractorIcon, 
  Spinner, 
  UploadIcon,
  BookOpenIcon,
  WifiOffIcon,
  DatabaseIcon,
  BellIcon
} from './common/icons';
import { useNotifications } from '../contexts/NotificationContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { checkWeatherAlerts } from '../services/geminiService';
import type { View, User } from '../types';
import { uploadUserFile } from '../services/storageService';
import { supabase } from '../services/supabase';
import { saveCachedWeatherAlert, getCachedWeatherAlert } from '../services/offlineCacheService';
import { useLanguage } from '../contexts/LanguageContext';

interface DashboardProps {
  setActiveView: (view: View) => void;
  user: User | null;
}

const Dashboard: React.FC<DashboardProps> = ({ setActiveView, user }) => {
  const { addNotification, sendRegionalPushNotification, setIsSettingsOpen, userRegion } = useNotifications();
  const { location } = useGeolocation();
  const { t } = useLanguage();
  const [liveAlert, setLiveAlert] = useState<string>(() => {
    const cached = getCachedWeatherAlert();
    return cached ? cached.alert : 'Initializing global weather scan...';
  });
  const [isAlertCached, setIsAlertCached] = useState<boolean>(() => {
    return !!getCachedWeatherAlert();
  });
  const [isFetchingAlerts, setIsFetchingAlerts] = useState(false);
  
  const DEFAULT_DASHBOARD_LOGO = '/src/assets/images/ghana_farmers_market_logo_1791426087479.jpg';
  const [logoUrl, setLogoUrl] = useState<string | null>(DEFAULT_DASHBOARD_LOGO);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchSettings = async () => {
        const { data } = await supabase.from('settings').select('value').eq('id', 'dashboard').single();
        if (data?.value?.logoUrl && data?.value?.brand === 'ghana_farmers_market') {
            setLogoUrl(data.value.logoUrl);
        } else {
            setLogoUrl(DEFAULT_DASHBOARD_LOGO);
        }
    };
    fetchSettings();

    const sub = supabase.channel('dashboard-settings')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: 'id=eq.dashboard' }, (payload) => {
             if (payload.new && (payload.new as any).value?.logoUrl && (payload.new as any).value?.brand === 'ghana_farmers_market') {
                setLogoUrl((payload.new as any).value.logoUrl);
            }
        }).subscribe();
        
    return () => { sub.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (location) {
      const cached = getCachedWeatherAlert();
      // If cached alert is fresh (under 30 minutes) or offline, use it immediately
      if (cached && (Date.now() - cached.timestamp < 30 * 60 * 1000 || !navigator.onLine)) {
        setLiveAlert(cached.alert);
        setIsAlertCached(true);
        return;
      }

      setIsFetchingAlerts(true);
      setLiveAlert('Scanning local meteorological conditions...');
      
      checkWeatherAlerts(location)
        .then((alertText) => {
          setLiveAlert(alertText);
          setIsAlertCached(false);
          if (alertText && !alertText.toLowerCase().includes('unable to')) {
            saveCachedWeatherAlert(alertText);
          }

          const lower = alertText.toLowerCase();
          if (!lower.includes('no active') && !lower.includes('no severe') && !lower.includes('unable to fetch')) {
             sendRegionalPushNotification({
                 type: 'weather',
                 title: 'Critical Weather Alert',
                 message: alertText,
                 region: userRegion,
                 severity: 'critical',
                 view: 'WEATHER'
             });
          }
        })
        .catch(() => {
          const cached = getCachedWeatherAlert();
          if (cached) {
            setLiveAlert(cached.alert);
            setIsAlertCached(true);
          } else {
            setLiveAlert('Unable to connect to global weather services.');
          }
        })
        .finally(() => setIsFetchingAlerts(false));
    } else {
        const cached = getCachedWeatherAlert();
        if (cached) {
          setLiveAlert(cached.alert);
          setIsAlertCached(true);
        } else {
          setLiveAlert('Waiting for location access to scan for alerts...');
        }
    }
  }, [location]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user || user.type !== 'admin' || !user.uid) {
        alert("Only logged-in admins can upload logos.");
        return;
    }

    if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        return;
    }

    setIsUploading(true);
    try {
        const result = await uploadUserFile(user.uid, file, 'admin-logo', '', 'Dashboard Widget Logo');
        const url = result.download_url;
        
        await supabase.from('settings').upsert({ id: 'dashboard', value: { logoUrl: url, brand: 'ghana_farmers_market' } });
        
        setLogoUrl(url);
        addNotification({ type: 'auth', title: 'Logo Updated', message: 'Dashboard banner logo updated globally.', view: 'DASHBOARD' });
    } catch (error: any) {
        console.error("Dashboard logo upload error:", error);
        alert(`Failed to upload logo: ${error.message || "Unknown error"}`);
    } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePlaceholderClick = () => {
    if (user?.type === 'admin') {
        fileInputRef.current?.click();
    }
  };

  const features = [
    { title: t.offlineGuideTitle, description: t.offlineGuideDesc, icon: <BookOpenIcon />, view: 'OFFLINE_GUIDE', color: 'emerald' },
    { title: t.weatherTitle, description: t.weatherDesc, icon: <CloudIcon />, view: 'WEATHER', color: 'blue' },
    { title: t.pricesTitle, description: t.pricesDesc, icon: <TagIcon />, view: 'PRICES', color: 'yellow' },
    { title: t.advisoryTitle, description: t.advisoryDesc, icon: <SproutIcon />, view: 'ADVISORY', color: 'green' },
    { title: t.marketTitle, description: t.marketDesc, icon: <ShoppingCartIcon />, view: 'MARKETPLACE', color: 'purple' },
    { title: t.rentalTitle, description: t.rentalDesc, icon: <TractorIcon />, view: 'RENTAL', color: 'indigo' },
    { title: t.forumTitle, description: t.forumDesc, icon: <UsersIcon />, view: 'FORUM', color: 'teal' },
    { title: t.walletTitle, description: t.walletDesc, icon: <WalletIcon />, view: 'WALLET', color: 'cyan' },
    { title: t.diagnoseTitle, description: t.diagnoseDesc, icon: <BugIcon />, view: 'DIAGNOSIS', color: 'red' },
  ];

  const colorClasses: { [key: string]: string } = {
      emerald: 'bg-emerald-100 text-emerald-800',
      blue: 'bg-blue-100 text-blue-800',
      green: 'bg-green-100 text-green-800',
      red: 'bg-red-100 text-red-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      teal: 'bg-teal-100 text-teal-800',
      purple: 'bg-purple-100 text-purple-800',
      indigo: 'bg-indigo-100 text-indigo-800',
      cyan: 'bg-cyan-100 text-cyan-800',
  }

  return (
    <div>
      <div className="flex flex-row justify-between items-center mb-6 bg-green-800 p-5 rounded-xl shadow-lg gap-4">
        <div className="text-left flex-grow">
           <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">{t.welcome}</h2>
           <p className="text-green-100">{t.welcomeSub}</p>
        </div>
        <div className="flex-shrink-0 bg-white p-1.5 rounded-full shadow-lg ml-4 border-2 border-yellow-400/80">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            <div 
                className={`h-16 w-16 sm:h-20 sm:w-20 bg-white rounded-full flex flex-col items-center justify-center text-gray-500 overflow-hidden relative ${user?.type === 'admin' ? 'cursor-pointer hover:ring-2 hover:ring-green-500' : ''}`}
                onClick={handlePlaceholderClick}
                title={user?.type === 'admin' ? "Admin: Click to upload logo" : "Ghana Farmers Market℠ Logo"}
            >
                {logoUrl ? (
                    <img src={logoUrl} alt="Ghana Farmers Market℠ Logo" referrerPolicy="no-referrer" className={`w-full h-full object-contain ${isUploading ? 'opacity-50' : ''}`} />
                ) : (
                    <>
                        <UploadIcon className="w-6 h-6 mb-1 text-gray-400" />
                        <span className="text-[10px] font-bold text-gray-400">LOGO</span>
                    </>
                )}
                {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10"><Spinner /></div>
                )}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((feature) => (
          <Card key={feature.view} onClick={() => setActiveView(feature.view as View)} className="flex flex-col items-center text-center p-6 hover:-translate-y-1">
            <div className={`p-4 rounded-full ${colorClasses[feature.color]}`}>{feature.icon}</div>
            <h3 className="mt-4 text-lg font-bold text-gray-800">{feature.title}</h3>
            <p className="mt-1 text-sm text-gray-600">{feature.description}</p>
          </Card>
        ))}
         <Card className="sm:col-span-2 lg:col-span-3 bg-red-50 border-red-200">
          <div className="flex flex-col gap-4">
              <div className="flex items-start gap-4 border-b border-red-200 pb-4">
                  <div className="p-3 bg-red-600 text-white rounded-full shadow-md animate-pulse">
                      <AlertTriangleIcon className="w-8 h-8"/>
                  </div>
                  <div className="flex-grow">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-lg font-bold text-red-800 flex items-center gap-2">
                            {t.metWatchTitle}
                            {isFetchingAlerts && <Spinner />}
                            {isAlertCached && (
                              <span className="text-[11px] font-semibold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                                <DatabaseIcon className="w-3 h-3" /> {t.cachedOffline}
                              </span>
                            )}
                        </h3>
                        <button
                          onClick={() => setIsSettingsOpen(true)}
                          className="inline-flex items-center gap-1.5 text-xs bg-white hover:bg-red-50 text-red-700 font-semibold px-2.5 py-1 rounded-lg border border-red-300 shadow-sm transition-colors"
                        >
                          <BellIcon className="w-3.5 h-3.5 text-red-600" />
                          <span>Push Alerts ({userRegion})</span>
                        </button>
                      </div>
                      <p className="text-sm text-black font-semibold mb-1">
                        {isAlertCached ? t.cachedOffline : t.metWatchSub}
                      </p>
                      <div className="bg-white/95 p-3 rounded-md border border-red-200">
                          <p className="text-black font-semibold">{liveAlert}</p>
                      </div>
                  </div>
              </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
