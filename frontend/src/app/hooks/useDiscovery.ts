import { useState, useEffect } from 'react';

type DiscoveryFeature = 'command_palette' | 'upload_button' | 'bookmark_button';

const STORAGE_KEY = 'portal_discovery_state';

interface DiscoveryState {
  [key: string]: boolean;
}

export function useDiscovery(featureKey: DiscoveryFeature) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const state: DiscoveryState = stored ? JSON.parse(stored) : {};
      
      // If the feature hasn't been dismissed, it should be visible
      if (!state[featureKey]) {
        setIsVisible(true);
      }
    } catch (e) {
      console.error('Failed to parse discovery state from localStorage', e);
      setIsVisible(true);
    }
  }, [featureKey]);

  const dismiss = () => {
    setIsVisible(false);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const state: DiscoveryState = stored ? JSON.parse(stored) : {};
      state[featureKey] = true;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save discovery state to localStorage', e);
    }
  };

  return { isVisible, dismiss };
}
