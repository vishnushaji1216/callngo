'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Bell, BellOff, QrCode, ShieldCheck, CheckCircle2, Car, Download, ExternalLink, Smartphone, Phone, PhoneOff, Mic, MicOff } from 'lucide-react';
import { IOSInstallPrompt } from '@/components/iOSInstallPrompt';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { useWebRTCCall } from '@/hooks/useWebRTCCall';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function OwnerDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [pushEnabled, setPushEnabled] = useState<boolean>(false);
  const [pushLoading, setPushLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [origin, setOrigin] = useState<string>('');

  // Test Car details
  const [testCarId, setTestCarId] = useState<string>('c9b1a8f0-1234-5678-9abc-def012345678');
  const [testCarNickname, setTestCarNickname] = useState<string>('Blue Swift');

  const qrContainerRef = useRef<HTMLDivElement>(null);

  // Active Realtime WebRTC listener on Owner Dashboard
  const {
    status: callStatus,
    callId: activeCallId,
    isMuted,
    formattedDuration,
    remoteAudioRef,
    acceptCall,
    declineCall,
    hangUp,
    toggleMute
  } = useWebRTCCall({
    carId: testCarId,
    role: 'owner',
    carNickname: testCarNickname
  });

  // Check Auth & SW registration status & set origin
  useEffect(() => {
    setOrigin(window.location.origin);

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) {
          reg.pushManager.getSubscription().then((sub) => {
            if (sub) {
              setPushEnabled(true);
            }
          });
        }
      });
    }
  }, []);

  // Full QR URL
  const qrUrl = `${origin || 'http://localhost:3000'}/c/${testCarId}`;

  // Download QR code as PNG image
  const handleDownloadQR = () => {
    const svgElement = qrContainerRef.current?.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = 512;
      canvas.height = 512;
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 512, 512);
        ctx.drawImage(img, 32, 32, 448, 448);
      }
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `callngo-qr-${testCarNickname.toLowerCase().replace(/\s+/g, '-')}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  // Demo Login Handler
  const handleDemoLogin = async () => {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setUser(data.user);
      setMessage({ type: 'success', text: 'Logged in as car owner' });
    }
  };

  // Enable Push Call Alerts Handler
  const handleEnableCallAlerts = async () => {
    try {
      setPushLoading(true);
      setMessage(null);

      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Push notifications are not supported in this browser.');
      }

      // 1. Request Notification Permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        if (permission === 'denied') {
          throw new Error('Notification permission is blocked by your browser. Please tap the lock/tune icon next to the URL in your browser address bar → Permissions → Allow Notifications.');
        }
        throw new Error('Notification permission was not granted.');
      }

      // 2. Register Service Worker manually
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      await navigator.serviceWorker.ready;

      // 3. Obtain VAPID Public Key
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey || vapidPublicKey.includes('your-vapid')) {
        console.warn('VAPID Key not fully configured. Using mock key for demo setup.');
      }

      // 4. Subscribe with PushManager
      let applicationServerKey: BufferSource | string | undefined;
      if (vapidPublicKey && !vapidPublicKey.includes('your-vapid')) {
        applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      // 5. Send PushSubscription to POST /api/push/subscribe
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          ownerId: user?.id || null
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save push subscription');
      }

      setPushEnabled(true);
      setMessage({ type: 'success', text: 'Call alerts enabled successfully!' });
    } catch (err: any) {
      console.error('Error enabling call alerts:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to enable call alerts' });
    } finally {
      setPushLoading(false);
    }
  };

  // Disable Call Alerts Handler
  const handleDisableCallAlerts = async () => {
    try {
      setPushLoading(true);
      setMessage(null);

      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await fetch('/api/push/unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: subscription.endpoint })
          });
          await subscription.unsubscribe();
        }
      }

      setPushEnabled(false);
      setMessage({ type: 'success', text: 'Call alerts disabled.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to disable call alerts' });
    } finally {
      setPushLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 flex flex-col items-center">
      {/* Hidden Audio Element for WebRTC audio playback */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* FULL-SCREEN INCOMING / CONNECTED CALL MODAL */}
      {(callStatus === 'incoming' || callStatus === 'connecting' || callStatus === 'connected') && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center relative">
            <div className="w-20 h-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mb-4 text-3xl">
              🚗
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">
              Someone is near your {testCarNickname}
            </h2>

            {callStatus === 'incoming' && (
              <div className="w-full py-6 flex flex-col items-center gap-6">
                <p className="text-sm font-semibold text-emerald-400 animate-pulse">
                  Incoming Voice Call...
                </p>

                <div className="flex items-center justify-center gap-6 w-full">
                  <button
                    onClick={() => declineCall(activeCallId)}
                    className="flex-1 py-4 rounded-2xl bg-red-950/80 border border-red-500/40 hover:bg-red-900/50 text-red-300 font-semibold text-base transition flex items-center justify-center gap-2"
                  >
                    <PhoneOff className="w-5 h-5" />
                    Decline
                  </button>

                  <button
                    onClick={() => acceptCall(activeCallId)}
                    className="flex-1 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-base transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Phone className="w-5 h-5" />
                    Accept
                  </button>
                </div>
              </div>
            )}

            {callStatus === 'connecting' && (
              <div className="py-6 flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-300 text-sm">Connecting audio stream...</p>
              </div>
            )}

            {callStatus === 'connected' && (
              <div className="w-full py-4 flex flex-col items-center gap-6">
                <div className="flex flex-col items-center gap-1">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider border border-emerald-500/30">
                    Connected
                  </span>
                  <span className="text-3xl font-mono font-bold text-white mt-2">
                    {formattedDuration}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-6 w-full">
                  <button
                    onClick={toggleMute}
                    className={`w-14 h-14 rounded-full flex items-center justify-center border transition ${
                      isMuted
                        ? 'bg-amber-600/20 border-amber-500 text-amber-400'
                        : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </button>

                  <button
                    onClick={hangUp}
                    className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-600/30 transition active:scale-95"
                  >
                    <PhoneOff className="w-7 h-7" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="w-full max-w-3xl space-y-6">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-6 rounded-3xl backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xl font-bold">
              🚗
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">CallNGo Owner Dashboard</h1>
              <p className="text-xs text-slate-400">Minimal Proof-of-Concept Control Panel</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/test"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition flex items-center gap-2"
            >
              🔍 Run Diagnostics
            </Link>
          </div>
        </header>

        <IOSInstallPrompt />

        {/* System Messages */}
        {message && (
          <div
            className={`p-4 rounded-2xl border text-sm flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                : 'bg-red-950/80 border-red-500/40 text-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <BellOff className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* 1. Owner Authentication Card */}
        <section className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            1. Owner Authentication
          </h2>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div>
              <p className="text-sm font-medium text-slate-200">
                {user ? `Logged in as Owner (${user.id.slice(0, 8)}...)` : 'Not logged in'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Supabase Auth session for receiving call push alerts.
              </p>
            </div>

            {!user ? (
              <button
                onClick={handleDemoLogin}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition shadow-lg shadow-blue-600/20"
              >
                Log In (Demo)
              </button>
            ) : (
              <span className="px-3 py-1 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-400 text-xs font-semibold">
                Authenticated
              </span>
            )}
          </div>
        </section>

        {/* 2. Web Push Configuration Card */}
        <section className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-400" />
            2. Web Push Call Alerts
          </h2>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">
                Call Alerts Status: {pushEnabled ? 'Active' : 'Disabled'}
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md">
                Subscribes this browser/device to receive call notifications when callers scan your QR code.
              </p>
            </div>

            {pushEnabled ? (
              <button
                onClick={handleDisableCallAlerts}
                disabled={pushLoading}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold text-sm transition"
              >
                Disable Call Alerts
              </button>
            ) : (
              <button
                onClick={handleEnableCallAlerts}
                disabled={pushLoading}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm transition shadow-lg shadow-blue-600/25 flex items-center gap-2"
              >
                <Bell className="w-4 h-4" />
                {pushLoading ? 'Enabling...' : 'Enable Call Alerts'}
              </button>
            )}
          </div>
        </section>

        {/* 3. Interactive QR Code & Car Public Link Card */}
        <section className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <QrCode className="w-5 h-5 text-indigo-400" />
            3. Vehicle QR Code & Public Link
          </h2>

          <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col md:flex-row items-center gap-6">
            
            {/* Visual QR Code Display */}
            <div className="flex flex-col items-center gap-3">
              <div
                ref={qrContainerRef}
                className="p-4 bg-white rounded-2xl shadow-xl border border-slate-200 flex items-center justify-center"
              >
                <QRCodeSVG
                  value={qrUrl}
                  size={160}
                  bgColor="#FFFFFF"
                  fgColor="#0F172A"
                  level="H"
                  marginSize={1}
                />
              </div>

              <button
                onClick={handleDownloadQR}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                Download QR Code Image
              </button>
            </div>

            {/* QR Info & Scan Guidance */}
            <div className="flex-1 space-y-3 text-center md:text-left">
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Test Vehicle</span>
                <h3 className="text-2xl font-bold text-white">{testCarNickname}</h3>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-1">
                <p className="flex items-center justify-center md:justify-start gap-1.5 font-medium text-slate-200">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  Scan with your mobile camera phone to call!
                </p>
                <p className="text-slate-400">
                  Scan the QR code above using your phone's camera app to test the caller experience live.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
                <Link
                  href={`/c/${testCarId}`}
                  target="_blank"
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Caller Page Directly
                </Link>

                <div className="text-xs text-slate-400 font-mono bg-slate-900 px-3 py-2 rounded-lg border border-slate-800">
                  /c/{testCarId.slice(0, 8)}...
                </div>
              </div>
            </div>

          </div>
        </section>

      </div>
    </main>
  );
}
