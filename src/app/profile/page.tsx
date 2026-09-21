'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { ShieldCheck, User, Mail, Phone, PhoneCall, Plus, Car, Trash2, Edit2, Download, ExternalLink, Bell, CheckCircle2, BellOff, LogOut, Copy, Check, HeartPulse, AlertCircle, Save, Mic, MicOff, PhoneOff, Hash, Unlink, QrCode, Camera, ShoppingBag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { useWebRTCCall } from '@/hooks/useWebRTCCall';
import { QRScannerModal } from '@/components/QRScannerModal';
import { ProductShopModal } from '@/components/ProductShopModal';

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
  activated_at?: string | null;
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
  const [showQRScanner, setShowQRScanner] = useState<boolean>(false);
  const [showBuyModal, setShowBuyModal] = useState<boolean>(false);
  const [claimTagId, setClaimTagId] = useState<string>('');
  const [claimVehName, setClaimVehName] = useState<string>('');
  const [claimVehModel, setClaimVehModel] = useState<string>('');
  const [claimVehPlate, setClaimVehPlate] = useState<string>('');
  const [claimingSticker, setClaimingSticker] = useState<boolean>(false);
  const [linkingVehicle, setLinkingVehicle] = useState<any | null>(null);

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
        .select('id, nickname, model_number, plate_number, activated_at')
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

  // Handle Scanning a physical QR sticker in Profile
  const handleScanProfileSticker = async (scannedId: string) => {
    setShowQRScanner(false);
    try {
      setMessage(null);
      const res = await fetch(`/api/cars/${scannedId}/public`);
      if (!res.ok) throw new Error('Could not check vehicle sticker');
      const data = await res.json();

      if (data.is_activated) {
        setMessage({
          type: 'error',
          text: '⚠️ This vehicle sticker has already been claimed and registered! Please scan an unassigned sticker.'
        });
        setLinkingVehicle(null);
        return;
      }

      // If linking a specific inactive vehicle created via "Add New Vehicle"
      if (linkingVehicle && user) {
        const claimRes = await fetch(`/api/cars/${scannedId}/claim`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nickname: linkingVehicle.nickname,
            model_number: linkingVehicle.model_number || '',
            plate_number: linkingVehicle.plate_number,
            userId: user.id,
            pendingVehicleId: linkingVehicle.id
          })
        });
        const claimData = await claimRes.json();
        if (!claimRes.ok) throw new Error(claimData.error || 'Failed to link sticker');

        setLinkingVehicle(null);
        setMessage({
          type: 'success',
          text: `✅ Physical QR Sticker successfully linked! "${linkingVehicle.nickname}" is now active and protected.`
        });
        await loadUserData(user.id);
      } else {
        setClaimTagId(scannedId);
        setShowClaimSticker(true);
        setMessage({
          type: 'success',
          text: `✅ Unclaimed Sticker (${scannedId.slice(0, 8)}...) verified! Please enter vehicle details below to activate and link it.`
        });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to verify sticker' });
      setLinkingVehicle(null);
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
            <img
              src="/logo.png"
              alt="CallNGo Logo"
              className="w-12 h-12 rounded-2xl object-contain shadow-md"
            />
            <div>
              <h1 className="text-xl font-bold text-[#2C1A12] tracking-tight font-serif">Owner Dashboard & Profile</h1>
              <p className="text-xs text-[#6E5A4C]">
                Logged in as <strong className="text-[#2C1A12]">{profile?.full_name || user?.user_metadata?.full_name || 'User'}</strong>
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

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowBuyModal(true)}
                className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-[#FAF6EE] text-[#4A2E20] border border-[#E4DCD0] font-bold text-xs transition flex items-center gap-1.5 shadow-sm"
              >
                <ShoppingBag className="w-4 h-4 text-[#B5822B]" />
                Buy Tags
              </button>

              <button
                onClick={() => {
                  setShowAddVehicle(false);
                  setShowQRScanner(true);
                }}
                className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-[#FAF6EE] text-[#4A2E20] border border-[#E4DCD0] font-bold text-xs transition flex items-center gap-1.5 shadow-sm"
              >
                <Camera className="w-4 h-4 text-[#B5822B]" />
                Scan QR Sticker
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
                <label className="block text-xs font-semibold text-[#4A3B32] mb-1">Scanned Physical Sticker ID</label>
                <div className="px-3 py-2.5 rounded-xl bg-white border border-[#E4DCD0] text-[#2C1A12] text-xs font-mono font-bold flex items-center justify-between">
                  <span>{claimTagId}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">Unclaimed & Verified</span>
                </div>
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
            <div className="p-8 text-center rounded-3xl bg-[#FAF6EE] border border-[#E4DCD0] space-y-3">
              <span className="text-4xl inline-block">🚗</span>
              <h3 className="text-lg font-bold text-[#2C1A12] font-serif">You haven&apos;t linked any vehicle card yet</h3>
              <p className="text-xs text-[#7A6657] max-w-md mx-auto leading-relaxed">
                You are registered on CallNGo, but you haven&apos;t activated a vehicle tag yet. If you have a physical sticker, use <strong className="text-[#2C1A12] font-semibold">Scan QR Sticker</strong> above. If you need a sticker or valet card, order below!
              </p>

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowBuyModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-[#4A2E20] hover:bg-[#3B2418] text-white font-bold text-xs transition shadow-md flex items-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4 text-[#D4A254]" />
                  <span>Buy Stickers & Valet Cards</span>
                </button>
              </div>
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
                        <img
                          src="/logo.png"
                          alt="CallNGo Logo"
                          className="w-10 h-10 rounded-xl object-contain shadow-sm"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-[#2C1A12] font-serif">{v.nickname}</h3>
                            {v.activated_at ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider border border-emerald-200">
                                🟢 Active & Linked
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold uppercase tracking-wider border border-amber-300">
                                🔴 Inactive • QR Unlinked
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs font-mono font-bold text-[#B5822B] mt-0.5">
                            <span>PLATE: {v.plate_number || 'N/A'}</span>
                            {v.model_number && <span className="text-[#7A6657]">| MODEL: {v.model_number}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {v.activated_at && (
                          <button
                            onClick={() => handleUnlinkVehicle(v.id, v.nickname)}
                            className="px-3 py-1.5 rounded-xl bg-white hover:bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200 transition flex items-center gap-1"
                            title="Return sticker to unclaimed pool"
                          >
                            <Unlink className="w-3.5 h-3.5 text-amber-700" />
                            Unlink Sticker
                          </button>
                        )}

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

                    {/* VEHICLE STATUS & CALLER LINK */}
                    {v.activated_at ? (
                      <div className="w-full p-4 rounded-2xl bg-white border border-[#E4DCD0] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase tracking-wider border border-emerald-200">
                              ✓ Activated Physical Sticker
                            </span>
                            <span className="text-[11px] text-[#7A6657] font-mono">
                              ID: {v.id.substring(0, 13)}...
                            </span>
                          </div>
                          <p className="text-[#6E5A4C] mt-1 text-[11px]">
                            Physical QR sticker linked to your emergency contact profile.
                          </p>
                        </div>

                        <Link
                          href={`/c/${v.id}`}
                          target="_blank"
                          className="px-4 py-2 rounded-xl bg-[#4A2E20] hover:bg-[#3B2418] text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-[#D4A254]" />
                          Open Live Caller Page
                        </Link>
                      </div>
                    ) : (
                      <div className="w-full p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold uppercase tracking-wider border border-amber-300">
                              🔴 Inactive • QR Sticker Required
                            </span>
                          </div>
                          <p className="text-amber-900 mt-1 text-[11.5px] max-w-md leading-relaxed">
                            Vehicle details are saved, but calling features are inactive. Scan your physical CallNGo sticker to link and make this vehicle active.
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              setLinkingVehicle(v);
                              setShowQRScanner(true);
                            }}
                            className="px-4 py-2.5 rounded-xl bg-[#4A2E20] hover:bg-[#3B2418] text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md"
                          >
                            <Camera className="w-3.5 h-3.5 text-[#D4A254]" />
                            <span>Scan QR to Activate</span>
                          </button>
                        </div>
                      </div>
                    )}
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

      {/* QR SCANNER MODAL */}
      <QRScannerModal
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScan={handleScanProfileSticker}
        title="Scan Sticker to Link Vehicle"
        subtitle="Point camera at an unassigned CallNGo QR sticker to link to your account"
      />

      {/* BUY TAGS MODAL */}
      <ProductShopModal
        isOpen={showBuyModal}
        onClose={() => setShowBuyModal(false)}
        initialName={profile?.full_name || ''}
        initialPhone={profile?.phone_number || ''}
      />
    </main>
  );
}
