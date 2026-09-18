'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Bell, BellOff, QrCode, ShieldCheck, CheckCircle2, Car, Download, ExternalLink, Smartphone, Phone, PhoneOff, Mic, MicOff, LogOut, Lock, Mail, User, Plus, MessageSquare } from 'lucide-react';
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

  // Auth & Registration Form States
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [carNickname, setCarNickname] = useState<string>('My Vehicle');
  const [submittingAuth, setSubmittingAuth] = useState<boolean>(false);

  // Active Registered Car for the Logged In User
  const [activeCar, setActiveCar] = useState<{ id: string; nickname: string } | null>(null);

  const qrContainerRef = useRef<HTMLDivElement>(null);

  // Active Realtime WebRTC listener on Owner Dashboard for logged-in user's car
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
    carId: activeCar?.id || '',
    role: 'owner',
    carNickname: activeCar?.nickname || 'Vehicle'
  });

  // Fetch or Auto-Create Owner Car Helper
  const syncOwnerCar = async (ownerId: string, preferredNickname?: string) => {
    try {
      // 1. Check existing cars for this owner
      const { data: cars, error } = await supabase
        .from('cars')
        .select('id, nickname')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });

      if (!error && cars && cars.length > 0) {
        setActiveCar({ id: cars[0].id, nickname: cars[0].nickname });
        return cars[0];
      }

      // 2. If no car exists, create a unique car for this owner
      const newNickname = preferredNickname || 'My Vehicle';
      const { data: newCar, error: createError } = await supabase
        .from('cars')
        .insert({
          owner_id: ownerId,
          nickname: newNickname
        })
        .select()
        .single();

      if (!createError && newCar) {
        setActiveCar({ id: newCar.id, nickname: newCar.nickname });
        return newCar;
      }
    } catch (e) {
      console.warn('Error syncing owner car:', e);
    }
    return null;
  };

  // Check Auth & SW registration status & set origin
  useEffect(() => {
    setOrigin(window.location.origin);

    supabase.auth.getUser().then(({ data }) => {
      const currentUser = data.user;
      setUser(currentUser);
      if (currentUser) {
        syncOwnerCar(currentUser.id);
      }
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

  // Full QR URL for this specific user's car
  const qrUrl = activeCar?.id ? `${origin || 'http://localhost:3000'}/c/${activeCar.id}` : '';

  // Download QR code as PNG image
  const handleDownloadQR = () => {
    const svgElement = qrContainerRef.current?.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = 800;
      canvas.height = 500;
      if (ctx) {
        ctx.fillStyle = '#2C1812';
        ctx.fillRect(0, 0, 420, 500);

        ctx.fillStyle = '#EAE7D7';
        ctx.fillRect(420, 0, 380, 500);

        ctx.fillStyle = '#2A160F';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('C A L L  N  G O', 610, 50);

        ctx.drawImage(img, 470, 70, 280, 280);

        ctx.fillStyle = '#2A1711';
        ctx.beginPath();
        ctx.roundRect(550, 390, 120, 34, 17);
        ctx.fill();

        ctx.fillStyle = '#EAE7D7';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('callngo.app', 610, 412);

        ctx.fillStyle = '#F5F2E6';
        ctx.textAlign = 'left';

        ctx.font = 'bold 20px serif';
        ctx.fillText('Scan the QR', 60, 140);
        ctx.fillText('connect the owner', 60, 170);

        ctx.strokeStyle = '#F5F2E6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(60, 178);
        ctx.lineTo(260, 178);
        ctx.stroke();

        ctx.fillStyle = '#F9F7EF';
        ctx.beginPath();
        ctx.roundRect(60, 210, 280, 44, 22);
        ctx.fill();

        ctx.fillStyle = '#2A160F';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('📞 Call   ✉️ Message', 100, 238);

        ctx.fillStyle = '#F5F2E6';
        ctx.font = '16px serif';
        ctx.fillText('• Please move your car', 60, 300);
        ctx.fillText('• Your headlight is on', 60, 335);
        ctx.fillText('• Call in case of accident', 60, 370);
        ctx.fillText('• Your vehicle is in my way', 60, 405);
      }

      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      const filename = activeCar?.nickname ? activeCar.nickname.toLowerCase().replace(/\s+/g, '-') : 'car';
      downloadLink.download = `callngo-card-${filename}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  // Handle Registration Submit
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingAuth(true);
      setMessage(null);

      if (!email || !password || !fullName || !carNickname) {
        throw new Error('Please fill in all fields (Name, Email, Password, Vehicle Nickname)');
      }

      // 1. Supabase Sign Up
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName }
        }
      });

      if (authError || !authData.user) {
        throw new Error(authError?.message || 'Registration failed');
      }

      const newUser = authData.user;
      setUser(newUser);

      // 2. Insert Profile
      await supabase.from('profiles').upsert({
        id: newUser.id,
        full_name: fullName
      });

      // 3. Create Unique Car for User
      await syncOwnerCar(newUser.id, carNickname);

      setMessage({ type: 'success', text: `Welcome ${fullName}! Your car "${carNickname}" has been registered.` });
    } catch (err: any) {
      console.error('Registration error:', err);
      setMessage({ type: 'error', text: err.message || 'Registration failed' });
    } finally {
      setSubmittingAuth(false);
    }
  };

  // Handle Sign In Submit
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingAuth(true);
      setMessage(null);

      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError || !authData.user) {
        throw new Error(authError?.message || 'Login failed');
      }

      const currentUser = authData.user;
      setUser(currentUser);
      await syncOwnerCar(currentUser.id);
      setMessage({ type: 'success', text: 'Logged in successfully!' });
    } catch (err: any) {
      console.error('Sign in error:', err);
      setMessage({ type: 'error', text: err.message || 'Login failed' });
    } finally {
      setSubmittingAuth(false);
    }
  };

  // Demo Fast Login Handler
  const handleDemoLogin = async () => {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      const currentUser = data.user;
      setUser(currentUser);
      if (currentUser) {
        await syncOwnerCar(currentUser.id, 'Demo Swift');
      }
      setMessage({ type: 'success', text: 'Logged in as car owner' });
    }
  };

  // Log Out Handler
  const handleLogOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setActiveCar(null);
    setMessage({ type: 'success', text: 'Logged out.' });
  };

  // Enable Push Call Alerts Handler
  const handleEnableCallAlerts = async () => {
    try {
      setPushLoading(true);
      setMessage(null);

      if (!user) {
        throw new Error('You must be logged in to enable call alerts.');
      }

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

      // 5. Send PushSubscription to POST /api/push/subscribe linked to user.id
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          ownerId: user.id
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
    <main className="min-h-screen bg-[#160f0b] text-[#f4efe6] p-4 sm:p-8 flex flex-col items-center selection:bg-[#d4a254] selection:text-[#160f0b]">
      {/* Hidden Audio Element for WebRTC audio playback */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* FULL-SCREEN INCOMING / CONNECTED CALL MODAL */}
      {(callStatus === 'incoming' || callStatus === 'connecting' || callStatus === 'connected') && (
        <div className="fixed inset-0 z-50 bg-[#160f0b]/95 backdrop-blur-2xl flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-[#2b1812] border border-[#3e241b] rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center relative">
            <div className="w-20 h-20 rounded-full bg-[#1b0e09] border border-[#d4a254]/30 flex items-center justify-center mb-4 text-3xl shadow-inner">
              🚗
            </div>

            <h2 className="text-2xl font-bold text-[#f4efe6] mb-2 font-serif">
              Someone is near your {activeCar?.nickname || 'vehicle'}
            </h2>

            {callStatus === 'incoming' && (
              <div className="w-full py-6 flex flex-col items-center gap-6">
                <p className="text-sm font-semibold text-[#d4a254] animate-pulse">
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
                    className="flex-1 py-4 rounded-2xl bg-[#d4a254] hover:bg-[#c39143] text-[#160f0b] font-semibold text-base transition shadow-lg shadow-[#d4a254]/20 flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Phone className="w-5 h-5" />
                    Accept
                  </button>
                </div>
              </div>
            )}

            {callStatus === 'connecting' && (
              <div className="py-6 flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-3 border-[#d4a254] border-t-transparent rounded-full animate-spin" />
                <p className="text-[#e2dacd] text-sm">Connecting audio stream...</p>
              </div>
            )}

            {callStatus === 'connected' && (
              <div className="w-full py-4 flex flex-col items-center gap-6">
                <div className="flex flex-col items-center gap-1">
                  <span className="px-3 py-1 rounded-full bg-[#d4a254]/20 text-[#d4a254] text-xs font-semibold uppercase tracking-wider border border-[#d4a254]/30">
                    Connected
                  </span>
                  <span className="text-3xl font-mono font-bold text-[#f4efe6] mt-2">
                    {formattedDuration}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-6 w-full">
                  <button
                    onClick={toggleMute}
                    className={`w-14 h-14 rounded-full flex items-center justify-center border transition ${
                      isMuted
                        ? 'bg-amber-600/20 border-amber-500 text-amber-400'
                        : 'bg-[#1b0e09] border-[#3e241b] text-[#f4efe6] hover:bg-[#2b1812]'
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

      <div className="w-full max-w-4xl space-y-6">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#2b1812]/90 border border-[#3e241b] p-6 rounded-3xl backdrop-blur-xl shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#d4a254]/20 border border-[#d4a254]/30 flex items-center justify-center text-[#d4a254] text-xl font-bold">
              🚗
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#f4efe6] tracking-tight font-serif">CallNGo Owner Control Panel</h1>
              <p className="text-xs text-[#d8cfc4]">Private Vehicle QR Calling System</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/test"
              className="px-4 py-2 rounded-xl bg-[#1b0e09] hover:bg-[#23130d] text-xs font-semibold text-[#d4a254] border border-[#3e241b] transition flex items-center gap-2"
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

        {/* 1. OWNER REGISTRATION / AUTHENTICATION CARD */}
        <section className="bg-[#2b1812]/70 border border-[#3e241b] p-6 rounded-3xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#3e241b] pb-3">
            <h2 className="text-lg font-bold text-[#f4efe6] flex items-center gap-2 font-serif">
              <ShieldCheck className="w-5 h-5 text-[#d4a254]" />
              1. Owner Registration & Account
            </h2>

            {user && (
              <button
                onClick={handleLogOut}
                className="px-3 py-1.5 rounded-xl bg-[#1b0e09] hover:bg-[#23130d] text-[#e2dacd] text-xs font-semibold border border-[#3e241b] transition flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Log Out
              </button>
            )}
          </div>

          {user ? (
            <div className="p-4 rounded-2xl bg-[#160f0b]/80 border border-[#3e241b] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#d4a254]/20 border border-[#d4a254]/40 flex items-center justify-center text-[#d4a254] font-bold text-lg">
                  ✓
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#f4efe6]">
                    Logged in as {user.email || user.user_metadata?.full_name || 'Car Owner'}
                  </p>
                  <p className="text-xs text-[#bfaea0] mt-0.5 font-mono">
                    Owner ID: {user.id}
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#1b0e09] border border-[#d4a254]/40 text-[#d4a254] text-xs font-semibold">
                Authenticated
              </span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Tab Selector */}
              <div className="flex items-center p-1 rounded-xl bg-[#160f0b] border border-[#3e241b] max-w-xs">
                <button
                  onClick={() => setAuthMode('signup')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                    authMode === 'signup'
                      ? 'bg-[#d4a254] text-[#160f0b] shadow-md font-bold'
                      : 'text-[#bfaea0] hover:text-[#f4efe6]'
                  }`}
                >
                  Create Account
                </button>
                <button
                  onClick={() => setAuthMode('signin')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                    authMode === 'signin'
                      ? 'bg-[#d4a254] text-[#160f0b] shadow-md font-bold'
                      : 'text-[#bfaea0] hover:text-[#f4efe6]'
                  }`}
                >
                  Sign In
                </button>
              </div>

              {/* Form Body */}
              {authMode === 'signup' ? (
                <form onSubmit={handleSignUp} className="space-y-3 p-4 rounded-2xl bg-[#160f0b]/70 border border-[#3e241b]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#d8cfc4] mb-1">Full Name</label>
                      <div className="relative">
                        <User className="w-4 h-4 text-[#8f7a6b] absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="John Doe"
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#1e140f] border border-[#3e241b] text-white text-sm focus:outline-none focus:border-[#d4a254]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#d8cfc4] mb-1">Email Address</label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-[#8f7a6b] absolute left-3 top-3" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="john@example.com"
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#1e140f] border border-[#3e241b] text-white text-sm focus:outline-none focus:border-[#d4a254]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#d8cfc4] mb-1">Password</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-[#8f7a6b] absolute left-3 top-3" />
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#1e140f] border border-[#3e241b] text-white text-sm focus:outline-none focus:border-[#d4a254]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#d8cfc4] mb-1">Vehicle Nickname</label>
                      <div className="relative">
                        <Car className="w-4 h-4 text-[#8f7a6b] absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          value={carNickname}
                          onChange={(e) => setCarNickname(e.target.value)}
                          placeholder="e.g. My Blue Swift"
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#1e140f] border border-[#3e241b] text-white text-sm focus:outline-none focus:border-[#d4a254]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button
                      type="submit"
                      disabled={submittingAuth}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#d4a254] hover:bg-[#c59343] text-[#160f0b] font-bold text-sm transition shadow-lg shadow-[#d4a254]/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      {submittingAuth ? 'Creating Account...' : 'Register Account & Car'}
                    </button>

                    <button
                      type="button"
                      onClick={handleDemoLogin}
                      className="text-xs text-[#d8cfc4] hover:text-[#f4efe6] underline"
                    >
                      Or Instant Anonymous Demo Login
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSignIn} className="space-y-3 p-4 rounded-2xl bg-[#160f0b]/70 border border-[#3e241b]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#d8cfc4] mb-1">Email Address</label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-[#8f7a6b] absolute left-3 top-3" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="john@example.com"
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#1e140f] border border-[#3e241b] text-white text-sm focus:outline-none focus:border-[#d4a254]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#d8cfc4] mb-1">Password</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-[#8f7a6b] absolute left-3 top-3" />
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#1e140f] border border-[#3e241b] text-white text-sm focus:outline-none focus:border-[#d4a254]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="submit"
                      disabled={submittingAuth}
                      className="px-6 py-2.5 rounded-xl bg-[#d4a254] hover:bg-[#c59343] text-[#160f0b] font-bold text-sm transition shadow-lg shadow-[#d4a254]/20 disabled:opacity-50"
                    >
                      {submittingAuth ? 'Signing In...' : 'Sign In'}
                    </button>

                    <button
                      type="button"
                      onClick={handleDemoLogin}
                      className="text-xs text-[#d8cfc4] hover:text-[#f4efe6] underline"
                    >
                      Instant Anonymous Login
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </section>

        {/* 2. Web Push Configuration Card (Visible only when user is logged in) */}
        {user && (
          <section className="bg-[#2b1812]/70 border border-[#3e241b] p-6 rounded-3xl space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-[#f4efe6] flex items-center gap-2 font-serif">
              <Bell className="w-5 h-5 text-[#d4a254]" />
              2. Web Push Call Alerts
            </h2>

            <div className="p-4 rounded-2xl bg-[#160f0b]/70 border border-[#3e241b] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-[#f4efe6]">
                  Call Alerts Status: {pushEnabled ? 'Active' : 'Disabled'}
                </h3>
                <p className="text-xs text-[#d8cfc4] mt-1 max-w-md">
                  Subscribes this device to receive push alerts when callers scan your QR code sticker.
                </p>
              </div>

              {pushEnabled ? (
                <button
                  onClick={handleDisableCallAlerts}
                  disabled={pushLoading}
                  className="px-5 py-2.5 rounded-xl bg-[#1b0e09] hover:bg-[#23130d] border border-[#3e241b] text-[#e2dacd] font-semibold text-sm transition"
                >
                  Disable Call Alerts
                </button>
              ) : (
                <button
                  onClick={handleEnableCallAlerts}
                  disabled={pushLoading}
                  className="px-6 py-3 rounded-xl bg-[#d4a254] hover:bg-[#c59343] text-[#160f0b] font-bold text-sm transition shadow-lg shadow-[#d4a254]/20 flex items-center gap-2"
                >
                  <Bell className="w-4 h-4" />
                  {pushLoading ? 'Enabling...' : 'Enable Call Alerts'}
                </button>
              )}
            </div>
          </section>
        )}

        {/* 3. PHYSICAL PRINTABLE STICKER CARD (Strictly visible ONLY when logged in) */}
        {user && activeCar && (
          <section className="bg-[#2b1812]/70 border border-[#3e241b] p-6 rounded-3xl space-y-4 shadow-xl animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#f4efe6] flex items-center gap-2 font-serif">
                  <QrCode className="w-5 h-5 text-[#d4a254]" />
                  3. Your Unique Vehicle QR Card
                </h2>
                <p className="text-xs text-[#d8cfc4] mt-0.5">
                  Linked exclusively to your car ({activeCar.nickname}) • Car ID: <code className="text-[#d4a254] font-mono">{activeCar.id}</code>
                </p>
              </div>

              <button
                onClick={handleDownloadQR}
                className="px-4 py-2 rounded-xl bg-[#d4a254] hover:bg-[#c59343] text-[#160f0b] font-bold text-xs transition flex items-center gap-2 shadow-md shadow-[#d4a254]/20"
              >
                <Download className="w-3.5 h-3.5" />
                Download Printable Card PNG
              </button>
            </div>

            {/* PHYSICAL DUAL-PANEL CARD CONTAINER */}
            <div className="w-full rounded-3xl overflow-hidden border border-[#523326] shadow-2xl flex flex-col md:flex-row">
              
              {/* LEFT PANEL */}
              <div className="md:w-1/2 bg-[#2A1812] p-8 text-[#F5F2E6] flex flex-col items-center text-center justify-between border-b md:border-b-0 md:border-r border-[#3D231A]">
                
                {/* Car Wheel Line-Art Icon */}
                <div className="w-24 h-24 rounded-full border-2 border-[#D4A254]/40 flex items-center justify-center bg-[#1E0F0A]/60 shadow-inner mb-4">
                  <svg className="w-16 h-16 text-[#D4A254]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="9" />
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 3v6M12 15v6M3 12h6M15 12h6M5.6 5.6l4.3 4.3M14.1 14.1l4.3 4.3M5.6 18.4l4.3-4.3M14.1 9.9l4.3-4.3" />
                  </svg>
                </div>

                {/* Tagline */}
                <div className="mb-6">
                  <h3 className="text-xl sm:text-2xl font-bold font-serif tracking-wide text-[#F5F2E6]">
                    Scan the QR
                  </h3>
                  <h3 className="text-xl sm:text-2xl font-bold font-serif tracking-wide text-[#F5F2E6] underline underline-offset-4 decoration-[#D4A254]">
                    connect the owner
                  </h3>
                </div>

                {/* Call / Message Pill Badge */}
                <div className="px-6 py-2.5 rounded-full bg-[#F9F7EF] text-[#2A160F] font-bold text-sm flex items-center gap-4 shadow-md mb-6 border border-[#EBE8D8]">
                  <span className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-[#2A160F]" /> Call</span>
                  <span className="text-[#8F7A6B]">|</span>
                  <span className="flex items-center gap-1.5"><MessageSquare className="w-4 h-4 text-[#2A160F]" /> Message</span>
                </div>

                {/* Bulleted Reason List */}
                <ul className="text-left text-sm space-y-2 text-[#E2DACD] font-serif w-full max-w-xs">
                  <li className="flex items-start gap-2">
                    <span className="text-[#D4A254] font-bold">•</span>
                    <span>Please move your car</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#D4A254] font-bold">•</span>
                    <span>Your headlight is on</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#D4A254] font-bold">•</span>
                    <span>call incase of accident</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#D4A254] font-bold">•</span>
                    <span>Your vehicle is in my way</span>
                  </li>
                </ul>
              </div>

              {/* RIGHT PANEL: Light Vintage Cream Background with User-Specific QR Code */}
              <div className="md:w-1/2 bg-[#EAE7D7] p-8 text-[#2A160F] flex flex-col items-center justify-between text-center min-h-[380px]">
                
                {/* Spaced Brand Title */}
                <div className="text-2xl font-bold tracking-[0.3em] font-mono text-[#2A160F] uppercase mt-2">
                  C A L L N G O
                </div>

                {/* Center User-Specific QR Code */}
                <div
                  ref={qrContainerRef}
                  className="p-4 bg-[#EAE7D7] rounded-2xl flex items-center justify-center shadow-inner"
                >
                  <QRCodeSVG
                    value={qrUrl}
                    size={190}
                    bgColor="#EAE7D7"
                    fgColor="#2A160F"
                    level="H"
                    marginSize={1}
                  />
                </div>

                {/* Domain Footer Badge */}
                <div className="mt-2">
                  <span className="px-5 py-1.5 rounded-full bg-[#2A1711] text-[#EAE7D7] text-xs font-bold tracking-wider font-mono">
                    callngo.app
                  </span>
                </div>

              </div>

            </div>

            {/* Quick Direct Link Bar */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-[#d8cfc4]">
              <span className="flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-[#d4a254]" />
                Vehicle: <strong className="text-white">{activeCar.nickname}</strong>
              </span>

              <Link
                href={`/c/${activeCar.id}`}
                target="_blank"
                className="px-4 py-2 rounded-xl bg-[#1b0e09] hover:bg-[#23130d] text-[#d4a254] border border-[#3e241b] font-semibold transition flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Live Caller Page
              </Link>
            </div>

          </section>
        )}

      </div>
    </main>
  );
}
