import { useState, useEffect } from "react";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Simulate sync when coming back online
      setSyncing(true);
      setTimeout(() => {
        setSyncing(false);
      }, 2000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncing(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline && !syncing) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-3 text-white text-center text-sm ${
        isOnline ? "bg-blue-600" : "bg-amber-600"
      }`}
    >
      <div className="flex items-center justify-center gap-2">
        {syncing ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Syncing data...</span>
          </>
        ) : isOnline ? (
          <>
            <Wifi className="w-4 h-4" />
            <span>Back online - Data synced successfully</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span>Offline Mode – Data will sync when online</span>
          </>
        )}
      </div>
    </div>
  );
}
