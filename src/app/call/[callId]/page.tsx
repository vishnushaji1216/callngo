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

  const [carId, setCarId] = useState<string>('demo-car-id');
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
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      {/* Hidden Audio Element for WebRTC remote stream */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
        
        {/* Glow Effects */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400 mb-6">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          CallNGo Incoming Alert
        </div>

        {/* Car Icon */}
        <div className="w-20 h-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mb-4 text-3xl shadow-inner">
          🚗
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">
          Someone is near your {carNickname}
        </h1>

        <p className="text-xs text-slate-400 mb-8">
          Caller is attempting to reach you securely without seeing your phone number.
        </p>

        {/* Error Messages */}
        {errorMessage && (
          <div className="w-full bg-red-950/80 border border-red-500/40 text-red-200 text-sm p-4 rounded-xl mb-6 flex items-start gap-2.5 text-left">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-100">Error answering call</p>
              <p className="mt-0.5 text-xs text-red-300">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Call States */}

        {/* State: INCOMING / IDLE */}
        {(status === 'idle' || status === 'incoming') && (
          <div className="w-full py-4 flex flex-col items-center gap-6">
            <p className="text-sm font-semibold text-emerald-400 animate-pulse">
              Incoming Voice Call...
            </p>

            <div className="flex items-center justify-center gap-6 w-full">
              <button
                onClick={() => declineCall(callId)}
                className="flex-1 py-4 rounded-2xl bg-red-950/80 border border-red-500/40 hover:bg-red-900/50 text-red-300 font-semibold text-base transition flex items-center justify-center gap-2"
              >
                <PhoneOff className="w-5 h-5" />
                Decline
              </button>

              <button
                onClick={() => acceptCall(callId)}
                className="flex-1 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-base transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-95"
              >
                <Phone className="w-5 h-5" />
                Accept
              </button>
            </div>
          </div>
        )}

        {/* State: REQUESTING MIC / CONNECTING */}
        {(status === 'requesting_mic' || status === 'connecting') && (
          <div className="py-6 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-300 text-sm animate-pulse">Connecting call...</p>
          </div>
        )}

        {/* State: CONNECTED */}
        {status === 'connected' && (
          <div className="w-full py-4 flex flex-col items-center gap-6">
            <div className="flex flex-col items-center gap-1">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider border border-emerald-500/30">
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
                    : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
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

        {/* State: ENDED / DECLINED */}
        {(status === 'ended' || status === 'declined') && (
          <div className="w-full py-6 flex flex-col items-center gap-3">
            <p className="text-lg font-semibold text-slate-300">
              {status === 'declined' ? 'Call Declined' : 'Call Ended'}
            </p>
            <a
              href="/"
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm transition"
            >
              Return to Dashboard
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
