'use client';

import { use, useEffect, useState } from 'react';
import { useWebRTCCall } from '@/hooks/useWebRTCCall';
import { Phone, Mic, MicOff, PhoneOff, ShieldCheck, AlertCircle, Car, Check } from 'lucide-react';
import { IOSInstallPrompt } from '@/components/iOSInstallPrompt';

export default function PublicCarPage({ params }: { params: Promise<{ carId: string }> }) {
  const resolvedParams = use(params);
  const carId = resolvedParams.carId;

  const [carNickname, setCarNickname] = useState<string>('Loading car details...');
  const [loadingCar, setLoadingCar] = useState<boolean>(true);
  const [selectedReason, setSelectedReason] = useState<string>('Please move your car');

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
    'Call in case of accident',
    'Your vehicle is in my way'
  ];

  // Fetch ONLY public car details (id + nickname)
  useEffect(() => {
    if (!carId) return;

    fetch(`/api/cars/${carId}/public`)
      .then((res) => {
        if (!res.ok) throw new Error('Car not found');
        return res.json();
      })
      .then((data) => {
        setCarNickname(data.nickname || 'Blue Swift');
        setLoadingCar(false);
      })
      .catch((err) => {
        console.error('Failed to load public car info:', err);
        setCarNickname('Blue Swift');
        setLoadingCar(false);
      });
  }, [carId]);

  return (
    <main className="min-h-screen bg-[#160f0b] text-[#f4efe6] flex flex-col items-center justify-center p-4 selection:bg-[#d4a254] selection:text-[#160f0b]">
      {/* Hidden Audio Element for WebRTC remote stream */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div className="w-full max-w-md bg-[#2b1812] border border-[#3e241b] rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
        
        {/* Glow Header Decorative element */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#d4a254]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#d4a254]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#d4a254] mb-6 font-mono">
          <ShieldCheck className="w-4 h-4 text-[#d4a254]" />
          CALL N GO PRIVATE CALL
        </div>

        {/* Car Identity */}
        <div className="w-20 h-20 rounded-full bg-[#1b0e09] border border-[#d4a254]/30 flex items-center justify-center mb-4 text-3xl shadow-inner">
          🚗
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 font-serif tracking-tight">
          {loadingCar ? 'Loading...' : carNickname}
        </h1>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1b0e09] border border-[#d4a254]/40 text-[#d4a254] text-xs font-semibold mb-6">
          <ShieldCheck className="w-3.5 h-3.5" />
          Your number stays 100% private
        </div>

        <IOSInstallPrompt />

        {/* Quick Reasons Chips */}
        {status === 'idle' && (
          <div className="w-full mb-6 space-y-2 text-left">
            <label className="block text-xs font-semibold text-[#d8cfc4]">Reason for calling (optional):</label>
            <div className="grid grid-cols-1 gap-1.5">
              {quickReasons.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setSelectedReason(reason)}
                  className={`px-3.5 py-2 rounded-xl text-xs text-left font-medium transition flex items-center justify-between border ${
                    selectedReason === reason
                      ? 'bg-[#d4a254] text-[#160f0b] border-[#d4a254] font-bold shadow-md'
                      : 'bg-[#1b0e09] text-[#e2dacd] border-[#3e241b] hover:border-[#d4a254]/40'
                  }`}
                >
                  <span>• {reason}</span>
                  {selectedReason === reason && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error Messages */}
        {(errorMessage || status === 'error') && (
          <div className="w-full bg-red-950/80 border border-red-500/40 text-red-200 text-sm p-4 rounded-xl mb-6 flex items-start gap-2.5 text-left">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-100">Microphone access required</p>
              <p className="mt-0.5 text-xs text-red-300">
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
            className="w-full py-4 px-6 rounded-2xl bg-[#d4a254] hover:bg-[#c59343] active:scale-[0.98] transition-all duration-200 font-bold text-[#160f0b] shadow-lg shadow-[#d4a254]/20 flex items-center justify-center gap-3 text-lg disabled:opacity-50"
          >
            <Phone className="w-5 h-5" />
            Contact Owner Now
          </button>
        )}

        {/* State: REQUESTING MIC */}
        {status === 'requesting_mic' && (
          <div className="py-6 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-[#d4a254] border-t-transparent rounded-full animate-spin" />
            <p className="text-[#e2dacd] text-sm animate-pulse">Requesting microphone access...</p>
          </div>
        )}

        {/* State: CALLING */}
        {status === 'calling' && (
          <div className="w-full py-6 flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-[#d4a254]/20 flex items-center justify-center animate-ping absolute inset-0" />
              <div className="w-16 h-16 rounded-full bg-[#d4a254] flex items-center justify-center relative shadow-lg shadow-[#d4a254]/30">
                <Phone className="w-8 h-8 text-[#160f0b] animate-bounce" />
              </div>
            </div>
            <p className="text-xl font-bold text-[#d4a254] animate-pulse font-serif">Calling Owner...</p>
            <p className="text-xs text-[#d8cfc4]">Waiting up to 30 seconds for answer</p>

            <button
              onClick={hangUp}
              className="mt-4 px-6 py-2.5 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 hover:bg-red-900/50 text-sm font-medium transition"
            >
              Cancel Call
            </button>
          </div>
        )}

        {/* State: CONNECTING */}
        {status === 'connecting' && (
          <div className="py-6 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-[#d4a254] border-t-transparent rounded-full animate-spin" />
            <p className="text-[#e2dacd] text-sm">Connecting voice call...</p>
          </div>
        )}

        {/* State: CONNECTED */}
        {status === 'connected' && (
          <div className="w-full py-4 flex flex-col items-center gap-6">
            <div className="flex flex-col items-center gap-1">
              <span className="px-3 py-1 rounded-full bg-[#d4a254]/20 text-[#d4a254] text-xs font-semibold uppercase tracking-wider border border-[#d4a254]/30">
                Connected
              </span>
              <span className="text-3xl font-mono font-bold text-white mt-2">
                {formattedDuration}
              </span>
            </div>

            {/* In-Call Controls */}
            <div className="flex items-center justify-center gap-6 w-full">
              <button
                onClick={toggleMute}
                className={`w-14 h-14 rounded-full flex items-center justify-center border transition ${
                  isMuted
                    ? 'bg-amber-600/20 border-amber-500 text-amber-400'
                    : 'bg-[#1b0e09] border-[#3e241b] text-[#f4efe6] hover:bg-[#2b1812]'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

              <button
                onClick={hangUp}
                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-600/30 transition active:scale-95"
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
            <p className="text-xl font-bold text-[#d4a254]">Owner is not reachable.</p>
            <p className="text-xs text-[#d8cfc4] mb-2">No response received within 30 seconds.</p>
            <button
              onClick={startCall}
              className="px-6 py-3 rounded-xl bg-[#d4a254] hover:bg-[#c59343] text-[#160f0b] font-bold text-sm transition"
            >
              Try Again
            </button>
          </div>
        )}

        {/* State: DECLINED */}
        {status === 'declined' && (
          <div className="w-full py-6 flex flex-col items-center gap-3">
            <p className="text-xl font-bold text-red-400">Call Declined</p>
            <p className="text-xs text-[#d8cfc4] mb-2">The owner is currently unavailable.</p>
            <button
              onClick={startCall}
              className="px-6 py-3 rounded-xl bg-[#1b0e09] hover:bg-[#2b1812] text-white font-medium text-sm border border-[#3e241b] transition"
            >
              Call Again
            </button>
          </div>
        )}

        {/* State: ENDED */}
        {status === 'ended' && (
          <div className="w-full py-6 flex flex-col items-center gap-3">
            <p className="text-lg font-semibold text-[#e2dacd]">Call Ended</p>
            <button
              onClick={startCall}
              className="px-6 py-3 rounded-xl bg-[#d4a254] hover:bg-[#c59343] text-[#160f0b] font-bold text-sm transition"
            >
              New Call
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
