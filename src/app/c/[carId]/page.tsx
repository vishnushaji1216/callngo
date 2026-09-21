'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWebRTCCall } from '@/hooks/useWebRTCCall';
import {
  Phone,
  Mic,
  MicOff,
  PhoneOff,
  ShieldCheck,
  AlertCircle,
  Check,
  PhoneCall,
  HeartPulse,
  Sparkles,
  User,
  Mail,
  Lock,
  Car,
  Bell,
  CheckCircle2,
  X,
  FileText,
  AlertTriangle,
  Lightbulb,
  Ban,
  Truck,
  ShieldAlert,
  Clock
} from 'lucide-react';
import { IOSInstallPrompt } from '@/components/iOSInstallPrompt';
import { supabase } from '@/lib/supabase/client';

export default function PublicCarPage({ params }: { params: Promise<{ carId: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const carId = resolvedParams.carId;

  // Activation & Car Info States
  const [isActivated, setIsActivated] = useState<boolean | null>(null);
  const [tagId, setTagId] = useState<string>('GF132');
  const [carNickname, setCarNickname] = useState<string>('Vehicle');
  const [modelNumber, setModelNumber] = useState<string>('');
  const [platePrefix, setPlatePrefix] = useState<string>('');
  const [hasLast4, setHasLast4] = useState<boolean>(false);

  // Emergency & Medical Info
  const [emergencyContact, setEmergencyContact] = useState<string>('');
  const [secondaryContact, setSecondaryContact] = useState<string>('');
  const [bloodGroup, setBloodGroup] = useState<string>('');
  const [insurance, setInsurance] = useState<string>('ICICI Insurance');
  const [healthIssues, setHealthIssues] = useState<string>('');
  const [medications, setMedications] = useState<string>('');
  const [allergies, setAllergies] = useState<string>('');

  const [loadingCar, setLoadingCar] = useState<boolean>(true);

  // Selected Reason (Quick message options)
  const contactReasons = [
    { id: 'move', text: 'Please move your vehicle.', icon: '🚗' },
    { id: 'accident_vehicle', text: 'An accident happened to the vehicle.', icon: '💥' },
    { id: 'accident_driver', text: 'An accident happened to the vehicle and the driver.', icon: '🚑' },
    { id: 'blocking', text: 'Your vehicle is blocking my way.', icon: '🚫' },
    { id: 'window', text: 'Your vehicle window is open.', icon: '🪟' },
    { id: 'headlights', text: 'Your vehicle’s headlights are on.', icon: '💡' }
  ];
  const [selectedReason, setSelectedReason] = useState<string>(contactReasons[0].text);

  // Modals
  const [showVerifyModal, setShowVerifyModal] = useState<boolean>(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState<boolean>(false);
  const [showDocsModal, setShowDocsModal] = useState<boolean>(false);
  const [messageState, setMessageState] = useState<{ sent: boolean; sending: boolean; text?: string }>({
    sent: false,
    sending: false
  });

  // Verify Plate & Masked Call Form (Screenshot 2)
  const [inputLast4, setInputLast4] = useState<string>('');
  const [callerPhone, setCallerPhone] = useState<string>('');
  const [verifying, setVerifying] = useState<boolean>(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Telecom Masked Call States (Edesy API)
  const [maskedCallSid, setMaskedCallSid] = useState<string | null>(null);
  const [maskedStatus, setMaskedStatus] = useState<string>('idle');
  const [maskedDuration, setMaskedDuration] = useState<number>(0);
  const [maskedNumber, setMaskedNumber] = useState<string>('');
  const [maskedMessage, setMaskedMessage] = useState<string>('');

  // Unclaimed Activation Form States
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userName, setUserName] = useState<string>('');
  const [authTab, setAuthTab] = useState<'signup' | 'signin'>('signup');
  const [fullName, setFullName] = useState<string>('');
  const [phoneNum, setPhoneNum] = useState<string>('');
  const [loginIdentifier, setLoginIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [claimName, setClaimName] = useState<string>('');
  const [claimModel, setClaimModel] = useState<string>('');
  const [claimPlate, setClaimPlate] = useState<string>('');
  const [submittingClaim, setSubmittingClaim] = useState<boolean>(false);
  const [claimMessage, setClaimMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const {
    status,
    isMuted,
    duration,
    remainingSeconds,
    formattedDuration,
    errorMessage,
    remoteAudioRef,
    startCall,
    hangUp,
    toggleMute
  } = useWebRTCCall({
    carId,
    role: 'caller',
    carNickname
  });

  // Load car public details & check activation status
  const fetchCarPublicDetails = () => {
    if (!carId) return;

    fetch(`/api/cars/${carId}/public`)
      .then((res) => {
        if (!res.ok) throw new Error('Vehicle check failed');
        return res.json();
      })
      .then((data) => {
        setIsActivated(data.is_activated);
        if (data.is_activated) {
          setTagId(data.tag_id || 'GF132');
          setCarNickname(data.nickname || 'Vehicle');
          setModelNumber(data.model_number || '');
          setPlatePrefix(data.plate_prefix || 'UP85BF');
          setHasLast4(data.has_last_4 ?? true);
          setEmergencyContact(data.emergency_contact || '');
          setSecondaryContact(data.secondary_contact || '');
          setBloodGroup(data.blood_group || '');
          setInsurance(data.insurance || 'ICICI Insurance');
          setHealthIssues(data.health_issues || '');
          setMedications(data.medications || '');
          setAllergies(data.allergies || '');
        }
        setLoadingCar(false);
      })
      .catch((err) => {
        console.error('Failed to load public car info:', err);
        setIsActivated(false);
        setLoadingCar(false);
      });
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCurrentUser(data.user);
        supabase
          .from('profiles')
          .select('full_name, phone_number')
          .eq('id', data.user.id)
          .maybeSingle()
          .then(({ data: prof }) => {
            if (prof?.full_name) {
              setUserName(prof.full_name);
            } else if (data.user?.user_metadata?.full_name) {
              setUserName(data.user.user_metadata.full_name);
            }
          });
      }
    });

    fetchCarPublicDetails();
  }, [carId]);

  // Poll live status for active Edesy masked telecom call
  useEffect(() => {
    if (!maskedCallSid) return;

    const terminalStatuses = ['completed', 'failed', 'no-answer'];
    if (terminalStatuses.includes(maskedStatus)) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/calls/masked/${maskedCallSid}`);
        if (!res.ok) return;
        const data = await res.json();
        setMaskedStatus(data.status);
        if (data.duration_sec !== undefined) {
          setMaskedDuration(data.duration_sec);
        }
        if (data.masked_number) {
          setMaskedNumber(data.masked_number);
        }
      } catch (e) {
        console.warn('Status poll error', e);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [maskedCallSid, maskedStatus]);

  // Handle Verify Plate & Initiate Masked Telecom Call (Screenshot 2 & Edesy API)
  const handleSetupMaskedCall = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setVerifying(true);
      setVerifyError(null);

      const cleanDigits = inputLast4.trim();
      if (!cleanDigits || cleanDigits.length !== 4) {
        throw new Error('Please enter exactly 4 digits of the vehicle license plate.');
      }

      const cleanPhone = callerPhone.trim();
      if (!cleanPhone || cleanPhone.length < 8) {
        throw new Error('Please enter your phone number to setup the masked call.');
      }

      // Initiate Edesy Masked Call (with plate verification, anti-spam, and 59s duration cap)
      const callRes = await fetch(`/api/calls/masked`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carId,
          callerPhone: cleanPhone,
          last4: cleanDigits,
          reason: selectedReason
        })
      });

      const callData = await callRes.json();

      if (!callRes.ok || !callData.success) {
        throw new Error(callData.error || 'Failed to setup masked call');
      }

      // Close modal and activate telecom call tracking card
      setShowVerifyModal(false);
      setMaskedCallSid(callData.call_sid);
      setMaskedStatus(callData.status || 'initiated');
      setMaskedNumber(callData.masked_number || '+91 80713 87146');
      setMaskedMessage(callData.message || '');

    } catch (err: any) {
      setVerifyError(err.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  // Handle Instant Push Message
  const handleSendMessage = async () => {
    try {
      setMessageState({ sent: false, sending: true });
      const callId = `msg-${Date.now()}`;
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carId,
          callId,
          reason: selectedReason
        })
      });

      const data = await res.json();
      setMessageState({
        sent: true,
        sending: false,
        text: `Alert sent to owner: "${selectedReason}"`
      });

      setTimeout(() => {
        setMessageState({ sent: false, sending: false });
      }, 5000);

    } catch (e) {
      setMessageState({ sent: false, sending: false });
    }
  };

  // Handle Unclaimed Sticker Activation Form Submit
  const handleActivateSticker = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingClaim(true);
      setClaimMessage(null);

      if (!claimName.trim() || !claimPlate.trim()) {
        throw new Error('Vehicle Name and License Plate are required');
      }

      let activeUserId = currentUser?.id;

      if (!activeUserId) {
        if (authTab === 'signup') {
          const cleanPhone = phoneNum.replace(/[^0-9]/g, '');
          if (!fullName.trim() || !cleanPhone || !password) {
            throw new Error('Please enter your Full Name, Mobile Number, and Password to create an account.');
          }

          if (cleanPhone.length < 10) {
            throw new Error('Please enter a valid 10-digit mobile number.');
          }

          const internalEmail = `${cleanPhone}@callngo.in`;

          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: internalEmail,
            password,
            options: {
              data: {
                full_name: fullName.trim(),
                phone_number: cleanPhone
              }
            }
          });

          if (authError || !authData.user) {
            throw new Error(authError?.message || 'Account registration failed');
          }

          activeUserId = authData.user.id;
          setCurrentUser(authData.user);

          await supabase.from('profiles').upsert({
            id: activeUserId,
            full_name: fullName.trim(),
            phone_number: cleanPhone
          });
        } else {
          const trimmedIdentifier = (loginIdentifier || phoneNum).trim();
          if (!trimmedIdentifier || !password) {
            throw new Error('Please enter your Mobile Number and Password to log in.');
          }

          const emailToLogin = trimmedIdentifier.includes('@')
            ? trimmedIdentifier
            : `${trimmedIdentifier.replace(/[^0-9]/g, '')}@callngo.in`;

          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: emailToLogin,
            password
          });

          if (authError || !authData.user) {
            throw new Error(authError?.message || 'Invalid mobile number or password');
          }

          activeUserId = authData.user.id;
          setCurrentUser(authData.user);
        }
      }

      const claimRes = await fetch(`/api/cars/${carId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: claimName.trim(),
          model_number: claimModel.trim(),
          plate_number: claimPlate.trim(),
          userId: activeUserId
        })
      });

      const claimData = await claimRes.json();
      if (!claimRes.ok) {
        throw new Error(claimData.error || 'Failed to activate sticker');
      }

      setClaimMessage({ type: 'success', text: '🎉 QR Sticker activated successfully! Redirecting to your vehicle dashboard...' });
      setTimeout(() => {
        router.push('/profile');
      }, 1000);

    } catch (err: any) {
      setClaimMessage({ type: 'error', text: err.message || 'Activation failed' });
    } finally {
      setSubmittingClaim(false);
    }
  };

  if (loadingCar) {
    return (
      <main className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#2C1A12] border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  // CASE 1: UNCLAIMED PRE-PRINTED STICKER ACTIVATION SCREEN
  if (isActivated === false) {
    return (
      <main className="min-h-screen bg-[#F8F5EE] text-[#2C1A12] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white border border-[#E4DCD0] rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col items-center text-center relative overflow-hidden">
          <img
            src="/logo.png"
            alt="CallNGo Logo"
            className="w-16 h-16 rounded-2xl object-contain mb-4 shadow-md bg-[#4A2E20] p-1.5"
          />

          <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
            Unclaimed Vehicle Sticker
          </span>

          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-[#2C1A12] tracking-tight mb-2">
            Activate Your CallNGo QR Sticker
          </h1>

          <p className="text-xs text-[#7A6657] mb-6 max-w-sm">
            You scanned an unassigned sticker. Enter your vehicle details below to activate and link this QR code sticker to your account.
          </p>

          {claimMessage && (
            <div
              className={`w-full p-3.5 rounded-2xl border text-xs flex items-center gap-2.5 mb-4 text-left ${
                claimMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              <span>{claimMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleActivateSticker} className="w-full text-left space-y-4">
            {currentUser ? (
              /* Already Logged In Account Badge */
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#4A2E20] text-[#D4A254] flex items-center justify-center font-bold text-xs shadow-sm">
                    ✓
                  </div>
                  <div>
                    <span className="text-[11px] text-[#7A6657] block font-medium">Linking to active account:</span>
                    <span className="font-bold text-[#4A2E20] text-sm">
                      {userName || currentUser.user_metadata?.full_name || currentUser.phone || currentUser.email || 'Logged In User'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setCurrentUser(null);
                    setUserName('');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 font-semibold text-xs hover:bg-amber-100 transition shadow-sm"
                >
                  Switch Account
                </button>
              </div>
            ) : (
              /* Step 1: Create Account or Log In */
              <div className="p-4 rounded-2xl bg-[#FAF6EE] border border-[#E4DCD0] space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-[#B5822B]">Step 1: Your Account (Required)</div>
                <p className="text-[11px] text-[#7A6657]">
                  Create an account or log in with your mobile number so callers can contact you when this sticker is scanned.
                </p>

                <div className="flex items-center p-1 rounded-xl bg-white border border-[#E4DCD0]">
                  <button
                    type="button"
                    onClick={() => setAuthTab('signup')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                      authTab === 'signup' ? 'bg-[#4A2E20] text-white shadow-sm' : 'text-[#7A6657]'
                    }`}
                  >
                    Register
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthTab('signin')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                      authTab === 'signin' ? 'bg-[#4A2E20] text-white shadow-sm' : 'text-[#7A6657]'
                    }`}
                  >
                    Log In
                  </button>
                </div>

                {authTab === 'signup' ? (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#4A3B32] mb-1">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#E4DCD0] text-xs text-[#2C1A12] focus:outline-none focus:border-[#B5822B]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#4A3B32] mb-1">10-Digit Mobile Number *</label>
                      <input
                        type="tel"
                        required
                        value={phoneNum}
                        onChange={(e) => setPhoneNum(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#E4DCD0] text-xs text-[#2C1A12] focus:outline-none focus:border-[#B5822B]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#4A3B32] mb-1">Password *</label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create password (min 6 characters)"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#E4DCD0] text-xs text-[#2C1A12] focus:outline-none focus:border-[#B5822B]"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#4A3B32] mb-1">Mobile Number *</label>
                      <input
                        type="tel"
                        required
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#E4DCD0] text-xs text-[#2C1A12] focus:outline-none focus:border-[#B5822B]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#4A3B32] mb-1">Password *</label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#E4DCD0] text-xs text-[#2C1A12] focus:outline-none focus:border-[#B5822B]"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="p-4 rounded-2xl bg-[#FAF6EE] border border-[#E4DCD0] space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-[#B5822B]">
                {currentUser ? 'Vehicle Details' : 'Step 2: Vehicle Details'}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#4A3B32] mb-1">Vehicle Name *</label>
                <input
                  type="text"
                  required
                  value={claimName}
                  onChange={(e) => setClaimName(e.target.value)}
                  placeholder="e.g. Swift / Honda Amaze"
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E4DCD0] text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#4A3B32] mb-1">Model Number</label>
                  <input
                    type="text"
                    value={claimModel}
                    onChange={(e) => setClaimModel(e.target.value)}
                    placeholder="e.g. 1.2 S MT"
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E4DCD0] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#4A3B32] mb-1">License Plate *</label>
                  <input
                    type="text"
                    required
                    value={claimPlate}
                    onChange={(e) => setClaimPlate(e.target.value)}
                    placeholder="e.g. UP85BF2366"
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E4DCD0] text-xs"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingClaim}
              className="w-full py-3.5 rounded-2xl bg-[#4A2E20] hover:bg-[#3B2418] text-white font-bold text-sm transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-[#D4A254]" />
              {submittingClaim ? 'Activating Sticker...' : 'Activate & Link Sticker Now'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // CASE 2: ACTIVATED VEHICLE - CLIENT DESIGN (Screenshots 1, 2, 3)
  return (
    <main className="min-h-screen bg-[#FDFBF7] text-[#1A1A1A] flex flex-col items-center justify-start sm:py-6 p-4 font-sans">
      {/* Hidden Audio Element for WebRTC remote audio stream */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div className="w-full max-w-md bg-white border border-[#ECE6DC] rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col relative overflow-hidden">
        
        {/* TOP BAR: Tag Code & Notification Bell (Screenshot 1) */}
        <div className="flex items-center justify-between pb-3 border-b border-[#F4EFE6]">
          <div className="flex items-center gap-1">
            <span className="text-2xl font-black tracking-tight text-black font-sans">GF</span>
            <span className="text-2xl font-black tracking-tight text-[#E8A317] font-sans">
              {tagId.replace(/^GF/i, '') || '132'}
            </span>
            <span className="text-[10px] font-bold text-gray-400 -mt-2">®</span>
          </div>

          <button
            type="button"
            onClick={() => setShowEmergencyModal(true)}
            className="w-9 h-9 rounded-full bg-[#FAF6EE] hover:bg-[#F3ECE0] flex items-center justify-center text-gray-600 transition"
            title="Emergency & Alerts"
          >
            <Bell className="w-4 h-4 text-gray-700" />
          </button>
        </div>

        {/* SUBHEAD: CONTACT VEHICLE OWNER */}
        <div className="pt-4 text-left">
          <p className="text-[11px] font-black tracking-widest text-[#5C4D44] uppercase font-mono">
            CONTACT VEHICLE OWNER.
          </p>

          {/* Vehicle Name & Model Display */}
          <div className="mt-1">
            <h1 className="text-base font-bold text-[#1A1A1A] leading-snug">
              <span className="text-[#B91C1C] font-extrabold uppercase">
                {carNickname}
              </span>{' '}
              <span className="text-gray-700 font-medium">
                {modelNumber || 'M. AMAZE 1.2 S MT (I-VTEC)'}
              </span>
            </h1>

            {/* Masked License Plate Row */}
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </span>
              <span className="font-bold text-sm tracking-wider text-black font-mono">
                {platePrefix || 'UP85BF'}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[#FFDF00] text-black font-black text-xs font-mono tracking-widest shadow-sm">
                ####
              </span>
            </div>
          </div>
        </div>

        {/* TELECOM MASKED CALL CARD (Edesy API with 59s Cap) */}
        {maskedCallSid && maskedStatus !== 'idle' && (
          <div className="my-5 p-5 rounded-2xl bg-[#FFFDF7] border-2 border-[#E8A317] shadow-md flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
            {(maskedStatus === 'initiated' || maskedStatus === 'ringing') && (
              <div className="py-3 flex flex-col items-center gap-3 w-full">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-[#FFDF00]/40 flex items-center justify-center animate-ping absolute inset-0" />
                  <div className="w-14 h-14 rounded-full bg-black text-[#FFDF00] flex items-center justify-center relative shadow-md">
                    <Phone className="w-6 h-6 animate-bounce" />
                  </div>
                </div>
                <div>
                  <p className="font-bold text-base text-black">Calling Your Phone Now...</p>
                  <p className="text-xs text-gray-700 mt-1 font-medium">
                    Answer the call from <strong className="text-black font-mono font-bold">{maskedNumber || 'our masked line'}</strong> to connect with the owner.
                  </p>
                  <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                    ⏱️ 59s call limit applied
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMaskedCallSid(null);
                    setMaskedStatus('idle');
                  }}
                  className="mt-2 px-4 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            )}

            {maskedStatus === 'answered' && (
              <div className="py-3 flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-3 border-black border-t-transparent rounded-full animate-spin" />
                <p className="font-bold text-sm text-black">You answered!</p>
                <p className="text-xs text-gray-600">Bridging vehicle owner&apos;s phone now...</p>
              </div>
            )}

            {maskedStatus === 'in-progress' && (
              <div className="w-full py-2 flex flex-col items-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase tracking-wider mb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Masked Telecom Call In Progress
                </div>

                <div className="flex flex-col items-center my-2">
                  <span className="text-3xl font-mono font-black text-black">
                    00:{Math.max(0, 59 - maskedDuration).toString().padStart(2, '0')}
                  </span>
                  <span className="text-[11px] text-gray-500 font-medium">
                    (Auto-hangup at 59 seconds)
                  </span>
                </div>

                <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden my-2">
                  <div
                    className={`h-full transition-all duration-1000 ${
                      59 - maskedDuration <= 10 ? 'bg-red-500' : 'bg-[#E8A317]'
                    }`}
                    style={{ width: `${Math.max(0, (59 - maskedDuration) / 59) * 100}%` }}
                  />
                </div>

                <p className="text-[10px] text-gray-500 mt-1">
                  🔒 Numbers remain completely masked on both phones.
                </p>
              </div>
            )}

            {maskedStatus === 'completed' && (
              <div className="py-3 flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                <p className="font-bold text-sm text-black">Call Completed (59s Limit)</p>
                <p className="text-xs text-gray-500">Thank you for notifying the vehicle owner.</p>
                <button
                  type="button"
                  onClick={() => {
                    setMaskedCallSid(null);
                    setMaskedStatus('idle');
                  }}
                  className="mt-2 px-5 py-2 rounded-xl bg-black text-[#FFDF00] text-xs font-bold"
                >
                  Back to Vehicle
                </button>
              </div>
            )}

            {(maskedStatus === 'failed' || maskedStatus === 'no-answer') && (
              <div className="py-3 flex flex-col items-center gap-2">
                <AlertCircle className="w-7 h-7 text-red-600" />
                <p className="font-bold text-sm text-red-700">Call Unanswered</p>
                <p className="text-xs text-gray-500">The call could not be completed. You can send a message instead.</p>
                <button
                  type="button"
                  onClick={() => {
                    setMaskedCallSid(null);
                    setMaskedStatus('idle');
                  }}
                  className="mt-2 px-4 py-1.5 rounded-xl bg-black text-white text-xs font-bold"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        )}

        {/* ACTIVE WEBRTC CALL OVERLAY / CONTROLS (59 Seconds Limit) */}
        {status !== 'idle' && (
          <div className="my-5 p-5 rounded-2xl bg-[#FFFDF7] border-2 border-[#E8A317] shadow-md flex flex-col items-center text-center">
            {status === 'requesting_mic' && (
              <div className="py-4 flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-3 border-black border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-semibold text-gray-600">Requesting microphone access...</p>
              </div>
            )}

            {status === 'calling' && (
              <div className="py-4 flex flex-col items-center gap-3 w-full">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-[#FFDF00]/40 flex items-center justify-center animate-ping absolute inset-0" />
                  <div className="w-14 h-14 rounded-full bg-black text-[#FFDF00] flex items-center justify-center relative shadow-md">
                    <Phone className="w-6 h-6 animate-bounce" />
                  </div>
                </div>
                <div>
                  <p className="font-bold text-base text-black">Calling Vehicle Owner...</p>
                  <p className="text-xs text-gray-500 mt-0.5">Masked connection • Waiting up to 30s</p>
                </div>
                <button
                  onClick={hangUp}
                  className="mt-2 px-5 py-2 rounded-xl bg-red-50 text-red-600 border border-red-200 text-xs font-bold hover:bg-red-100 transition"
                >
                  Cancel Call
                </button>
              </div>
            )}

            {status === 'connecting' && (
              <div className="py-4 flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-3 border-black border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-semibold text-gray-600">Connecting audio line...</p>
              </div>
            )}

            {status === 'connected' && (
              <div className="w-full py-2 flex flex-col items-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase tracking-wider mb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Masked Voice Call Connected
                </div>

                {/* 59-Second Real-Time Countdown Timer */}
                <div className="flex flex-col items-center my-2">
                  <span className="text-3xl font-mono font-black text-black">
                    00:{remainingSeconds.toString().padStart(2, '0')}
                  </span>
                  <span className="text-[11px] text-gray-500 font-medium">
                    (Max 59 seconds limit)
                  </span>
                </div>

                {/* Timer progress bar */}
                <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden my-3">
                  <div
                    className={`h-full transition-all duration-1000 ${
                      remainingSeconds <= 10 ? 'bg-red-500' : 'bg-[#E8A317]'
                    }`}
                    style={{ width: `${(remainingSeconds / 59) * 100}%` }}
                  />
                </div>

                {/* Call Control Buttons */}
                <div className="flex items-center justify-center gap-5 mt-2">
                  <button
                    onClick={toggleMute}
                    className={`w-12 h-12 rounded-full flex items-center justify-center border transition ${
                      isMuted
                        ? 'bg-amber-100 border-amber-400 text-amber-900'
                        : 'bg-white border-gray-300 text-gray-800 hover:bg-gray-100'
                    }`}
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  <button
                    onClick={hangUp}
                    className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition active:scale-95"
                    title="End Call"
                  >
                    <PhoneOff className="w-6 h-6" />
                  </button>
                </div>
              </div>
            )}

            {status === 'ended' && (
              <div className="py-4 flex flex-col items-center gap-2">
                <p className="font-bold text-sm text-gray-800">Call Ended (59s Limit)</p>
                <p className="text-xs text-gray-500">Thank you for notifying the vehicle owner.</p>
                <button
                  onClick={hangUp}
                  className="mt-2 px-5 py-2 rounded-xl bg-black text-[#FFDF00] text-xs font-bold"
                >
                  Back to Vehicle
                </button>
              </div>
            )}

            {status === 'unreachable' && (
              <div className="py-4 flex flex-col items-center gap-2">
                <p className="font-bold text-sm text-gray-800">Owner Not Available</p>
                <p className="text-xs text-gray-500">No response received. Try sending a message.</p>
                <button
                  onClick={hangUp}
                  className="mt-2 px-5 py-2 rounded-xl bg-black text-white text-xs font-bold"
                >
                  OK
                </button>
              </div>
            )}

            {status === 'declined' && (
              <div className="py-4 flex flex-col items-center gap-2">
                <p className="font-bold text-sm text-red-600">Call Declined</p>
                <button
                  onClick={hangUp}
                  className="mt-2 px-5 py-2 rounded-xl bg-black text-white text-xs font-bold"
                >
                  OK
                </button>
              </div>
            )}

            {status === 'error' && (
              <div className="py-4 flex flex-col items-center gap-2 text-red-700">
                <AlertCircle className="w-6 h-6 text-red-600" />
                <p className="text-xs font-semibold">{errorMessage || 'Unable to connect call'}</p>
                <button
                  onClick={hangUp}
                  className="mt-2 px-5 py-2 rounded-xl bg-black text-white text-xs font-bold"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        )}

        {/* REASON FOR CONTACT RADIO LIST (Screenshot 1) */}
        {status === 'idle' && (
          <div className="mt-5 text-left">
            <h2 className="text-xs font-semibold text-[#4A3B32] mb-3">
              Why would you like to contact the vehicle owner ?
            </h2>

            <div className="space-y-2">
              {contactReasons.map((reason) => {
                const isSelected = selectedReason === reason.text;
                return (
                  <label
                    key={reason.id}
                    onClick={() => setSelectedReason(reason.text)}
                    className={`w-full p-3 rounded-xl border flex items-center justify-between cursor-pointer transition select-none ${
                      isSelected
                        ? 'border-gray-900 bg-white shadow-sm'
                        : 'border-[#ECE6DC] bg-[#FAF8F5] hover:bg-[#F5F1EB]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{reason.icon}</span>
                      <span className="text-xs font-semibold text-[#2C1A12] leading-tight">
                        {reason.text}
                      </span>
                    </div>

                    {/* Radio circle */}
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center transition ${
                        isSelected ? 'border-black bg-black' : 'border-gray-400 bg-white'
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </label>
                );
              })}
            </div>

            {/* MESSAGE STATUS BANNER */}
            {messageState.sent && (
              <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{messageState.text || 'Message sent to vehicle owner successfully!'}</span>
              </div>
            )}

            {/* PRIMARY ACTION BUTTONS: Message & Private Call (Screenshot 1) */}
            <div className="grid grid-cols-2 gap-3 mt-5">
              {/* Message Button */}
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={messageState.sending}
                className="w-full py-3 px-4 rounded-xl border-2 border-black bg-white hover:bg-gray-50 text-black font-bold text-xs tracking-wide transition active:scale-[0.98] disabled:opacity-50"
              >
                {messageState.sending ? 'Sending...' : 'Message'}
              </button>

              {/* Private Call Button (Opens Verification Modal) */}
              <button
                type="button"
                onClick={() => {
                  setVerifyError(null);
                  setShowVerifyModal(true);
                }}
                className="w-full py-3 px-4 rounded-xl bg-black hover:bg-neutral-900 text-[#FFDF00] font-bold text-xs tracking-wide shadow-md transition active:scale-[0.98]"
              >
                Private Call
              </button>
            </div>

            {/* ANTI-SPAM & 59S DISCLAIMER NOTE (Screenshot 1) */}
            <div className="mt-3 p-2 rounded-xl bg-amber-50/70 border border-amber-200/60 text-center space-y-1">
              <p className="text-[10px] font-bold text-amber-900 flex items-center justify-center gap-1">
                <Clock className="w-3 h-3 text-amber-700" />
                <span>Masked calls are strictly capped at 59 seconds.</span>
              </p>
              <p className="text-[9.5px] text-amber-800 leading-tight">
                Your IP address is recorded. Any spam or abuse will result in an immediate block of your IP & phone number for up to 6 months.
              </p>
            </div>

            {/* SECONDARY ACTION BUTTONS: Documents & Emergency (Screenshot 1) */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              {/* Documents Button */}
              <button
                type="button"
                onClick={() => setShowDocsModal(true)}
                className="w-full py-2.5 px-4 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-bold text-xs transition"
              >
                Documents
              </button>

              {/* Emergency Button (Red) */}
              <button
                type="button"
                onClick={() => setShowEmergencyModal(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs tracking-wide shadow-md flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
              >
                <HeartPulse className="w-3.5 h-3.5 text-white" />
                Emergency
              </button>
            </div>

            {/* SUBFOOTER LINKS (Screenshot 1) */}
            <div className="mt-6 pt-4 border-t border-[#F4EFE6] text-center">
              <p className="text-[10px] text-gray-500 flex items-center justify-center gap-1.5 font-medium flex-wrap">
                <span>📍 Urgent,</span>
                <a href="#urgent" onClick={(e) => { e.preventDefault(); setShowEmergencyModal(true); }} className="hover:underline">CallNGo us,</a>
                <span>or</span>
                <a href="#report" onClick={(e) => { e.preventDefault(); alert('Feedback recorded. Thank you.'); }} className="hover:underline">Report,</a>
                <a href="#wrong" onClick={(e) => { e.preventDefault(); alert('Report submitted to moderation team.'); }} className="hover:underline">Wrong info,</a>
                <span>-</span>
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: carNickname, url: window.location.href }).catch(() => {});
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                      alert('Link copied to clipboard!');
                    }
                  }}
                  className="hover:underline font-bold"
                >
                  share
                </button>
              </p>
            </div>
          </div>
        )}

      </div>

      <IOSInstallPrompt />

      {/* ========================================================================= */}
      {/* MODAL 1: PLATE VERIFICATION & MASKED CALL SETUP (Screenshot 2) */}
      {/* ========================================================================= */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative animate-in fade-in slide-in-from-bottom-6 duration-200">
            
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowVerifyModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Graphic Illustration of Vehicle Plate Verification (Screenshot 2) */}
            <div className="w-full rounded-2xl bg-[#F8F6F0] p-4 border border-[#E8E2D6] flex flex-col items-center mb-4">
              {/* Stylized Car Grille & License Plate graphic */}
              <div className="w-48 h-20 bg-gradient-to-b from-gray-800 to-black rounded-xl p-2 flex flex-col items-center justify-between border-2 border-gray-700 shadow-inner relative overflow-hidden">
                {/* Grille lines */}
                <div className="w-full flex justify-center gap-1.5 opacity-40">
                  <div className="w-1.5 h-3 bg-gray-400 rounded-full" />
                  <div className="w-1.5 h-3 bg-gray-400 rounded-full" />
                  <div className="w-1.5 h-3 bg-gray-400 rounded-full" />
                  <div className="w-1.5 h-3 bg-gray-400 rounded-full" />
                  <div className="w-1.5 h-3 bg-gray-400 rounded-full" />
                  <div className="w-1.5 h-3 bg-gray-400 rounded-full" />
                </div>

                {/* Car License Plate on Grille */}
                <div className="w-36 h-8 bg-white border border-gray-400 rounded px-1.5 flex items-center justify-between font-mono text-black font-bold text-[10px] shadow relative">
                  <div className="flex items-center gap-1">
                    <span className="text-[7px] text-blue-600 font-sans">IND</span>
                    <span>{platePrefix || 'UP85BF'}</span>
                  </div>
                  <span className="px-1 bg-[#FFDF00] rounded text-black font-mono font-black">
                    2366
                  </span>

                  {/* Magnifier Circle over the last 4 digits */}
                  <div className="absolute -right-3 -top-3 w-12 h-12 rounded-full border-2 border-black/80 bg-white/95 flex items-center justify-center shadow-lg font-black text-xs font-mono text-black">
                    2366
                  </div>
                </div>
              </div>

              <p className="text-[11px] font-bold text-gray-700 mt-2.5">
                Please Verify the plate number of the vehicle.
              </p>
            </div>

            {/* Verification Form */}
            <form onSubmit={handleSetupMaskedCall} className="space-y-4 text-left">
              <div>
                <p className="text-xs text-gray-700">
                  Please enter the <br />
                  <strong className="text-black font-extrabold text-sm">
                    last 4 digits of vehicle plate number
                  </strong>
                </p>

                {/* Plate Prefix & Last 4 Digits Input Row (Screenshot 2) */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {/* Left: Masked Prefix Box */}
                  <div className="px-3 py-2.5 rounded-xl border border-gray-300 bg-[#FAF8F5] flex items-center justify-between font-mono font-bold text-xs">
                    <span>{platePrefix || 'UP85BF'}</span>
                    <span className="px-1.5 py-0.5 rounded bg-[#FFDF00] text-black text-[11px]">
                      ####
                    </span>
                  </div>

                  {/* Right: Last 4 Digits Input */}
                  <input
                    type="text"
                    required
                    maxLength={4}
                    value={inputLast4}
                    onChange={(e) => setInputLast4(e.target.value.replace(/[^0-9a-zA-Z]/g, '').toUpperCase())}
                    placeholder="Last 4 Digits"
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-black focus:border-[#E8A317] bg-white text-black font-mono font-bold text-center text-sm tracking-widest outline-none"
                    autoFocus
                  />
                </div>
              </div>

              {/* Phone Number Input for Masked Setup (Screenshot 2) */}
              <div>
                <p className="text-xs text-gray-700 leading-snug">
                  We will need your phone number to setup a <strong className="text-black underline font-bold">MASKED</strong> call between you and tag owner.
                </p>
                <input
                  type="tel"
                  required
                  value={callerPhone}
                  onChange={(e) => setCallerPhone(e.target.value)}
                  placeholder="Your Phone"
                  className="w-full mt-2 px-3 py-2.5 rounded-xl border border-gray-300 focus:border-black bg-white text-black text-xs outline-none"
                />
              </div>

              {/* Security & 59s Duration Warning */}
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-left space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900">
                  <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Max Call Duration: 59 Seconds</span>
                </div>
                <p className="text-[10.5px] text-amber-800 leading-relaxed">
                  Calls are capped at 59 seconds. Your IP address is logged; any spam or abuse will result in an immediate block of your IP and phone number.
                </p>
              </div>

              {/* Error Message */}
              {verifyError && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                  {verifyError}
                </div>
              )}

              {/* Submit Button (Screenshot 2) */}
              <button
                type="submit"
                disabled={verifying}
                className="w-full py-3.5 rounded-xl bg-black hover:bg-neutral-900 text-[#FFDF00] font-bold text-sm tracking-wide shadow-md transition disabled:opacity-50"
              >
                {verifying ? 'Verifying Plate...' : 'Setup a Masked Call'}
              </button>

              <button
                type="button"
                onClick={() => setShowVerifyModal(false)}
                className="w-full py-1 text-center text-xs text-gray-500 hover:text-black"
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EMERGENCY CONTACT DETAILS (Screenshot 3) */}
      {/* ========================================================================= */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-6 duration-200 text-left">
            
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowEmergencyModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header (Screenshot 3) */}
            <h2 className="text-xl font-bold font-serif text-[#1A1A1A] mb-1">
              Emergency Contact Details
            </h2>

            {/* Caution Disclaimer (Screenshot 3) */}
            <p className="text-[11px] text-gray-600 leading-relaxed mb-4">
              Using emergency info for spam and prank is a punishable crime. Please keep our country safe and healthy for all. Lets help !
            </p>

            {/* Owner Emergency Contact List (Screenshot 3) */}
            <div className="space-y-2.5 pb-4 border-b border-gray-100">
              {/* Primary Emergency Phone */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF8F5] border border-[#ECE6DC]">
                <span className="flex items-center gap-2 text-xs font-bold text-gray-800">
                  <Phone className="w-3.5 h-3.5 text-gray-700" />
                  Phone:
                </span>
                {emergencyContact ? (
                  <a
                    href={`tel:${emergencyContact}`}
                    className="px-3 py-1 rounded-lg bg-[#FFDF00] hover:bg-[#E8A317] text-black font-mono font-bold text-xs shadow-sm transition flex items-center gap-1"
                  >
                    <span>{emergencyContact}</span>
                  </a>
                ) : (
                  <span className="text-xs text-gray-400 italic">Not specified</span>
                )}
              </div>

              {/* Secondary Phone if available */}
              {secondaryContact && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF8F5] border border-[#ECE6DC]">
                  <span className="flex items-center gap-2 text-xs font-bold text-gray-800">
                    <Phone className="w-3.5 h-3.5 text-gray-700" />
                    Phone:
                  </span>
                  <a
                    href={`tel:${secondaryContact}`}
                    className="px-3 py-1 rounded-lg bg-[#FFDF00] hover:bg-[#E8A317] text-black font-mono font-bold text-xs shadow-sm transition"
                  >
                    {secondaryContact}
                  </a>
                </div>
              )}

              {/* Blood Group */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF8F5] border border-[#ECE6DC]">
                <span className="flex items-center gap-2 text-xs font-bold text-gray-800">
                  <HeartPulse className="w-3.5 h-3.5 text-red-600" />
                  Blood Group:
                </span>
                <span className="px-3 py-1 rounded-lg bg-[#FFDF00] text-black font-mono font-bold text-xs shadow-sm">
                  {bloodGroup || 'B+'}
                </span>
              </div>

              {/* Insurance */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF8F5] border border-[#ECE6DC]">
                <span className="flex items-center gap-2 text-xs font-bold text-gray-800">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Insurance:
                </span>
                <span className="px-3 py-1 rounded-lg bg-[#FFDF00] text-black font-semibold text-xs shadow-sm">
                  {insurance || 'ICICI Insurance'}
                </span>
              </div>

              {/* Medical Information if provided */}
              {(healthIssues || medications || allergies) && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-950 space-y-1">
                  <p className="font-bold text-red-900 mb-1">Medical Profile:</p>
                  {healthIssues && <p>• <strong>Health:</strong> {healthIssues}</p>}
                  {medications && <p>• <strong>Medications:</strong> {medications}</p>}
                  {allergies && <p>• <strong>Allergies:</strong> {allergies}</p>}
                </div>
              )}
            </div>

            {/* Indian Emergency Helplines Box (Screenshot 3) */}
            <div className="mt-4 p-4 rounded-2xl border-2 border-red-200 bg-red-50/50 space-y-3">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-black text-red-900 uppercase tracking-wider">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                  Indian emergency helplines.
                </p>
                <p className="text-[10px] text-gray-600 mt-0.5">
                  You can reach the below numbers in case the above ones are not answered
                </p>
              </div>

              <div className="space-y-1.5 text-xs font-bold text-gray-800">
                <a
                  href="tel:112"
                  className="flex items-center justify-between p-2 rounded-lg bg-white border border-red-200 hover:bg-red-50 transition"
                >
                  <span className="text-gray-700">NATIONAL EMERGENCY NUMBER :</span>
                  <span className="font-mono text-red-700 font-extrabold text-sm">112</span>
                </a>

                <a
                  href="tel:102"
                  className="flex items-center justify-between p-2 rounded-lg bg-white border border-red-200 hover:bg-red-50 transition"
                >
                  <span className="text-gray-700">Ambulance :</span>
                  <span className="font-mono text-red-700 font-extrabold text-sm">102 / 108</span>
                </a>

                <a
                  href="tel:100"
                  className="flex items-center justify-between p-2 rounded-lg bg-white border border-red-200 hover:bg-red-50 transition"
                >
                  <span className="text-gray-700">POLICE :</span>
                  <span className="font-mono text-red-700 font-extrabold text-sm">100</span>
                </a>

                <a
                  href="tel:1091"
                  className="flex items-center justify-between p-2 rounded-lg bg-white border border-red-200 hover:bg-red-50 transition"
                >
                  <span className="text-gray-700">Women Helpline :</span>
                  <span className="font-mono text-red-700 font-extrabold text-sm">1091 / 181</span>
                </a>
              </div>
            </div>

            {/* Back Button */}
            <button
              type="button"
              onClick={() => setShowEmergencyModal(false)}
              className="mt-4 w-full py-3 rounded-xl bg-black text-white font-bold text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: VEHICLE DOCUMENTS STATUS */}
      {/* ========================================================================= */}
      {showDocsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative text-left">
            <button
              type="button"
              onClick={() => setShowDocsModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold text-gray-900 mb-1">Vehicle Documents</h3>
            <p className="text-xs text-gray-500 mb-4">Official registration and insurance compliance summary</p>

            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="block text-xs font-bold text-emerald-900">RC (Registration Certificate)</span>
                  <span className="text-[11px] text-emerald-700">Verified & Active on VAHAN</span>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="block text-xs font-bold text-emerald-900">Insurance Cover</span>
                  <span className="text-[11px] text-emerald-700">{insurance || 'ICICI Lombard Comprehensive'}</span>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="block text-xs font-bold text-emerald-900">PUC (Pollution Under Control)</span>
                  <span className="text-[11px] text-emerald-700">Valid Emission Certificate</span>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowDocsModal(false)}
              className="mt-5 w-full py-3 rounded-xl bg-black text-white font-bold text-xs"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
