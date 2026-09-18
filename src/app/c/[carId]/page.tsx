'use client';

import { use, useEffect, useState } from 'react';
import { useWebRTCCall } from '@/hooks/useWebRTCCall';
import { Phone, Mic, MicOff, PhoneOff, ShieldCheck, AlertCircle, Check, Hash } from 'lucide-react';
import { IOSInstallPrompt } from '@/components/iOSInstallPrompt';

export default function PublicCarPage({ params }: { params: Promise<{ carId: string }> }) {
  const resolvedParams = use(params);
  const carId = resolvedParams.carId;

  const [carNickname, setCarNickname] = useState<string>('Loading car details...');
  const [plateNumber, setPlateNumber] = useState<string>('');
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

  // Fetch public car details (id, nickname, plate_number)
  useEffect(() => {
    if (!carId) return;

    fetch(`/api/cars/${carId}/public`)
      .then((res) => {
        if (!res.ok) throw new Error('Car not found');
        return res.json();
      })
      .then((data) => {
        setCarNickname(data.nickname || 'Vehicle');
        setPlateNumber(data.plate_number || '');
        setLoadingCar(false);
      })
      .catch((err) => {
        console.error('Failed to load public car info:', err);
        setCarNickname('Vehicle');
        setLoadingCar(false);
      });
  }, [carId]);

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
          CALL N GO PRIVATE CALL
        </div>

        {/* Car Identity */}
        <div className="w-20 h-20 rounded-full bg-[#FAF6EE] border border-[#E4DCD0] flex items-center justify-center mb-4 text-3xl shadow-inner">
          🚗
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-[#2C1A12] mb-1 font-serif tracking-tight">
          {loadingCar ? 'Loading...' : carNickname}
        </h1>

        {/* Vehicle Plate Number Badge */}
        {plateNumber && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F4EFE6] border border-[#DCD3C1] text-[#4A2E20] text-xs font-mono font-bold mb-3">
            <Hash className="w-3.5 h-3.5 text-[#B5822B]" />
            Plate: {plateNumber}
          </div>
        )}

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF6EE] border border-[#DCD3C1] text-[#7A6657] text-xs font-semibold mb-6">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          Your number stays 100% private
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

