'use client';

import { useEffect, useState } from 'react';

export function IOSInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState<boolean>(false);

  useEffect(() => {
    // Check if user agent is iOS Safari
    const ua = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);
    
    // Check if running in standalone mode (already installed to home screen)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isIOS && isSafari && !isStandalone) {
      setShowPrompt(true);
    }
  }, []);

  if (!showPrompt) return null;

  return (
    <div className="bg-amber-900/40 border border-amber-500/50 rounded-xl p-4 my-4 text-amber-200 text-sm backdrop-blur-md">
      <div className="flex items-start gap-3">
        <div className="text-xl">📲</div>
        <div>
          <h4 className="font-semibold text-amber-100">iOS Safari User Notice</h4>
          <p className="mt-1">
            Install CallNGo using <span className="font-semibold text-white">Share → Add to Home Screen</span> to enable call alerts.
          </p>
        </div>
      </div>
    </div>
  );
}
