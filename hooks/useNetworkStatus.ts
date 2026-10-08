import { useState, useEffect } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
  lastOnlineChange: Date;
  dismissNotice: () => void;
  showNotice: boolean;
}

export const useNetworkStatus = (): NetworkStatus => {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [lastOnlineChange, setLastOnlineChange] = useState<Date>(new Date());
  const [showNotice, setShowNotice] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastOnlineChange(new Date());
      // Show "back online" confirmation briefly
      setShowNotice(true);
      setTimeout(() => setShowNotice(false), 5000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      setLastOnlineChange(new Date());
      setShowNotice(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check: if already offline on load
    if (!navigator.onLine) {
      setIsOnline(false);
      setWasOffline(true);
      setShowNotice(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const dismissNotice = () => setShowNotice(false);

  return {
    isOnline,
    wasOffline,
    lastOnlineChange,
    dismissNotice,
    showNotice
  };
};
