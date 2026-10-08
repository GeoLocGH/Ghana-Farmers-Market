import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import type { AppNotification, GhanaRegion, NotificationType, RegionalAlert, UserNotificationPreferences, View } from '../types';
import { supabase } from '../services/supabase';

export interface RegionalPushParams {
  type: NotificationType;
  title: string;
  message: string;
  region?: string;
  view?: View;
  severity?: 'info' | 'warning' | 'critical';
  forceBrowserPush?: boolean;
}

export interface NotificationContextType {
  notifications: AppNotification[];
  alertHistory: AppNotification[];
  addNotification: (notification: Omit<AppNotification, 'id'>) => void;
  removeNotification: (id: number) => void;
  clearAllNotifications: () => void;
  clearAlertHistory: () => void;
  
  // Push Notification & Regional Alerts
  pushPermission: NotificationPermission | 'unsupported';
  isPushSupported: boolean;
  requestPushPermission: () => Promise<NotificationPermission | 'unsupported'>;
  
  userRegion: string;
  setUserRegion: (region: string) => void;
  
  preferences: UserNotificationPreferences;
  updatePreferences: (partial: Partial<UserNotificationPreferences>) => Promise<void>;
  
  sendRegionalPushNotification: (params: RegionalPushParams) => void;
  broadcastRegionalAlertToSupabase: (alert: Omit<RegionalAlert, 'id' | 'created_at'>) => Promise<boolean>;
  
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const PREFS_STORAGE_KEY = 'agro_user_push_preferences';
const HISTORY_STORAGE_KEY = 'agro_regional_alert_history';
const REGION_STORAGE_KEY = 'agro_user_selected_region';

const DEFAULT_PREFERENCES: UserNotificationPreferences = {
  region: 'Greater Accra',
  push_enabled: true,
  weather_alerts_enabled: true,
  price_alerts_enabled: true,
  price_threshold_pct: 15,
  sound_enabled: true,
};

// Subtle Web Audio alert chime for critical/warning alerts
const playAlertChime = (severity: 'info' | 'warning' | 'critical' = 'info') => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (severity === 'critical') {
      // Urgent high double-beep
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.1); // A5
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else {
      // Pleasant soft chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.setValueAtTime(659.25, now + 0.12); // E5
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch (e) {
    // AudioContext may be blocked before first user interaction
  }
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 1. Initial State from LocalStorage
  const [userRegion, setUserRegionState] = useState<string>(() => {
    return localStorage.getItem(REGION_STORAGE_KEY) || 'Greater Accra';
  });

  const [preferences, setPreferencesState] = useState<UserNotificationPreferences>(() => {
    try {
      const saved = localStorage.getItem(PREFS_STORAGE_KEY);
      return saved ? { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) } : DEFAULT_PREFERENCES;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  });

  const [alertHistory, setAlertHistory] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Browser Push Permission State
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
  const isPushSupported = typeof window !== 'undefined' && 'Notification' in window;

  useEffect(() => {
    if (isPushSupported) {
      setPushPermission(Notification.permission);
    }
  }, [isPushSupported]);

  // Request native browser push permission
  const requestPushPermission = useCallback(async (): Promise<NotificationPermission | 'unsupported'> => {
    if (!isPushSupported) {
      setPushPermission('unsupported');
      return 'unsupported';
    }

    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      
      if (permission === 'granted') {
        // Send confirmation test push
        try {
          new Notification('Ghana Farmers Market℠: Alerts Activated', {
            body: `You are subscribed to extreme weather & price alerts for: ${userRegion}.`,
            icon: '/src/assets/images/ghana_farmers_market_logo_1791426087479.jpg',
            tag: 'welcome-push'
          });
        } catch {
          // Fallback if Notification constructor fails in strict mobile mode
        }
      }
      return permission;
    } catch (e) {
      console.warn('Failed to request notification permission:', e);
      return 'denied';
    }
  }, [isPushSupported, userRegion]);

  const setUserRegion = useCallback((region: string) => {
    setUserRegionState(region);
    localStorage.setItem(REGION_STORAGE_KEY, region);
    setPreferencesState(prev => {
      const updated = { ...prev, region };
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updatePreferences = useCallback(async (partial: Partial<UserNotificationPreferences>) => {
    setPreferencesState(prev => {
      const updated = { ...prev, ...partial };
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    // If Supabase user is logged in, optionally persist to Supabase
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        await supabase
          .from('user_notification_preferences')
          .upsert({
            user_id: session.user.id,
            region: partial.region || userRegion,
            push_enabled: partial.push_enabled ?? preferences.push_enabled,
            weather_alerts_enabled: partial.weather_alerts_enabled ?? preferences.weather_alerts_enabled,
            price_alerts_enabled: partial.price_alerts_enabled ?? preferences.price_alerts_enabled,
            price_threshold_pct: partial.price_threshold_pct ?? preferences.price_threshold_pct,
            sound_enabled: partial.sound_enabled ?? preferences.sound_enabled,
            updated_at: new Date().toISOString()
          });
      }
    } catch {
      // Non-critical local-first fallback
    }
  }, [preferences, userRegion]);

  const removeNotification = useCallback((id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const clearAlertHistory = useCallback(() => {
    setAlertHistory([]);
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  }, []);

  // Standard in-app alert banner
  const addNotification = useCallback((notification: Omit<AppNotification, 'id'>) => {
    const newNotification: AppNotification = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      timestamp: Date.now(),
      ...notification
    };

    setNotifications(prev => {
      const existing = prev.find(
        n => n.title === newNotification.title && n.message === newNotification.message
      );
      if (existing) return prev;
      return [...prev, newNotification];
    });

    // Append to persistent Alert History
    setAlertHistory(prev => {
      const exists = prev.some(
        a => a.title === newNotification.title && a.message === newNotification.message && Date.now() - (a.timestamp || 0) < 60000
      );
      if (exists) return prev;
      const updated = [newNotification, ...prev].slice(0, 30);
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Auto-dismiss in-app banner after 8s
    setTimeout(() => {
      removeNotification(newNotification.id);
    }, 8000);
  }, [removeNotification]);

  // Main Regional Push Notification Dispatcher
  const sendRegionalPushNotification = useCallback((params: RegionalPushParams) => {
    const { type, title, message, region, view, severity = 'info', forceBrowserPush = false } = params;

    // Check user preference toggles
    if (type === 'weather' && !preferences.weather_alerts_enabled && !forceBrowserPush) {
      return;
    }
    if (type === 'price' && !preferences.price_alerts_enabled && !forceBrowserPush) {
      return;
    }

    // Check regional relevance (match if user selected 'All Regions', alert is for 'All Regions', or regions match)
    if (region && !forceBrowserPush) {
      const cleanAlertRegion = region.toLowerCase().trim();
      const cleanUserRegion = userRegion.toLowerCase().trim();
      const isRelevant = 
        cleanUserRegion === 'all regions' ||
        cleanAlertRegion === 'all regions' ||
        cleanAlertRegion.includes(cleanUserRegion) ||
        cleanUserRegion.includes(cleanAlertRegion);

      if (!isRelevant) {
        // Discard or store silently if outside targeted user region
        return;
      }
    }

    // 1. Trigger in-app banner and history
    addNotification({
      type,
      title,
      message,
      view,
      region,
      severity,
      isPush: true
    });

    // 2. Play audio chime if sound is enabled
    if (preferences.sound_enabled) {
      playAlertChime(severity);
    }

    // 3. Trigger Browser / Native Push Notification if permitted
    if (isPushSupported && Notification.permission === 'granted' && preferences.push_enabled) {
      try {
        const nativeAlert = new Notification(`Ghana Farmers Market℠ [${region || userRegion}]`, {
          body: `${title}: ${message}`,
          icon: '/src/assets/images/ghana_farmers_market_logo_1791426087479.jpg',
          tag: `agro-push-${type}-${Date.now()}`
        });

        nativeAlert.onclick = () => {
          window.focus();
          if (view) {
            // Trigger in-app view switch if handler is attached
            window.dispatchEvent(new CustomEvent('agro-navigate-view', { detail: { view } }));
          }
          nativeAlert.close();
        };
      } catch (err) {
        console.warn('Native notification spawn failed:', err);
      }
    }
  }, [addNotification, isPushSupported, preferences, userRegion]);

  // Broadcast regional alert to Supabase
  const broadcastRegionalAlertToSupabase = useCallback(async (
    alert: Omit<RegionalAlert, 'id' | 'created_at'>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('regional_alerts')
        .insert([{
          type: alert.type,
          region: alert.region,
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          metadata: alert.metadata || {}
        }]);

      if (error) {
        console.warn('Could not broadcast alert to Supabase table (run migration script if table is pending):', error.message);
        // Still broadcast locally to this client
        sendRegionalPushNotification({
          type: alert.type as NotificationType,
          title: alert.title,
          message: alert.message,
          region: alert.region,
          severity: alert.severity,
          forceBrowserPush: true
        });
        return false;
      }

      // Also trigger immediate local notification
      sendRegionalPushNotification({
        type: alert.type as NotificationType,
        title: alert.title,
        message: alert.message,
        region: alert.region,
        severity: alert.severity,
        forceBrowserPush: true
      });
      return true;
    } catch (e) {
      console.warn('Failed to insert regional alert:', e);
      return false;
    }
  }, [sendRegionalPushNotification]);

  // 4. Supabase Realtime Subscription for incoming regional broadcasts
  useEffect(() => {
    let channel: any = null;
    try {
      channel = supabase
        .channel('public:regional_alerts')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'regional_alerts' },
          (payload) => {
            const row = payload.new as RegionalAlert;
            if (row) {
              sendRegionalPushNotification({
                type: row.type as NotificationType,
                title: row.title,
                message: row.message,
                region: row.region,
                severity: row.severity,
                view: row.type === 'weather' ? 'WEATHER' : 'PRICES'
              });
            }
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('Realtime channel subscription error:', e);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [sendRegionalPushNotification]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        alertHistory,
        addNotification,
        removeNotification,
        clearAllNotifications,
        clearAlertHistory,
        pushPermission,
        isPushSupported,
        requestPushPermission,
        userRegion,
        setUserRegion,
        preferences,
        updatePreferences,
        sendRegionalPushNotification,
        broadcastRegionalAlertToSupabase,
        isSettingsOpen,
        setIsSettingsOpen
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};