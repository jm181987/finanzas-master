import { useState, useEffect, useCallback } from "react";

let deferredPrompt: any = null;

const isIOS = () => {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
};

const isInStandaloneMode = () => {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  );
};

export const usePWAInstall = () => {
  const [canInstall, setCanInstall] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) return;

    // Android / desktop: listen for native prompt
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
      setCanInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS: show manual instructions
    if (isIOS() && !isInStandaloneMode()) {
      setCanInstall(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = useCallback(async () => {
    if (isIOS()) {
      setShowIOSPrompt(true);
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") {
      setCanInstall(false);
    }
    deferredPrompt = null;
  }, []);

  const dismissIOSPrompt = useCallback(() => {
    setShowIOSPrompt(false);
  }, []);

  return { canInstall, install, showIOSPrompt, dismissIOSPrompt };
};
