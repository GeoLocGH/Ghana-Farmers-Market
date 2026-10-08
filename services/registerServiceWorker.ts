// Service Worker registration helper

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker) {
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('[SW] New content is available; please refresh.');
              } else {
                console.log('[SW] Content is cached for offline use.');
              }
            }
          };
        }
      };

      console.log('[SW] Registered successfully with scope:', registration.scope);
      return registration;
    } catch (error) {
      console.warn('[SW] Registration failed:', error);
      return null;
    }
  }
  return null;
};
