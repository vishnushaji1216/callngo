'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { ShieldCheck, User, Mail, Phone, PhoneCall, Plus, Car, Trash2, Edit2, Download, ExternalLink, Bell, CheckCircle2, BellOff, LogOut, Copy, Check, HeartPulse, AlertCircle, Save, Mic, MicOff, PhoneOff, Hash, Unlink, QrCode } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { useWebRTCCall } from '@/hooks/useWebRTCCall';
import { IOSInstallPrompt } from '@/components/iOSInstallPrompt';

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

export interface UserProfile {
  id: string;
  full_name?: string;
  phone_number?: string;
  emergency_contact?: string;
  blood_group?: string;
  health_issues?: string;
  medications?: string;
  allergies?: string;
}

export interface Vehicle {
  id: string;
  nickname: string;
  model_number?: string;
  plate_number?: string;
}

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [origin, setOrigin] = useState<string>('');

  // Emergency Profile Form State
  const [emergencyContact, setEmergencyContact] = useState<string>('');
  const [bloodGroup, setBloodGroup] = useState<string>('O+');
  const [healthIssues, setHealthIssues] = useState<string>('');
  const [medications, setMedications] = useState<string>('');
  const [allergies, setAllergies] = useState<string>('');
  const [savingProfile, setSavingProfile] = useState<boolean>(false);

  // Add/Edit Vehicle Form State
  const [showAddVehicle, setShowAddVehicle] = useState<boolean>(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [vehName, setVehName] = useState<string>('');
  const [vehModel, setVehModel] = useState<string>('');
  const [vehPlate, setVehPlate] = useState<string>('');
  const [submittingVeh, setSubmittingVeh] = useState<boolean>(false);

  // Claim Pre-printed Sticker Form State
  const [showClaimSticker, setShowClaimSticker] = useState<boolean>(false);
  const [claimTagId, setClaimTagId] = useState<string>('');
  const [claimVehName, setClaimVehName] = useState<string>('');
  const [claimVehModel, setClaimVehModel] = useState<string>('');
  const [claimVehPlate, setClaimVehPlate] = useState<string>('');
  const [claimingSticker, setClaimingSticker] = useState<boolean>(false);

  // Push Subscription State
  const [pushEnabled, setPushEnabled] = useState<boolean>(false);
  const [pushLoading, setPushLoading] = useState<boolean>(false);

  // Active Vehicle for Realtime Call Receiver
  const [activeCallCarId, setActiveCallCarId] = useState<string>('');
  const [copiedVehId, setCopiedVehId] = useState<string | null>(null);

  // Hidden canvas QR ref mapping
  const qrRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Active Realtime WebRTC listener for incoming call alerts
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
    carId: activeCallCarId || (vehicles.length > 0 ? vehicles[0].id : ''),
    role: 'owner'
  });

  // Load user profile & vehicles
  const loadUserData = async (userId: string) => {
    try {
      // 1. Load Profile
      const { data: profData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profData) {
        setProfile(profData);
        setEmergencyContact(profData.emergency_contact || '');
        setBloodGroup(profData.blood_group || 'O+');
        setHealthIssues(profData.health_issues || '');
        setMedications(profData.medications || '');
        setAllergies(profData.allergies || '');
      }

      // 2. Load Vehicles
      const { data: vehData } = await supabase
        .from('cars')
        .select('id, nickname, model_number, plate_number')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (vehData) {
        setVehicles(vehData);
        if (vehData.length > 0) {
          setActiveCallCarId(vehData[0].id);
        }
      }
    } catch (err) {
      console.warn('Error loading user data:', err);
    }
  };

  useEffect(() => {
    setOrigin(window.location.origin);

    supabase.auth.getUser().then(({ data }) => {
      const currentUser = data.user;
      if (!currentUser) {
        router.push('/');
        return;
      }
      setUser(currentUser);
      loadUserData(currentUser.id);
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

  // Save Emergency / Medical Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      setSavingProfile(true);
      setMessage(null);

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          emergency_contact: emergencyContact,
          blood_group: bloodGroup,
          health_issues: healthIssues,
          medications: medications,
          allergies: allergies
        });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Emergency & Medical profile updated successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile' });
    } finally {
      setSavingProfile(false);
    }
  };

  // Save / Add Vehicle
  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      setSubmittingVeh(true);
      setMessage(null);

      if (!vehName || !vehPlate) {
        throw new Error('Vehicle Name and License Plate are required');
      }

      if (editingVehicleId) {
        // Update vehicle
        const { error } = await supabase
          .from('cars')
          .update({
            nickname: vehName,
            model_number: vehModel,
            plate_number: vehPlate
          })
          .eq('id', editingVehicleId);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Vehicle details updated!' });
      } else {
        // Add new vehicle
        const { error } = await supabase
          .from('cars')
          .insert({
            owner_id: user.id,
            nickname: vehName,
            model_number: vehModel,
            plate_number: vehPlate
          });

        if (error) throw error;
        setMessage({ type: 'success', text: `Vehicle "${vehName}" added successfully!` });
      }

      // Reset form
      setVehName('');
      setVehModel('');
      setVehPlate('');
      setEditingVehicleId(null);
      setShowAddVehicle(false);

      // Reload vehicles
      await loadUserData(user.id);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save vehicle' });
    } finally {
      setSubmittingVeh(false);
    }
  };

  // Delete Vehicle
  const handleDeleteVehicle = async (vehId: string) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;
    try {
      setMessage(null);
      const { error } = await supabase
        .from('cars')
        .delete()
        .eq('id', vehId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Vehicle deleted.' });
      await loadUserData(user.id);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete vehicle' });
    }
  };

  // Unlink / Deactivate Vehicle Sticker
  const handleUnlinkVehicle = async (vehId: string, nickname: string) => {
    if (!confirm(`Are you sure you want to unlink sticker for "${nickname}"? The sticker will be returned to the unclaimed pool and can be registered again.`)) return;
    try {
      setMessage(null);
      const res = await fetch(`/api/cars/${vehId}/unlink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to unlink sticker');

      setMessage({ type: 'success', text: `Sticker for "${nickname}" has been unlinked successfully!` });
      await loadUserData(user.id);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to unlink vehicle sticker' });
    }
  };

  // Claim Pre-Printed Sticker by ID
  const handleClaimSticker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      setClaimingSticker(true);
      setMessage(null);

      if (!claimTagId.trim() || !claimVehName.trim() || !claimVehPlate.trim()) {
        throw new Error('Sticker ID, Vehicle Name, and License Plate are required');
      }

      const res = await fetch(`/api/cars/${claimTagId.trim()}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: claimVehName.trim(),
          model_number: claimVehModel.trim(),
          plate_number: claimVehPlate.trim(),
          userId: user.id
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to claim sticker');

      setMessage({ type: 'success', text: `Pre-printed QR Sticker successfully claimed for "${claimVehName}"!` });
      setClaimTagId('');
      setClaimVehName('');
      setClaimVehModel('');
      setClaimVehPlate('');
      setShowClaimSticker(false);
      await loadUserData(user.id);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to claim sticker' });
    } finally {
      setClaimingSticker(false);
    }
  };

  // Enable Push Alerts
  const handleEnableCallAlerts = async () => {
    try {
      setPushLoading(true);
      setMessage(null);

      if (!user) return;

      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Push notifications are not supported in this browser.');
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission was blocked or denied.');
      }

      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      let applicationServerKey: BufferSource | string | undefined;
      if (vapidPublicKey && !vapidPublicKey.includes('your-vapid')) {
        applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          ownerId: user.id
        })
      });

      if (!res.ok) {
        throw new Error('Failed to save push subscription');
      }

      setPushEnabled(true);
      setMessage({ type: 'success', text: 'Call alerts enabled for all your vehicles!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to enable push alerts' });
    } finally {
      setPushLoading(false);
    }
  };

  const handleDisableCallAlerts = async () => {
    try {
      setPushLoading(true);
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

  // Download High-Res PNG Card for a specific vehicle
  const handleDownloadVehicleQR = (v: Vehicle) => {
    const container = qrRefs.current[v.id];
    const svgElement = container?.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = 800;
      canvas.height = 500;
      if (ctx) {
        // Draw Left Panel (Chocolate Brown)
        ctx.fillStyle = '#2C1812';
        ctx.fillRect(0, 0, 420, 500);

        // Draw Right Panel (Vintage Cream)
        ctx.fillStyle = '#EAE7D7';
        ctx.fillRect(420, 0, 380, 500);

        // Header Text: CALL N GO
        ctx.fillStyle = '#2A160F';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('C A L L  N  G O', 610, 50);

        // Draw QR Code onto Right Panel
        ctx.drawImage(img, 470, 70, 270, 270);

        // Draw Vehicle Plate & Model Number on Right Panel
        ctx.fillStyle = '#2A160F';
        ctx.font = 'bold 15px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`PLATE: ${v.plate_number?.toUpperCase() || ''}`, 610, 360);
        if (v.model_number) {
          ctx.font = '13px sans-serif';
          ctx.fillText(`MODEL: ${v.model_number}`, 610, 380);
        }

        // Footer Pill Badge
        ctx.fillStyle = '#2A1711';
        ctx.beginPath();
        ctx.roundRect(550, 405, 120, 34, 17);
        ctx.fill();

        ctx.fillStyle = '#EAE7D7';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('callngo.app', 610, 427);

        // Left Panel Text Content
        ctx.fillStyle = '#F5F2E6';
        ctx.textAlign = 'left';

        // Title
        ctx.font = 'bold 20px serif';
        ctx.fillText('Scan the QR', 60, 140);
        ctx.fillText('connect the owner', 60, 170);

        // Underline
        ctx.strokeStyle = '#F5F2E6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(60, 178);
        ctx.lineTo(260, 178);
        ctx.stroke();

        // Call/Message Pill
        ctx.fillStyle = '#F9F7EF';
        ctx.beginPath();
        ctx.roundRect(60, 210, 280, 44, 22);
        ctx.fill();

        ctx.fillStyle = '#2A160F';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('📞 Call   ✉️ Emergency', 90, 238);

        // Bullet Points
        ctx.fillStyle = '#F5F2E6';
        ctx.font = '16px serif';
        ctx.fillText(`• Vehicle: ${v.nickname}`, 60, 300);
        ctx.fillText('• Please move your car', 60, 335);
        ctx.fillText('• Call in case of accident', 60, 370);
        ctx.fillText('• Emergency info inside', 60, 405);
      }

      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      const filename = v.nickname.toLowerCase().replace(/\s+/g, '-');
      downloadLink.download = `callngo-card-${filename}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleLogOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F5EE] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#4A2E20] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F5EE] text-[#2C1A12] p-4 sm:p-8 flex flex-col items-center selection:bg-[#D4A254] selection:text-[#160f0b]">
      {/* Hidden Audio Element for WebRTC audio playback */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* FULL-SCREEN INCOMING / CONNECTED CALL MODAL */}
      {(callStatus === 'incoming' || callStatus === 'connecting' || callStatus === 'connected') && (
        <div className="fixed inset-0 z-50 bg-[#2C1A12]/80 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white border border-[#E4DCD0] rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center relative">
            <div className="w-20 h-20 rounded-full bg-[#FAF6EE] border border-[#E4DCD0] flex items-center justify-center mb-4 text-3xl shadow-inner">
              🚗
            </div>

            <h2 className="text-2xl font-bold text-[#2C1A12] mb-1 font-serif">
              Someone is scanning your vehicle!
            </h2>
            <p className="text-xs text-[#7A6657] mb-4">
              Incoming WebRTC private call from caller
            </p>

            {callStatus === 'incoming' && (
              <div className="w-full py-4 flex flex-col items-center gap-6">
                <p className="text-sm font-semibold text-[#B5822B] animate-pulse font-serif">
                  Incoming Voice Call...
                </p>

                <div className="flex items-center justify-center gap-4 w-full">
                  <button
                    onClick={() => declineCall(activeCallId)}
                    className="flex-1 py-3.5 rounded-2xl bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 font-semibold text-base transition flex items-center justify-center gap-2"
                  >
                    <PhoneOff className="w-5 h-5" />
                    Decline
                  </button>

                  <button
                    onClick={() => acceptCall(activeCallId)}
                    className="flex-1 py-3.5 rounded-2xl bg-[#4A2E20] hover:bg-[#3B2418] text-white font-semibold text-base transition shadow-lg shadow-[#4A2E20]/20 flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Phone className="w-5 h-5 text-[#D4A254]" />
                    Accept
                  </button>
                </div>
              </div>
            )}

            {callStatus === 'connecting' && (
              <div className="py-6 flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-3 border-[#4A2E20] border-t-transparent rounded-full animate-spin" />
                <p className="text-[#6E5A4C] text-sm">Connecting audio stream...</p>
              </div>
            )}

            {callStatus === 'connected' && (
              <div className="w-full py-4 flex flex-col items-center gap-6">
                <div className="flex flex-col items-center gap-1">
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold uppercase tracking-wider border border-emerald-300">
                    Connected
                  </span>
                  <span className="text-3xl font-mono font-bold text-[#2C1A12] mt-2">
                    {formattedDuration}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-6 w-full">
                  <button
                    onClick={toggleMute}
                    className={`w-14 h-14 rounded-full flex items-center justify-center border transition ${
                      isMuted
                        ? 'bg-amber-100 border-amber-400 text-amber-800'
                        : 'bg-[#FAF6EE] border-[#E4DCD0] text-[#2C1A12] hover:bg-[#F4EFE6]'
                    }`}
                  >
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </button>

                  <button
                    onClick={hangUp}
                    className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg shadow-red-600/30 transition active:scale-95"
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
        
        {/* Header Navigation */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-[#E4DCD0] p-6 rounded-3xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#4A2E20] flex items-center justify-center text-white text-xl font-bold shadow-md">
              🚗
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#2C1A12] tracking-tight font-serif">Owner Dashboard & Profile</h1>
              <p className="text-xs text-[#6E5A4C]">
                Logged in as <strong className="text-[#2C1A12]">{user?.email}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-3.5 py-2 rounded-xl bg-[#FAF6EE] hover:bg-[#F4EFE6] text-xs font-semibold text-[#4A2E20] border border-[#E4DCD0] transition"
            >
              ← Home
            </Link>

            <button
              onClick={handleLogOut}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-red-50 text-red-700 text-xs font-semibold border border-red-200 transition flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5 text-red-600" />
              Log Out
            </button>
          </div>
        </header>

        <IOSInstallPrompt />

        {/* System Messages */}
        {message && (
          <div
            className={`p-4 rounded-2xl border text-sm flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <BellOff className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* SECTION A: EMERGENCY & MEDICAL INFO (One set per user) */}
        <section className="bg-white border border-[#E4DCD0] p-6 rounded-3xl space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E4DCD0] pb-3">
            <div>
              <h2 className="text-lg font-bold text-[#2C1A12] flex items-center gap-2 font-serif">
                <HeartPulse className="w-5 h-5 text-red-600" />
                Emergency & Medical Profile
              </h2>
              <p className="text-xs text-[#7A6657] mt-0.5">
                Single master medical set displayed to first responders when any of your vehicle QR codes are scanned.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 p-5 rounded-2xl bg-[#FAF6EE] border border-[#E4DCD0]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#4A3B32] mb-1">Emergency Contact Number *</label>
                <div className="relative">
                  <PhoneCall className="w-4 h-4 text-[#7A6657] absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="e.g. +91 9876543210 (Family / Partner)"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-[#E4DCD0] text-[#2C1A12] text-sm focus:outline-none focus:border-[#B5822B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4A3B32] mb-1">Blood Group *</label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E4DCD0] text-[#2C1A12] text-sm focus:outline-none focus:border-[#B5822B] font-bold"
                >
                  <option value="O+">O Positive (O+)</option>
                  <option value="O-">O Negative (O-)</option>
                  <option value="A+">A Positive (A+)</option>
                  <option value="A-">A Negative (A-)</option>
                  <option value="B+">B Positive (B+)</option>
                  <option value="B-">B Negative (B-)</option>
                  <option value="AB+">AB Positive (AB+)</option>
                  <option value="AB-">AB Negative (AB-)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#4A3B32] mb-1">Health Issues</label>
                <input
                  type="text"
                  value={healthIssues}
                  onChange={(e) => setHealthIssues(e.target.value)}
                  placeholder="e.g. Asthma, Diabetes, None"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E4DCD0] text-[#2C1A12] text-sm focus:outline-none focus:border-[#B5822B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4A3B32] mb-1">Medications</label>
                <input
                  type="text"
                  value={medications}
                  onChange={(e) => setMedications(e.target.value)}
                  placeholder="e.g. Inhaler, Insulin, None"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E4DCD0] text-[#2C1A12] text-sm focus:outline-none focus:border-[#B5822B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4A3B32] mb-1">Allergic To</label>
                <input
                  type="text"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="e.g. Penicillin, Peanuts, None"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E4DCD0] text-[#2C1A12] text-sm focus:outline-none focus:border-[#B5822B]"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-6 py-2.5 rounded-xl bg-[#4A2E20] hover:bg-[#3B2418] text-white font-bold text-xs transition shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5 text-[#D4A254]" />
                {savingProfile ? 'Saving Profile...' : 'Save Emergency Profile'}
              </button>
            </div>
          </form>
        </section>

        {/* SECTION B: MY VEHICLES & QR CARDS */}
        <section className="bg-white border border-[#E4DCD0] p-6 rounded-3xl space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4DCD0] pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#2C1A12] flex items-center gap-2 font-serif">
                <Car className="w-5 h-5 text-[#B5822B]" />
                My Registered Vehicles ({vehicles.length})
              </h2>
              <p className="text-xs text-[#7A6657] mt-0.5">
                Each vehicle gets its own unique QR card link for callers and emergency responders.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setShowAddVehicle(false);
                  setShowClaimSticker(!showClaimSticker);
                }}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#FAF6EE] text-[#4A2E20] border border-[#E4DCD0] font-bold text-xs transition flex items-center gap-2 shadow-sm"
              >
                <QrCode className="w-4 h-4 text-[#B5822B]" />
                {showClaimSticker ? 'Cancel' : 'Claim Sticker ID'}
              </button>

              <button
                onClick={() => {
                  setEditingVehicleId(null);
                  setVehName('');
                  setVehModel('');
                  setVehPlate('');
                  setShowClaimSticker(false);
                  setShowAddVehicle(!showAddVehicle);
                }}
                className="px-4 py-2.5 rounded-xl bg-[#4A2E20] hover:bg-[#3B2418] text-white font-bold text-xs transition flex items-center gap-2 shadow-md"
              >
                <Plus className="w-4 h-4 text-[#D4A254]" />
                {showAddVehicle ? 'Cancel' : 'Add New Vehicle'}
              </button>
            </div>
          </div>

          {/* ADD / EDIT VEHICLE FORM MODAL */}
          {showAddVehicle && (
            <form onSubmit={handleSaveVehicle} className="p-5 rounded-2xl bg-[#FAF6EE] border border-[#E4DCD0] space-y-4 animate-in fade-in duration-200">
              <div className="text-xs font-bold uppercase tracking-wider text-[#B5822B]">
                {editingVehicleId ? 'Edit Vehicle Information' : 'Add New Vehicle'}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#4A3B32] mb-1">Vehicle Name *</label>
                  <input
                    type="text"
                    required
                    value={vehName}
                    onChange={(e) => setVehName(e.target.value)}
                    placeholder="e.g. Swift / City / Duke"
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E4DCD0] text-[#2C1A12] text-sm focus:outline-none focus:border-[#B5822B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#4A3B32] mb-1">Model Number</label>
                  <input
                    type="text"
                    value={vehModel}
                    onChange={(e) => setVehModel(e.target.value)}
                    placeholder="e.g. VXI 2022 / ZX 2023"
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E4DCD0] text-[#2C1A12] text-sm focus:outline-none focus:border-[#B5822B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#4A3B32] mb-1">License Plate Number *</label>
                  <input
                    type="text"
                    required
                    value={vehPlate}
                    onChange={(e) => setVehPlate(e.target.value)}
                    placeholder="e.g. KA 01 AB 1234"
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E4DCD0] text-[#2C1A12] text-sm focus:outline-none focus:border-[#B5822B]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddVehicle(false)}
                  className="px-4 py-2 rounded-xl bg-white border border-[#E4DCD0] text-[#7A6657] font-semibold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingVeh}
                  className="px-6 py-2 rounded-xl bg-[#4A2E20] hover:bg-[#3B2418] text-white font-bold text-xs transition shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5 text-[#D4A254]" />
                  {submittingVeh ? 'Saving...' : (editingVehicleId ? 'Update Vehicle' : 'Add Vehicle')}
                </button>
              </div>
            </form>
          )}

          {/* CLAIM PRE-PRINTED STICKER FORM MODAL */}
          {showClaimSticker && (
            <form onSubmit={handleClaimSticker} className="p-5 rounded-2xl bg-[#FAF6EE] border border-[#E4DCD0] space-y-4 animate-in fade-in duration-200">
              <div className="text-xs font-bold uppercase tracking-wider text-[#B5822B]">
                Link Pre-Printed Physical QR Code Sticker
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4A3B32] mb-1">Sticker / Tag ID (from QR link) *</label>
                <input
                  type="text"
                  required
                  value={claimTagId}
                  onChange={(e) => setClaimTagId(e.target.value)}
                  placeholder="e.g. paste tag UUID or car ID from QR sticker"
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E4DCD0] text-[#2C1A12] text-sm focus:outline-none focus:border-[#B5822B] font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#4A3B32] mb-1">Vehicle Name *</label>
                  <input
                    type="text"
                    required
                    value={claimVehName}
                    onChange={(e) => setClaimVehName(e.target.value)}
                    placeholder="e.g. Swift / City / Duke"
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E4DCD0] text-[#2C1A12] text-sm focus:outline-none focus:border-[#B5822B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#4A3B32] mb-1">Model Number</label>
                  <input
                    type="text"
                    value={claimVehModel}
                    onChange={(e) => setClaimVehModel(e.target.value)}
                    placeholder="e.g. VXI 2022"
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E4DCD0] text-[#2C1A12] text-sm focus:outline-none focus:border-[#B5822B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#4A3B32] mb-1">License Plate Number *</label>
                  <input
                    type="text"
                    required
                    value={claimVehPlate}
                    onChange={(e) => setClaimVehPlate(e.target.value)}
                    placeholder="e.g. KA 01 AB 1234"
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E4DCD0] text-[#2C1A12] text-sm focus:outline-none focus:border-[#B5822B]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClaimSticker(false)}
                  className="px-4 py-2 rounded-xl bg-white border border-[#E4DCD0] text-[#7A6657] font-semibold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={claimingSticker}
                  className="px-6 py-2 rounded-xl bg-[#4A2E20] hover:bg-[#3B2418] text-white font-bold text-xs transition shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  <QrCode className="w-3.5 h-3.5 text-[#D4A254]" />
                  {claimingSticker ? 'Claiming Sticker...' : 'Activate & Link Sticker'}
                </button>
              </div>
            </form>
          )}

          {/* LIST OF VEHICLES */}
          {vehicles.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-[#FAF6EE] border border-[#E4DCD0] space-y-3">
              <div className="text-3xl">🚗</div>
              <h3 className="text-base font-bold text-[#2C1A12]">No Vehicles Added Yet</h3>
              <p className="text-xs text-[#7A6657] max-w-sm mx-auto">
                Click "+ Add New Vehicle" above to register your car or bike and generate your unique QR sticker card.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {vehicles.map((v) => {
                const carQrUrl = `${origin || 'http://localhost:3000'}/c/${v.id}`;

                return (
                  <div key={v.id} className="p-6 rounded-3xl bg-[#FAF6EE] border border-[#E4DCD0] space-y-4">
                    {/* Vehicle Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E4DCD0] pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#4A2E20] text-white font-bold flex items-center justify-center text-lg">
                          🚗
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-[#2C1A12] font-serif">{v.nickname}</h3>
                          <div className="flex items-center gap-3 text-xs font-mono font-bold text-[#B5822B] mt-0.5">
                            <span>PLATE: {v.plate_number || 'N/A'}</span>
                            {v.model_number && <span className="text-[#7A6657]">| MODEL: {v.model_number}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUnlinkVehicle(v.id, v.nickname)}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200 transition flex items-center gap-1"
                          title="Return sticker to unclaimed pool"
                        >
                          <Unlink className="w-3.5 h-3.5 text-amber-700" />
                          Unlink Sticker
                        </button>

                        <button
                          onClick={() => {
                            setEditingVehicleId(v.id);
                            setVehName(v.nickname);
                            setVehModel(v.model_number || '');
                            setVehPlate(v.plate_number || '');
                            setShowAddVehicle(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#F4EFE6] text-[#4A2E20] text-xs font-semibold border border-[#E4DCD0] transition flex items-center gap-1"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-[#B5822B]" />
                          Edit
                        </button>

                        <button
                          onClick={() => handleDeleteVehicle(v.id)}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-red-50 text-red-700 text-xs font-semibold border border-red-200 transition flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* DUAL-PANEL QR CARD DISPLAY */}
                    <div className="w-full rounded-2xl overflow-hidden border border-[#523326] shadow-lg flex flex-col md:flex-row">
                      
                      {/* Left Panel */}
                      <div className="md:w-1/2 bg-[#2A1812] p-6 text-[#F5F2E6] flex flex-col items-center text-center justify-between border-b md:border-b-0 md:border-r border-[#3D231A]">
                        <div className="w-16 h-16 rounded-full border border-[#D4A254]/40 flex items-center justify-center bg-[#1E0F0A]/60 shadow-inner mb-3">
                          <span className="text-2xl">🚗</span>
                        </div>

                        <div className="mb-4">
                          <h4 className="text-lg font-bold font-serif text-[#F5F2E6]">Scan the QR</h4>
                          <h4 className="text-lg font-bold font-serif text-[#F5F2E6] underline underline-offset-4 decoration-[#D4A254]">
                            connect the owner
                          </h4>
                        </div>

                        <div className="px-5 py-2 rounded-full bg-[#F9F7EF] text-[#2A160F] font-bold text-xs flex items-center gap-3 shadow-md mb-4 border border-[#EBE8D8]">
                          <span>📞 Voice Call</span>
                          <span>|</span>
                          <span>🚨 Emergency</span>
                        </div>

                        <ul className="text-left text-xs space-y-1.5 text-[#E2DACD] font-serif w-full max-w-xs">
                          <li>• Vehicle: {v.nickname} ({v.plate_number})</li>
                          <li>• Please move your car</li>
                          <li>• Call in case of accident</li>
                        </ul>
                      </div>

                      {/* Right Panel with Vehicle-Specific QR Code */}
                      <div className="md:w-1/2 bg-[#EAE7D7] p-6 text-[#2A160F] flex flex-col items-center justify-between text-center min-h-[300px]">
                        <div className="text-lg font-bold tracking-[0.25em] font-mono text-[#2A160F] uppercase mt-1">
                          C A L L N G O
                        </div>

                        {/* Hidden QR ref container for canvas rendering */}
                        <div
                          ref={(el) => { qrRefs.current[v.id] = el; }}
                          className="p-3 bg-[#EAE7D7] rounded-xl flex items-center justify-center shadow-inner my-2"
                        >
                          <QRCodeSVG
                            value={carQrUrl}
                            size={160}
                            bgColor="#EAE7D7"
                            fgColor="#2A160F"
                            level="H"
                            marginSize={1}
                          />
                        </div>

                        <div className="text-xs font-mono font-bold text-[#2A160F] tracking-wider uppercase mb-1">
                          PLATE: {v.plate_number}
                        </div>

                        <span className="px-4 py-1 rounded-full bg-[#2A1711] text-[#EAE7D7] text-[11px] font-bold tracking-wider font-mono">
                          callngo.app
                        </span>
                      </div>

                    </div>

                    {/* Actions Bar for this vehicle */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(carQrUrl);
                            setCopiedVehId(v.id);
                            setTimeout(() => setCopiedVehId(null), 2000);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#F4EFE6] text-[#4A2E20] border border-[#E4DCD0] font-semibold transition flex items-center gap-1.5"
                        >
                          {copiedVehId === v.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedVehId === v.id ? 'Copied!' : 'Copy QR Link'}
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownloadVehicleQR(v)}
                          className="px-4 py-2 rounded-xl bg-[#4A2E20] hover:bg-[#3B2418] text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm"
                        >
                          <Download className="w-3.5 h-3.5 text-[#D4A254]" />
                          Download Card PNG
                        </button>

                        <Link
                          href={`/c/${v.id}`}
                          target="_blank"
                          className="px-4 py-2 rounded-xl bg-white hover:bg-[#F4EFE6] text-[#4A2E20] border border-[#E4DCD0] font-semibold transition flex items-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-[#B5822B]" />
                          Open Live Caller Page
                        </Link>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* SECTION C: WEB PUSH CALL ALERTS */}
        <section className="bg-white border border-[#E4DCD0] p-6 rounded-3xl space-y-4 shadow-sm">
          <h2 className="text-lg font-bold text-[#2C1A12] flex items-center gap-2 font-serif">
            <Bell className="w-5 h-5 text-[#B5822B]" />
            Push Call Alerts
          </h2>

          <div className="p-4 rounded-2xl bg-[#FAF6EE] border border-[#E4DCD0] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-[#2C1A12]">
                Call Alerts Status: {pushEnabled ? 'Active' : 'Disabled'}
              </h3>
              <p className="text-xs text-[#7A6657] mt-1 max-w-md">
                Subscribes this mobile/desktop device to receive push alerts whenever any of your vehicle QR codes are scanned.
              </p>
            </div>

            {pushEnabled ? (
              <button
                onClick={handleDisableCallAlerts}
                disabled={pushLoading}
                className="px-5 py-2.5 rounded-xl bg-white hover:bg-[#F4EFE6] border border-[#E4DCD0] text-[#4A3B32] font-semibold text-sm transition"
              >
                Disable Call Alerts
              </button>
            ) : (
              <button
                onClick={handleEnableCallAlerts}
                disabled={pushLoading}
                className="px-6 py-3 rounded-xl bg-[#4A2E20] hover:bg-[#3B2418] text-white font-bold text-sm transition shadow-md flex items-center gap-2"
              >
                <Bell className="w-4 h-4 text-[#D4A254]" />
                {pushLoading ? 'Enabling...' : 'Enable Push Call Alerts'}
              </button>
            )}
          </div>
        </section>

      </div>
    </main>
  );
}
