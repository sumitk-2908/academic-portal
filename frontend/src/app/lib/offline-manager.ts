export const checkStorageLimit = async (): Promise<boolean> => {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      const usagePercentage = ((estimate.usage || 0) / (estimate.quota || 1)) * 100;
      // Prevent caching if we've used more than 85% of available quota
      return usagePercentage < 85; 
    } catch (e) {
      console.warn("Storage API error:", e);
    }
  }
  return true; // Fallback if API is unavailable
};

export const manageOfflinePdf = async (url: string, action: 'CACHE_PDF' | 'REMOVE_PDF'): Promise<boolean> => {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
    console.warn("Service worker not active.");
    return false;
  }

  if (action === 'CACHE_PDF') {
    const hasSpace = await checkStorageLimit();
    if (!hasSpace) {
      alert("Device storage is almost full. Cannot save PDF for offline viewing.");
      return false;
    }
  }

  return new Promise((resolve) => {
    const messageChannel = new MessageChannel();
    messageChannel.port1.onmessage = (event) => {
      resolve(event.data.success);
    };

    navigator.serviceWorker.controller!.postMessage(
      { type: action, url },
      [messageChannel.port2]
    );
  });
};