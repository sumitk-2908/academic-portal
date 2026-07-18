import { useState, useEffect } from 'react';

type DiscoveryFeature = 'command_palette' | 'upload_button' | 'bookmark_button';

const STORAGE_KEY = 'portal_discovery_state';

interface DiscoveryState {
  [key: string]: boolean;
}

export function useDiscovery(featureKey: DiscoveryFeature) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkState = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const state: DiscoveryState = stored ? JSON.parse(stored) : {};
        
        if (featureKey === 'command_palette') {
          setIsVisible(!state['command_palette']);
        } else if (featureKey === 'upload_button') {
          setIsVisible(!!state['command_palette'] && !state['upload_button']);
        } else if (featureKey === 'bookmark_button') {
          setIsVisible(!!state['upload_button'] && !state['bookmark_button']);
        }
      } catch (e) {
        console.error('Failed to parse discovery state from localStorage', e);
        if (featureKey === 'command_palette') {
          setIsVisible(true);
        }
      }
    };
    
    checkState();
    
    window.addEventListener('discovery_state_changed', checkState);
    return () => window.removeEventListener('discovery_state_changed', checkState);
  }, [featureKey]);

  const dismiss = () => {
    setIsVisible(false);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const state: DiscoveryState = stored ? JSON.parse(stored) : {};
      state[featureKey] = true;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      window.dispatchEvent(new Event('discovery_state_changed'));
    } catch (e) {
      console.error('Failed to save discovery state to localStorage', e);
    }
  };

  return { isVisible, dismiss };
}
