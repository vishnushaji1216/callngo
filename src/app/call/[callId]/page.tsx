'use client';

import { use, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useWebRTCCall } from '@/hooks/useWebRTCCall';
import { Phone, Mic, MicOff, PhoneOff, ShieldCheck, AlertCircle } from 'lucide-react';

export default function OwnerCallPage({ params }: { params: Promise<{ callId: string }> }) {
  const resolvedParams = use(params);
  const callId = resolvedParams.callId;

  const searchParams = useSearchParams();
  const initialAction = searchParams.get('action'); // 'accept' or 'decline'

  const [carId, setCarId] = useState<string>('c9b1a8f0-1234-5678-9abc-def012345678');
  const [carNickname, setCarNickname] = useState<string>('Blue Swift');

  const {
    status,
    isMuted,
    formattedDuration,
    errorMessage,
    remoteAudioRef,
    acceptCall,
    declineCall,
    hangUp,
    toggleMute
  } = useWebRTCCall({
    carId,
    role: 'owner',
    initialCallId: callId,
    carNickname
  });

  // Automatically execute action if passed via query params from Push Notification click
  useEffect(() => {
    if (initialAction === 'accept') {
      acceptCall(callId);
    } else if (initialAction === 'decline') {
      declineCall(callId);
    }
  }, [initialAction, callId]);

  return (
    <main className="min-h-screen bg-[#F8F5EE] text-[#2C1A12] flex flex-col items-center justify-center p-4 selection:bg-[#D4A254] selection:text-[#160f0b]">
      {/* Hidden Audio Element for WebRTC remote stream */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div className="w-full max-w-md bg-white border border-[#E4DCD0] rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col items-center text-center relative overflow-hidden">
        
        {/* Glow Effects */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#D4A254]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#4A2E20]/5 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#B5822B] mb-6">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          CallNGo Incoming Alert
        </div>

        {/* Car Icon */}
        <div className="w-20 h-20 rounded-full bg-[#FAF6EE] border border-[#E4DCD0] flex items-center justify-center mb-4 text-3xl shadow-inner">
          🚗
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-[#2C1A12] mb-2 font-serif">
          Someone is near your {carNickname}
        </h1>

        <p className="text-xs text-[#7A6657] mb-8">
          Caller is attempting to reach you securely without seeing your phone number.
        </p>

        {/* Error Messages */}
        {errorMessage && (
          <div className="w-full bg-red-50 border border-red-200 text-red-900 text-sm p-4 rounded-xl mb-6 flex items-start gap-2.5 text-left">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-950">Error answering call</p>
              <p className="mt-0.5 text-xs text-red-700">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Call States */}

        {/* State: INCOMING / IDLE */}
        {(status === 'idle' || status === 'incoming') && (
          <div className="w-full py-4 flex flex-col items-center gap-6">
            <p className="text-sm font-semibold text-[#B5822B] animate-pulse font-serif">
              Incoming Voice Call...
            </p>

            <div className="flex items-center justify-center gap-6 w-full">
              <button
                onClick={() => declineCall(callId)}
                className="flex-1 py-4 rounded-2xl bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 font-semibold text-base transition flex items-center justify-center gap-2"
              >
                <PhoneOff className="w-5 h-5" />
                Decline
              </button>

              <button
                onClick={() => acceptCall(callId)}
                className="flex-1 py-4 rounded-2xl bg-[#4A2E20] hover:bg-[#3B2418] text-white font-semibold text-base transition shadow-lg shadow-[#4A2E20]/20 flex items-center justify-center gap-2 active:scale-95"
              >
                <Phone className="w-5 h-5 text-[#D4A254]" />
                Accept
              </button>
            </div>
          </div>
        )}

        {/* State: REQUESTING MIC / CONNECTING */}
        {(status === 'requesting_mic' || status === 'connecting') && (
          <div className="py-6 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-[#4A2E20] border-t-transparent rounded-full animate-spin" />
            <p className="text-[#6E5A4C] text-sm animate-pulse">Connecting call...</p>
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

        {/* State: ENDED / DECLINED */}
        {(status === 'ended' || status === 'declined') && (
          <div className="w-full py-6 flex flex-col items-center gap-3">
            <p className="text-lg font-semibold text-[#6E5A4C]">
              {status === 'declined' ? 'Call Declined' : 'Call Ended'}
            </p>
            <a
              href="/"
              className="px-6 py-3 rounded-xl bg-[#4A2E20] hover:bg-[#3B2418] text-white font-medium text-sm transition"
            >
              Return to Dashboard
            </a>
          </div>
        )}
      </div>
    </main>

  );
}
