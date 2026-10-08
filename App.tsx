
import React, { useState, useEffect, useRef } from 'react';
import Weather from './components/Weather';
import PriceAlerts from './components/PriceAlerts';
import PestDiagnosis from './components/PestDiagnosis';
import Marketplace from './components/Marketplace';
import Dashboard from './components/Dashboard';
import CropAdvisory from './components/CropAdvisory';
import CommunityForum from './components/CommunityForum';
import Auth from './components/Auth';
import EquipmentRental from './components/EquipmentRental';
import DigitalWallet from './components/DigitalWallet';
import AdminDashboard from './components/AdminDashboard';
import Orders from './components/Orders';
import Profile from './components/Profile';
import OfflineGuide from './components/OfflineGuide';
import LanguageSwitcher from './components/LanguageSwitcher';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import NotificationArea from './components/NotificationArea';
import { RegionalPushSettingsModal } from './components/RegionalPushSettingsModal';
import { 
  HomeIcon, 
  CloudIcon, 
  TagIcon, 
  BugIcon, 
  ShoppingCartIcon, 
  SproutIcon, 
  UsersIcon, 
  TractorIcon, 
  WalletIcon, 
  ClipboardListIcon, 
  ShieldCheckIcon, 
  UploadIcon, 
  CheckCircleIcon, 
  XIcon,
  BookOpenIcon,
  WifiOffIcon,
  WifiIcon,
  BellIcon
} from './components/common/icons';
import type { View, User } from './types';
import { supabase } from './services/supabase';
import { uploadUserFile } from './services/storageService';
import { useNetworkStatus } from './hooks/useNetworkStatus';

// Moved outside component to prevent re-mounting on every render
interface NavItemProps {
  view: View;
  label: string;
  icon: React.ReactElement<{ className?: string }>;
  activeView: View;
  setActiveView: (view: View) => void;
}

const NavItem: React.FC<NavItemProps> = ({ view, label, icon, activeView, setActiveView }) => {
  const isActive = activeView === view;
  return (
    <button
      onClick={() => setActiveView(view)}
      className={`flex flex-col items-center justify-center min-w-[70px] sm:min-w-[80px] py-2 text-xs sm:text-sm transition-all duration-300 rounded-lg flex-shrink-0 ${
        isActive ? 'text-green-800 font-bold bg-green-100 scale-105' : 'text-gray-600 hover:text-green-800 hover:bg-gray-50'
      }`}
      aria-label={`Go to ${label}`}
      aria-current={isActive ? 'page' : undefined}
    >
      {React.cloneElement(icon, { className: 'w-5 h-5 sm:w-6 sm:h-6 mb-1' })}
      <span>{label}</span>
    </button>
  );
}

const AppContent: React.FC = () => {
  const [activeView, setActiveView] = useState<View>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const itemParam = params.get('item');
        const viewParam = params.get('view');
        if (itemParam || viewParam === 'MARKETPLACE') {
          return 'MARKETPLACE';
        }
        if (viewParam && ['DASHBOARD', 'WEATHER', 'PRICES', 'ADVISORY', 'MARKETPLACE', 'RENTAL', 'FORUM', 'WALLET', 'DIAGNOSIS', 'ADMIN', 'OFFLINE_GUIDE'].includes(viewParam)) {
          return viewParam as View;
        }
      }
    } catch (e) {
      console.warn("Could not parse URL query parameters:", e);
    }
    return 'DASHBOARD';
  });
  const [user, setUser] = useState<User | null>(null);
  const { isOnline, showNotice, dismissNotice } = useNetworkStatus();
  const { t } = useLanguage();
  const { setIsSettingsOpen, alertHistory, pushPermission, userRegion } = useNotifications();

  // Listen for native push notification click navigation
  useEffect(() => {
    const handlePushNavigate = (e: any) => {
      if (e.detail?.view) {
        setActiveView(e.detail.view);
      }
    };
    window.addEventListener('agro-navigate-view', handlePushNavigate);
    return () => window.removeEventListener('agro-navigate-view', handlePushNavigate);
  }, []);
  
  // App Logo State
  const DEFAULT_APP_LOGO = '/src/assets/images/ghana_farmers_market_logo_1791426087479.jpg';
  const [logoUrl, setLogoUrl] = useState<string | null>(DEFAULT_APP_LOGO);
  
  // Pending Upload State
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Listen for global app settings (Header Logo)
  useEffect(() => {
    const fetchSettings = async () => {
        const { data } = await supabase
            .from('settings')
            .select('value')
            .eq('id', 'app')
            .single();
        
        if (data && data.value && data.value.logo_url && data.value.brand === 'ghana_farmers_market') {
            setLogoUrl(data.value.logo_url);
        } else {
            setLogoUrl(DEFAULT_APP_LOGO);
        }
    };
    
    fetchSettings();

    const subscription = supabase
        .channel('settings-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: 'id=eq.app' }, (payload) => {
            if (payload.new && (payload.new as any).value?.logo_url && (payload.new as any).value?.brand === 'ghana_farmers_market') {
                setLogoUrl((payload.new as any).value.logo_url);
            }
        })
        .subscribe();

    return () => { subscription.unsubscribe(); };
  }, []);

  // Listen for Supabase Auth state changes
  useEffect(() => {
    const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        handleSession(session);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (_event === 'PASSWORD_RECOVERY') {
            // Handle password recovery specific logic if needed
        }
        handleSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSession = async (session: any) => {
      if (session?.user) {
          // 1. Try to get existing profile
          const { data: userData, error } = await supabase
              .from('users')
              .select('*')
              .eq('uid', session.user.id)
              .single();

          if (userData) {
              setUser(userData as User);
          } else {
              // 2. Profile missing (First login after email confirm?), create it from metadata
              const meta = session.user.user_metadata || {};
              const type = meta.user_type || (session.user.email?.toLowerCase().includes('admin') ? 'admin' : 'buyer');
              
              const newUser: User = {
                  uid: session.user.id,
                  name: meta.full_name || 'User',
                  email: session.user.email || '',
                  phone: meta.phone || '',
                  type: type,
                  photo_url: meta.avatar_url || ''
              };
              
              // Use upsert to prevent duplicate key errors if the row was created in parallel
              const { error: insertError } = await supabase.from('users').upsert([newUser]);
              
              if (!insertError) {
                  setUser(newUser);
              } else {
                  console.error("Failed to create user profile:", JSON.stringify(insertError));
                  // Fallback to local state so app still works
                  setUser(newUser);
              }
          }
      } else {
          setUser(null);
      }
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    if (loggedInUser.type === 'admin') {
        setActiveView('ADMIN');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setActiveView('DASHBOARD');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user?.type === 'admin' && user.uid) {
      if (!file.type.startsWith('image/')) {
         alert('Please upload a valid image file (PNG, JPG, WebP, or SVG).');
         return;
      }
      
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setPendingFile(file);
    }
  };

  const handleSaveLogo = async () => {
    if (!pendingFile) return;
    if (!user?.uid) {
        alert("You must be logged in as an Admin to upload.");
        return;
    }
    
    setIsUploadingLogo(true);
    try {
        const uploadedFile = await uploadUserFile(
          user.uid, 
          pendingFile, 
          'admin-logo', 
          '', 
          'App Header Logo Upload'
        );
        
        const newLogoUrl = uploadedFile.download_url;
        
        // Save to 'settings' table
        await supabase
            .from('settings')
            .upsert({ id: 'app', value: { logo_url: newLogoUrl, brand: 'ghana_farmers_market' } });
        
        setLogoUrl(newLogoUrl);
        setPendingFile(null);
        setPreviewUrl(null);
        alert("Header logo updated globally!");
    } catch (err: any) {
        console.error("Logo upload failed:", err);
        alert(`Failed to upload logo: ${err.message}`);
    } finally {
        setIsUploadingLogo(false);
    }
  };

  const handleCancelLogo = () => {
      setPendingFile(null);
      setPreviewUrl(null);
      if (logoInputRef.current) {
          logoInputRef.current.value = '';
      }
  };

  const renderView = () => {
    switch (activeView) {
      case 'WEATHER':
        return <Weather />;
      case 'PRICES':
        return <PriceAlerts />;
      case 'DIAGNOSIS':
        return <PestDiagnosis user={user} />;
      case 'MARKETPLACE':
        return (
          <Marketplace 
            user={user} 
            setActiveView={setActiveView} 
            initialItemId={typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('item') : null} 
          />
        );
      case 'ADVISORY':
        return <CropAdvisory />;
      case 'FORUM':
        return <CommunityForum user={user} />;
      case 'RENTAL':
        return <EquipmentRental user={user} />;
      case 'WALLET':
        return <DigitalWallet user={user} />;
      case 'ORDERS':
        return <Orders user={user} setActiveView={setActiveView} />;
      case 'ADMIN':
        return <AdminDashboard user={user} onLogin={handleLogin} />;
      case 'PROFILE':
        return <Profile user={user} setUser={setUser} onLogout={handleLogout} setActiveView={setActiveView} />;
      case 'OFFLINE_GUIDE':
        return <OfflineGuide setActiveView={setActiveView} />;
      case 'DASHBOARD':
      default:
        return <Dashboard setActiveView={setActiveView} user={user} />;
    }
  };

  const currentDisplayLogo = previewUrl || logoUrl;

  return (
    <div className="min-h-screen bg-gray-900 font-sans text-gray-200 flex flex-col">
       {/* Main Container */}
      <main className="flex-grow p-4 md:p-6 relative">
             {/* Network Connectivity Banner */}
             {!isOnline && (
               <div className="max-w-5xl mx-auto bg-amber-500 text-slate-950 px-4 py-2 text-xs sm:text-sm font-bold flex items-center justify-between rounded-t-xl shadow-md border-b border-amber-600">
                 <div className="flex items-center gap-2">
                   <WifiOffIcon className="w-5 h-5 text-slate-950 flex-shrink-0 animate-pulse" />
                   <span>{t.offlineBanner}</span>
                 </div>
                 <button
                   onClick={() => setActiveView('OFFLINE_GUIDE')}
                   className="ml-2 bg-slate-950 text-amber-400 hover:bg-slate-800 text-xs font-extrabold px-3 py-1 rounded shadow-sm whitespace-nowrap transition-colors"
                 >
                   {t.openOfflineHub}
                 </button>
               </div>
             )}

             {isOnline && showNotice && (
               <div className="max-w-5xl mx-auto bg-green-700 text-white px-4 py-1.5 text-xs font-semibold flex items-center justify-between rounded-t-xl shadow-md border-b border-green-800">
                 <div className="flex items-center gap-2">
                   <WifiIcon className="w-4 h-4 text-white" />
                   <span>{t.onlineRestored}</span>
                 </div>
                 <button onClick={dismissNotice} className="text-white hover:text-green-200">
                   <XIcon className="w-4 h-4" />
                 </button>
               </div>
             )}

             {/* Floating Header Banner */}
             <div className={`max-w-5xl mx-auto bg-green-800 text-white shadow-2xl ${!isOnline || (isOnline && showNotice) ? '' : 'rounded-t-xl'} p-4 sm:px-6 flex justify-between items-center relative z-30 min-h-[88px]`}>
                 {/* Title Section */}
                 <div onClick={() => setActiveView('DASHBOARD')} className="cursor-pointer hover:opacity-90 transition-opacity z-10 relative">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Ghana Farmers Market℠</h1>
                  <p className="text-xs sm:text-sm text-green-100">{t.tagline}</p>
                </div>

                {/* Central Logo */}
                <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-0 flex flex-col items-center">
                    <input 
                        type="file" 
                        ref={logoInputRef} 
                        onChange={handleFileSelect} 
                        accept="image/*" 
                        className="hidden" 
                    />
                    <div 
                        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center border-2 border-yellow-400/80 bg-white overflow-hidden shadow-lg transition-all ${user?.type === 'admin' ? 'cursor-pointer hover:border-green-300 hover:scale-105' : ''}`}
                        onClick={() => user?.type === 'admin' && !isUploadingLogo && !pendingFile && logoInputRef.current?.click()}
                        title={user?.type === 'admin' ? "Admin: Click to upload new logo" : "Ghana Farmers Market℠ Logo"}
                    >
                        {currentDisplayLogo ? (
                            <img src={currentDisplayLogo} alt="Ghana Farmers Market℠ Logo" referrerPolicy="no-referrer" className={`w-full h-full object-contain p-0.5 ${isUploadingLogo ? 'opacity-50' : ''}`} />
                        ) : (
                            <div className="flex flex-col items-center justify-center text-green-200/40">
                                {user?.type === 'admin' ? (
                                    <>
                                        <UploadIcon className="w-5 h-5 mb-1" />
                                        <span className="text-[8px] font-bold">{isUploadingLogo ? '...' : 'LOGO'}</span>
                                    </>
                                ) : (
                                    <SproutIcon className="w-8 h-8 opacity-50" />
                                )}
                            </div>
                        )}
                        {isUploadingLogo && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                            </div>
                        )}
                    </div>

                    {/* Save/Cancel Controls for Admin */}
                    {pendingFile && !isUploadingLogo && (
                        <div className="absolute -bottom-8 flex gap-2 animate-fade-in">
                            <button 
                                onClick={handleSaveLogo}
                                className="p-1 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-500 hover:scale-110 transition-all"
                                title="Save Logo"
                            >
                                <CheckCircleIcon className="w-4 h-4" />
                            </button>
                             <button 
                                onClick={handleCancelLogo}
                                className="p-1 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-500 hover:scale-110 transition-all"
                                title="Cancel Upload"
                            >
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Notifications, Language & Auth Section */}
                <div className="z-10 relative flex items-center gap-2 sm:gap-3">
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="relative p-2 bg-green-900/70 hover:bg-green-700/80 text-white rounded-lg border border-green-600/50 shadow-sm transition-all flex items-center justify-center"
                    title={`Regional Push Alerts (${userRegion}) - ${pushPermission === 'granted' ? 'Active' : 'Configure'}`}
                    aria-label="Notification and Push Alert Settings"
                  >
                    <BellIcon className="w-5 h-5 text-green-100 hover:text-white" />
                    {alertHistory.length > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600 text-[9px] font-bold text-white items-center justify-center">
                          {alertHistory.length > 9 ? '9+' : alertHistory.length}
                        </span>
                      </span>
                    )}
                  </button>
                  <LanguageSwitcher />
                  <Auth user={user} onLogin={handleLogin} onLogout={handleLogout} setActiveView={setActiveView} />
                </div>
             </div>

             {/* Navigation Bar */}
             <nav className="max-w-5xl mx-auto bg-white border-b border-x border-gray-200 shadow-lg rounded-b-xl mb-8 relative z-20">
               <div className="flex justify-start sm:justify-around p-2 space-x-1 overflow-x-auto no-scrollbar">
                 <NavItem view="DASHBOARD" label={t.navHome} icon={<HomeIcon />} activeView={activeView} setActiveView={setActiveView} />
                 <NavItem view="WEATHER" label={t.navWeather} icon={<CloudIcon />} activeView={activeView} setActiveView={setActiveView} />
                 <NavItem view="PRICES" label={t.navPrices} icon={<TagIcon />} activeView={activeView} setActiveView={setActiveView} />
                 <NavItem view="OFFLINE_GUIDE" label={t.navOffline} icon={<BookOpenIcon />} activeView={activeView} setActiveView={setActiveView} />
                 <NavItem view="ADVISORY" label={t.navAdvisory} icon={<SproutIcon />} activeView={activeView} setActiveView={setActiveView} />
                 <NavItem view="MARKETPLACE" label={t.navMarket} icon={<ShoppingCartIcon />} activeView={activeView} setActiveView={setActiveView} />
                 <NavItem view="RENTAL" label={t.navRental} icon={<TractorIcon />} activeView={activeView} setActiveView={setActiveView} />
                 <NavItem view="WALLET" label={t.navWallet} icon={<WalletIcon />} activeView={activeView} setActiveView={setActiveView} />
                 <NavItem view="FORUM" label={t.navForum} icon={<UsersIcon />} activeView={activeView} setActiveView={setActiveView} />
                 <NavItem view="DIAGNOSIS" label={t.navDiagnose} icon={<BugIcon />} activeView={activeView} setActiveView={setActiveView} />
                 <NavItem view="ADMIN" label={t.navAdmin} icon={<ShieldCheckIcon />} activeView={activeView} setActiveView={setActiveView} />
               </div>
             </nav>

          <div className="max-w-5xl mx-auto">
            {renderView()}
          </div>
        </main>
        
        <NotificationArea setActiveView={setActiveView} />
        <RegionalPushSettingsModal setActiveView={setActiveView} />
      </div>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </LanguageProvider>
  );
};

export default App;
