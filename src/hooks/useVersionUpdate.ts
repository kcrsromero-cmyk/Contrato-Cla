import { useState, useEffect } from 'react';

export interface VersionInfo {
  version: string;
  releaseDate: string;
  changelog: string[];
}

export function useVersionUpdate() {
  const [localVersion, setLocalVersion] = useState(() => {
    return localStorage.getItem('contrato-claro-installed-version') || 'v1.2.9';
  });
  const [latestVersionInfo, setLatestVersionInfo] = useState<VersionInfo | null>(null);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkVersion = async () => {
    if (checking) return;
    setChecking(true);
    try {
      // Fetch the version.json from the server with a cache-buster timestamp
      const response = await fetch('/version.json?t=' + Date.now(), {
        cache: 'no-store'
      });
      if (response.ok) {
        const data: VersionInfo = await response.json();
        setLatestVersionInfo(data);
        
        // Check if there is a version mismatch
        if (data.version !== localVersion) {
          setHasUpdate(true);
        } else {
          setHasUpdate(false);
        }
      }
    } catch (error) {
      console.error('[Version Checker] Error fetching version.json:', error);
    } finally {
      setChecking(false);
      setLastChecked(new Date());
    }
  };

  useEffect(() => {
    // Initial check
    checkVersion();

    // Periodically check every 5 minutes (300000 ms)
    const interval = setInterval(checkVersion, 300000);

    // Also check when the document becomes visible again (tab focus)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [localVersion]);

  const applyUpdate = () => {
    if (!latestVersionInfo) return;
    
    // Set the installed version in localStorage to match the retrieved one
    localStorage.setItem('contrato-claro-installed-version', latestVersionInfo.version);
    setLocalVersion(latestVersionInfo.version);
    setHasUpdate(false);
    
    // Smoothly reload the window to complete simulated asset update
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  const skipUpdate = () => {
    setHasUpdate(false);
  };

  return {
    localVersion,
    latestVersionInfo,
    hasUpdate,
    checking,
    lastChecked,
    checkVersion,
    applyUpdate,
    skipUpdate
  };
}
