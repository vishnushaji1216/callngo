'use client';

import { use, useEffect, useState } from 'react';
import { useWebRTCCall } from '@/hooks/useWebRTCCall';
import { Phone, Mic, MicOff, PhoneOff, ShieldCheck, AlertCircle, Check, Hash, PhoneCall, HeartPulse, Sparkles, User, Mail, Lock, Car, Plus, LogIn } from 'lucide-react';
import { IOSInstallPrompt } from '@/components/iOSInstallPrompt';
import { supabase } from '@/lib/supabase/client';

export default function PublicCarPage({ params }: { params: Promise<{ carId: string }> }) {
  const resolvedParams = use(params);
  const carId = resolvedParams.carId;

  // Activation & Car Info States
  const [isActivated, setIsActivated] = useState<boolean | null>(null);
  const [carNickname, setCarNickname] = useState<string>('Loading vehicle...');
  const [modelNumber, setModelNumber] = useState<string>('');
  const [plateNumber, setPlateNumber] = useState<string>('');

  // Emergency & Medical Info
  const [emergencyContact, setEmergencyContact] = useState<string>('');
  const [bloodGroup, setBloodGroup] = useState<string>('');
  const [healthIssues, setHealthIssues] = useState<string>('');
  const [medications, setMedications] = useState<string>('');
  const [allergies, setAllergies] = useState<string>('');

  const [loadingCar, setLoadingCar] = useState<boolean>(true);
  const [selectedReason, setSelectedReason] = useState<string>('Please move your car');

  // Unclaimed Activation Form States
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authTab, setAuthTab] = useState<'signup' | 'signin'>('signup');
  const [fullName, setFullName] = useState<string>('');
  const [phoneNum, setPhoneNum] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [claimName, setClaimName] = useState<string>('');
  const [claimModel, setClaimModel] = useState<string>('');
  const [claimPlate, setClaimPlate] = useState<string>('');
  const [submittingClaim, setSubmittingClaim] = useState<boolean>(false);
  const [claimMessage, setClaimMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const {
    status,
    isMuted,
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

  const quickReasons = [
    'Please move your car',
    'Your headlight is on',
    'Accident emergency alert',
    'Your vehicle is in my way'
  ];

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
          setCarNickname(data.nickname || 'Vehicle');
          setModelNumber(data.model_number || '');
          setPlateNumber(data.plate_number || '');
          setEmergencyContact(data.emergency_contact || '');
          setBloodGroup(data.blood_group || '');
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
      }
    });

    fetchCarPublicDetails();
  }, [carId]);

  // Handle Unclaimed Sticker Activation Form Submit
  const handleActivateSticker = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingClaim(true);
      setClaimMessage(null);

      if (!claimName || !claimPlate) {
        throw new Error('Vehicle Name and License Plate are required');
      }

      let activeUserId = currentUser?.id;

      // 1. If user not logged in, authenticate/register first
      if (!activeUserId) {
        if (authTab === 'signup') {
          if (!fullName || !phoneNum || !email || !password) {
            throw new Error('Please complete your account registration details (Name, Phone, Email, Password)');
          }

          const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: fullName, phone_number: phoneNum }
            }
          });

          if (authError || !authData.user) {
            throw new Error(authError?.message || 'Account registration failed');
          }

          activeUserId = authData.user.id;
          setCurrentUser(authData.user);

          // Save Profile
          await supabase.from('profiles').upsert({
            id: activeUserId,
            full_name: fullName,
            phone_number: phoneNum
          });
        } else {
          // Sign In
          if (!email || !password) {
            throw new Error('Please enter your email and password to sign in');
          }

          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
          });

          if (authError || !authData.user) {
            throw new Error(authError?.message || 'Login failed');
          }

          activeUserId = authData.user.id;
          setCurrentUser(authData.user);
        }
      }

      // 2. Claim & Activate the pre-printed sticker ID
      const claimRes = await fetch(`/api/cars/${carId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: claimName,
          model_number: claimModel,
          plate_number: claimPlate,
          userId: activeUserId
        })
      });

      const claimData = await claimRes.json();
      if (!claimRes.ok) {
        throw new Error(claimData.error || 'Failed to activate sticker');
      }

      setClaimMessage({ type: 'success', text: '🎉 Sticker activated successfully!' });
      
      // Reload car state to show activated public caller page
      setTimeout(() => {
        fetchCarPublicDetails();
      }, 1000);

    } catch (err: any) {
      console.error('Sticker activation error:', err);
      setClaimMessage({ type: 'error', text: err.message || 'Activation failed' });
    } finally {
      setSubmittingClaim(false);
    }
  };

  if (loadingCar) {
    return (
      <main className="min-h-screen bg-[#F8F5EE] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#4A2E20] border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  // CASE 1: UNCLAIMED PRE-PRINTED STICKER ACTIVATION SCREEN
  if (isActivated === false) {
    return (
      <main className="min-h-screen bg-[#F8F5EE] text-[#2C1A12] flex flex-col items-center justify-center p-4 selection:bg-[#D4A254] selection:text-[#160f0b]">
        <div className="w-full max-w-lg bg-white border border-[#E4DCD0] rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col items-center text-center relative overflow-hidden">
          
          <div className="w-16 h-16 rounded-2xl bg-[#4A2E20] text-white flex items-center justify-center text-3xl mb-4 shadow-md">
            ✨
          </div>

          <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
            Unclaimed Vehicle Sticker
          </span>

          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-[#2C1A12] tracking-tight mb-2">
            Activate Your CallNGo QR Sticker
          </h1>

          <p className="text-xs text-[#7A6657] mb-6 max-w-sm">
            You scanned an unassigned sticker. Enter your vehicle details below to activate and link this QR code sticker to your account.
          </p>

          {/* System Messages */}
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
            
            {/* If NOT logged in, show Auth Tabs */}
            {!currentUser && (
              <div className="p-4 rounded-2xl bg-[#FAF6EE] border border-[#E4DCD0] space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-[#B5822B]">Step 1: Your Account</div>
                
                <div className="flex items-center p-1 rounded-xl bg-white border border-[#E4DCD0]">
                  <button
                    type="button"
                    onClick={() => setAuthTab('signup')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                      authTab === 'signup'
                        ? 'bg-[#4A2E20] text-white shadow-sm font-bold'
                        : 'text-[#7A6657] hover:text-[#2C1A12]'
                    }`}
                  >
                    New Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthTab('signin')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                      authTab === 'signin'
                        ? 'bg-[#4A2E20] text-white shadow-sm font-bold'
                        : 'text-[#7A6657] hover:text-[#2C1A12]'
                    }`}
                  >
                    Existing User Login
                  </button>
                </div>

                {authTab === 'signup' ? (
                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#4A3B32]">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#E4DCD0] text-[#2C1A12] text-xs focus:outline-none focus:border-[#B5822B]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#4A3B32]">Phone Number *</label>
                      <input
                        type="tel"
                        required
                        value={phoneNum}
                        onChange={(e) => setPhoneNum(e.target.value)}
                        placeholder="+91 9876543210"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#E4DCD0] text-[#2C1A12] text-xs focus:outline-none focus:border-[#B5822B]"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#4A3B32]">Email Address *</label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="john@example.com"
                          className="w-full px-3 py-2 rounded-xl bg-white border border-[#E4DCD0] text-[#2C1A12] text-xs focus:outline-none focus:border-[#B5822B]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#4A3B32]">Password *</label>
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3 py-2 rounded-xl bg-white border border-[#E4DCD0] text-[#2C1A12] text-xs focus:outline-none focus:border-[#B5822B]"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#4A3B32]">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#E4DCD0] text-[#2C1A12] text-xs focus:outline-none focus:border-[#B5822B]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#4A3B32]">Password *</label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#E4DCD0] text-[#2C1A12] text-xs focus:outline-none focus:border-[#B5822B]"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Vehicle Details Step */}
            <div className="p-4 rounded-2xl bg-[#FAF6EE] border border-[#E4DCD0] space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-[#B5822B]">
                {currentUser ? 'Enter Vehicle Details' : 'Step 2: Vehicle Details'}
              </div>

              {currentUser && (
                <p className="text-xs text-[#7A6657]">
                  Activating as: <strong className="text-[#2C1A12]">{currentUser.email}</strong>
                </p>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-[#4A3B32] mb-1">Vehicle Name *</label>
                <input
                  type="text"
                  required
                  value={claimName}
                  onChange={(e) => setClaimName(e.target.value)}
                  placeholder="e.g. Swift / City / Duke"
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E4DCD0] text-[#2C1A12] text-xs focus:outline-none focus:border-[#B5822B]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#4A3B32] mb-1">Model Number</label>
                  <input
                    type="text"
                    value={claimModel}
                    onChange={(e) => setClaimModel(e.target.value)}
                    placeholder="e.g. VXI 2022"
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E4DCD0] text-[#2C1A12] text-xs focus:outline-none focus:border-[#B5822B]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#4A3B32] mb-1">License Plate *</label>
                  <input
                    type="text"
                    required
                    value={claimPlate}
                    onChange={(e) => setClaimPlate(e.target.value)}
                    placeholder="e.g. KA 01 AB 1234"
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E4DCD0] text-[#2C1A12] text-xs focus:outline-none focus:border-[#B5822B]"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingClaim}
              className="w-full py-3.5 rounded-2xl bg-[#4A2E20] hover:bg-[#3B2418] text-white font-bold text-sm transition shadow-lg shadow-[#4A2E20]/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-[#D4A254]" />
              {submittingClaim ? 'Activating Sticker...' : 'Activate & Link Sticker Now'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // CASE 2: ACTIVATED STICKER - PUBLIC CALLER & EMERGENCY MEDICAL PAGE
  return (
    <main className="min-h-screen bg-[#F8F5EE] text-[#2C1A12] flex flex-col items-center justify-center p-4 selection:bg-[#D4A254] selection:text-[#160f0b]">
      {/* Hidden Audio Element for WebRTC remote stream */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div className="w-full max-w-md bg-white border border-[#E4DCD0] rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col items-center text-center relative overflow-hidden">
        
        {/* Glow Decorative Header element */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#D4A254]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#4A2E20]/5 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#B5822B] mb-6 font-mono">
          <ShieldCheck className="w-4 h-4 text-[#B5822B]" />
          CALL N GO VEHICLE & EMERGENCY CARD
        </div>

        {/* Vehicle Icon */}
        <div className="w-20 h-20 rounded-full bg-[#FAF6EE] border border-[#E4DCD0] flex items-center justify-center mb-4 text-3xl shadow-inner">
          🚗
        </div>

        {/* Vehicle Name & Model */}
        <h1 className="text-2xl sm:text-3xl font-bold text-[#2C1A12] mb-1 font-serif tracking-tight">
          {loadingCar ? 'Loading...' : carNickname}
        </h1>

        {modelNumber && (
          <p className="text-xs text-[#7A6657] font-semibold mb-2">
            Model: {modelNumber}
          </p>
        )}

        {/* Vehicle Plate Number Badge */}
        {plateNumber && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F4EFE6] border border-[#DCD3C1] text-[#4A2E20] text-xs font-mono font-bold mb-4">
            <Hash className="w-3.5 h-3.5 text-[#B5822B]" />
            Plate: {plateNumber}
          </div>
        )}

        {/* EMERGENCY / ACCIDENT MEDICAL CARD */}
        {(emergencyContact || bloodGroup || healthIssues || medications || allergies) && (
          <div className="w-full bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 text-left space-y-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-red-200/80 pb-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-red-900 uppercase tracking-wider">
                <HeartPulse className="w-4 h-4 text-red-600" />
                Emergency & Medical Card
              </span>

              {bloodGroup && (
                <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white font-mono font-bold text-xs">
                  🩸 {bloodGroup}
                </span>
              )}
            </div>

            {emergencyContact && (
              <div className="flex items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-red-200">
                <div>
                  <span className="block text-[10px] font-bold uppercase text-red-700">Emergency Family Contact</span>
                  <span className="text-xs font-mono font-bold text-[#2C1A12]">{emergencyContact}</span>
                </div>
                <a
                  href={`tel:${emergencyContact}`}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm"
                >
                  <PhoneCall className="w-3 h-3" />
                  Call
                </a>
              </div>
            )}

            {(healthIssues || medications || allergies) && (
              <div className="space-y-1 text-xs text-red-950 pt-1">
                {healthIssues && <p><strong>Health Issues:</strong> {healthIssues}</p>}
                {medications && <p><strong>Medications:</strong> {medications}</p>}
                {allergies && <p><strong>Allergies:</strong> {allergies}</p>}
              </div>
            )}
          </div>
        )}

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF6EE] border border-[#DCD3C1] text-[#7A6657] text-xs font-semibold mb-6">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          Owner phone number remains private
        </div>

        <IOSInstallPrompt />

        {/* Quick Reasons Chips */}
        {status === 'idle' && (
          <div className="w-full mb-6 space-y-2 text-left">
            <label className="block text-xs font-semibold text-[#6E5A4C]">Reason for calling (optional):</label>
            <div className="grid grid-cols-1 gap-1.5">
              {quickReasons.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setSelectedReason(reason)}
                  className={`px-3.5 py-2.5 rounded-xl text-xs text-left font-medium transition flex items-center justify-between border ${
                    selectedReason === reason
                      ? 'bg-[#4A2E20] text-white border-[#4A2E20] font-bold shadow-md'
                      : 'bg-[#FAF6EE] text-[#4A3B32] border-[#E4DCD0] hover:border-[#B5822B]/60'
                  }`}
                >
                  <span>• {reason}</span>
                  {selectedReason === reason && <Check className="w-3.5 h-3.5 shrink-0 text-[#D4A254]" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error Messages */}
        {(errorMessage || status === 'error') && (
          <div className="w-full bg-red-50 border border-red-200 text-red-900 text-sm p-4 rounded-2xl mb-6 flex items-start gap-2.5 text-left">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-950">Microphone access required</p>
              <p className="mt-0.5 text-xs text-red-700">
                {errorMessage || 'Microphone access is required to call the owner.'}
              </p>
            </div>
          </div>
        )}

        {/* Call States Display */}

        {/* State: IDLE */}
        {status === 'idle' && (
          <button
            onClick={startCall}
            disabled={loadingCar}
            className="w-full py-4 px-6 rounded-2xl bg-[#4A2E20] hover:bg-[#3B2418] active:scale-[0.98] transition-all duration-200 font-bold text-white shadow-lg shadow-[#4A2E20]/20 flex items-center justify-center gap-3 text-lg disabled:opacity-50"
          >
            <Phone className="w-5 h-5 text-[#D4A254]" />
            Contact Owner Now
          </button>
        )}

        {/* State: REQUESTING MIC */}
        {status === 'requesting_mic' && (
          <div className="py-6 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-[#4A2E20] border-t-transparent rounded-full animate-spin" />
            <p className="text-[#6E5A4C] text-sm animate-pulse">Requesting microphone access...</p>
          </div>
        )}

        {/* State: CALLING */}
        {status === 'calling' && (
          <div className="w-full py-6 flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-[#D4A254]/20 flex items-center justify-center animate-ping absolute inset-0" />
              <div className="w-16 h-16 rounded-full bg-[#4A2E20] flex items-center justify-center relative shadow-lg shadow-[#4A2E20]/30">
                <Phone className="w-8 h-8 text-[#D4A254] animate-bounce" />
              </div>
            </div>
            <p className="text-xl font-bold text-[#4A2E20] animate-pulse font-serif">Calling Owner...</p>
            <p className="text-xs text-[#7A6657]">Waiting up to 30 seconds for answer</p>

            <button
              onClick={hangUp}
              className="mt-4 px-6 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 text-sm font-semibold transition"
            >
              Cancel Call
            </button>
          </div>
        )}

        {/* State: CONNECTING */}
        {status === 'connecting' && (
          <div className="py-6 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-[#4A2E20] border-t-transparent rounded-full animate-spin" />
            <p className="text-[#6E5A4C] text-sm">Connecting voice call...</p>
          </div>
        )}

        {/* State: CONNECTED */}
        {status === 'connected' && (
          <div className="w-full py-4 flex flex-col items-center gap-6">
            <div className="flex flex-col items-center gap-1">
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold uppercase tracking-wider border border-emerald-300">
                Connected
              </span>
              <span className="text-3xl font-mono font-bold text-[#2C1A12] mt-2">
                {formattedDuration}
              </span>
            </div>

            {/* In-Call Controls */}
            <div className="flex items-center justify-center gap-6 w-full">
              <button
                onClick={toggleMute}
                className={`w-14 h-14 rounded-full flex items-center justify-center border transition ${
                  isMuted
                    ? 'bg-amber-100 border-amber-400 text-amber-800'
                    : 'bg-[#FAF6EE] border-[#E4DCD0] text-[#2C1A12] hover:bg-[#F4EFE6]'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

              <button
                onClick={hangUp}
                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg shadow-red-600/30 transition active:scale-95"
                title="Hang Up"
              >
                <PhoneOff className="w-7 h-7" />
              </button>
            </div>
          </div>
        )}

        {/* State: UNREACHABLE */}
        {status === 'unreachable' && (
          <div className="w-full py-6 flex flex-col items-center gap-3">
            <p className="text-xl font-bold text-[#4A2E20]">Owner is not reachable.</p>
            <p className="text-xs text-[#7A6657] mb-2">No response received within 30 seconds.</p>
            <button
              onClick={startCall}
              className="px-6 py-3 rounded-xl bg-[#4A2E20] hover:bg-[#3B2418] text-white font-bold text-sm transition"
            >
              Try Again
            </button>
          </div>
        )}

        {/* State: DECLINED */}
        {status === 'declined' && (
          <div className="w-full py-6 flex flex-col items-center gap-3">
            <p className="text-xl font-bold text-red-600">Call Declined</p>
            <p className="text-xs text-[#7A6657] mb-2">The owner is currently unavailable.</p>
            <button
              onClick={startCall}
              className="px-6 py-3 rounded-xl bg-[#FAF6EE] hover:bg-[#F4EFE6] text-[#2C1A12] font-semibold text-sm border border-[#E4DCD0] transition"
            >
              Call Again
            </button>
          </div>
        )}

        {/* State: ENDED */}
        {status === 'ended' && (
          <div className="w-full py-6 flex flex-col items-center gap-3">
            <p className="text-lg font-semibold text-[#6E5A4C]">Call Ended</p>
            <button
              onClick={startCall}
              className="px-6 py-3 rounded-xl bg-[#4A2E20] hover:bg-[#3B2418] text-white font-bold text-sm transition"
            >
              New Call
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
