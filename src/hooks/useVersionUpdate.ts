import { useState, useEffect, useCallback } from 'react';

export interface VersionInfo {
  version: string;
  releaseDate: string;
  changelog: string[];
}

const TWO_HOURS_MS = 2 * 60 * 60 * 1000; // 7,200,000 ms (2 hours)
const INSTALLED_VERSION_KEY = 'contrato-claro-installed-version';
const LAST_CHECK_KEY = 'contrato-claro-last-version-check';

export function useVersionUpdate() {
  const [localVersion, setLocalVersion] = useState(() => {
    return localStorage.getItem(INSTALLED_VERSION_KEY) || 'v1.2.9';
  });
  const [latestVersionInfo, setLatestVersionInfo] = useState<VersionInfo | null>(null);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [checking, setChecking] = useState(false);
  const [upToDateNotice, setUpToDateNotice] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(() => {
    const saved = localStorage.getItem(LAST_CHECK_KEY);
    return saved ? new Date(Number(saved)) : null;
  });

  const checkVersion = useCallback(async (isManual: boolean = false) => {
    if (checking) return;

    const now = Date.now();
    const savedLastCheck = localStorage.getItem(LAST_CHECK_KEY);
    const lastCheckTime = savedLastCheck ? Number(savedLastCheck) : 0;

    // For automatic checks, verify if 2 hours have elapsed since the last check
    if (!isManual && lastCheckTime > 0 && (now - lastCheckTime) < TWO_HOURS_MS) {
      return;
    }

    setChecking(true);
    setUpToDateNotice(false);

    try {
      // Fetch version.json from server with cache-busting parameter
      const response = await fetch('/version.json?t=' + now, {
        cache: 'no-store'
      });

      if (response.ok) {
        const data: VersionInfo = await response.json();
        setLatestVersionInfo(data);
        
        localStorage.setItem(LAST_CHECK_KEY, now.toString());
        setLastChecked(new Date(now));

        // Check if version in repository differs from client version
        if (data.version !== localVersion) {
          setHasUpdate(true);
          setUpToDateNotice(false);
        } else {
          setHasUpdate(false);
          if (isManual) {
            setUpToDateNotice(true);
          }
        }
      }
    } catch (error) {
      console.error('[Version Checker] Error fetching version.json:', error);
    } finally {
      setChecking(false);
    }
  }, [checking, localVersion]);

  useEffect(() => {
    // Initial check on mount (respects the 2-hour window)
    checkVersion(false);

    // Periodically check every 2 hours
    const interval = setInterval(() => {
      checkVersion(false);
    }, TWO_HOURS_MS);

    // Check on tab focus if 2 hours have passed
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkVersion]);

  const applyUpdate = () => {
    if (!latestVersionInfo) return;
    
    localStorage.setItem(INSTALLED_VERSION_KEY, latestVersionInfo.version);
    setLocalVersion(latestVersionInfo.version);
    setHasUpdate(false);
    setUpToDateNotice(false);
    
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  const skipUpdate = () => {
    setHasUpdate(false);
  };

  const dismissUpToDateNotice = () => {
    setUpToDateNotice(false);
  };

  return {
    localVersion,
    latestVersionInfo,
    hasUpdate,
    checking,
    upToDateNotice,
    lastChecked,
    checkVersion,
    applyUpdate,
    skipUpdate,
    dismissUpToDateNotice
  };
}

