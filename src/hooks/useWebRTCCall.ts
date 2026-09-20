import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

export type CallStatus =
  | 'idle'
  | 'requesting_mic'
  | 'calling'
  | 'incoming'
  | 'connecting'
  | 'connected'
  | 'declined'
  | 'unreachable'
  | 'ended'
  | 'error';

export interface UseWebRTCCallProps {
  carId: string;
  role: 'caller' | 'owner';
  initialCallId?: string;
  carNickname?: string;
}

export function useWebRTCCall({ carId, role, initialCallId, carNickname }: UseWebRTCCallProps) {
  const [status, setStatus] = useState<CallStatus>('idle');
  const [callId, setCallId] = useState<string>(initialCallId || '');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const channelRef = useRef<any>(null);
  const carChannelRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hangUpRef = useRef<() => void>(() => {});
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const localOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const remoteOfferRef = useRef<RTCSessionDescriptionInit | null>(null);

  // Optimized low-latency audio constraints for clear voice calls & echo cancellation
  const getAudioConstraints = (): MediaTrackConstraints => ({
    echoCancellation: { ideal: true },
    noiseSuppression: { ideal: true },
    autoGainControl: { ideal: true },
    channelCount: { ideal: 1 }
  });

  // Helper to fetch ICE servers with low-latency STUN redundancy
  const getIceServers = async (): Promise<RTCIceServer[]> => {
    const fallbackStuns: RTCIceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' }
    ];

    try {
      const res = await fetch('/api/turn');
      const data = await res.json();
      return data.iceServers && data.iceServers.length > 0 ? data.iceServers : fallbackStuns;
    } catch (e) {
      console.warn('Failed to fetch turn servers, fallback to redundant STUNs', e);
      return fallbackStuns;
    }
  };

  // Helper to clean up connection and media
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    pendingCandidatesRef.current = [];
    localOfferRef.current = null;
    remoteOfferRef.current = null;
  }, []);

  // Broadcast signaling message helper over both active callId channel & carId channel
  const sendSignal = useCallback((payload: any) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'signal',
        payload
      });
    }
    if (carChannelRef.current) {
      carChannelRef.current.send({
        type: 'broadcast',
        event: 'signal',
        payload
      });
    }
  }, []);

  // Helper to drain buffered ICE candidates
  const drainIceCandidates = async (pc: RTCPeerConnection) => {
    while (pendingCandidatesRef.current.length > 0) {
      const candidate = pendingCandidatesRef.current.shift();
      if (candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Error adding drained candidate:', e);
        }
      }
    }
  };

  // Signal Message Handler for both callId & carId channels
  const handleSignalMessage = useCallback(async (payload: any) => {
    if (!payload || !payload.callId) return;

    const msgCallId = payload.callId;

    switch (payload.type) {
      case 'owner-ready':
        if (role === 'caller' && localOfferRef.current) {
          sendSignal({
            type: 'offer',
            callId: msgCallId,
            sdp: localOfferRef.current
          });
        }
        break;

      case 'request-offer':
        if (role === 'caller' && localOfferRef.current) {
          sendSignal({
            type: 'offer',
            callId: msgCallId,
            sdp: localOfferRef.current
          });
        }
        break;

      case 'offer':
        if (role === 'owner') {
          setCallId(msgCallId);
          remoteOfferRef.current = payload.sdp;
          if (peerConnectionRef.current && peerConnectionRef.current.signalingState === 'stable') {
            try {
              await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
              await drainIceCandidates(peerConnectionRef.current);
            } catch (e) {
              console.error('Error setting remote offer:', e);
            }
          }
          setStatus('incoming');
        }
        break;

      case 'answer':
        if (role === 'caller') {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          if (peerConnectionRef.current) {
            try {
              await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
              await drainIceCandidates(peerConnectionRef.current);
              setStatus('connected');
            } catch (e) {
              console.error('Error setting remote answer:', e);
            }
          }
        }
        break;

      case 'ice-candidate':
        if (payload.candidate) {
          if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
            try {
              await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch (e) {
              console.error('Error adding ICE candidate:', e);
            }
          } else {
            pendingCandidatesRef.current.push(payload.candidate);
          }
        }
        break;

      case 'decline':
        setStatus('declined');
        cleanup();
        break;

      case 'hangup':
        setStatus('ended');
        cleanup();
        break;
    }
  }, [role, sendSignal, cleanup]);

  // Initialize Realtime channel subscriptions for BOTH callId AND carId
  useEffect(() => {
    const activeId = callId || initialCallId;

    // 1. Subscribe to specific callId channel if active
    let channel: any = null;
    if (activeId) {
      const channelName = `call:${activeId}`;
      channel = supabase.channel(channelName, {
        config: { broadcast: { self: false } }
      });

      channel
        .on('broadcast', { event: 'signal' }, ({ payload }: { payload: any }) => handleSignalMessage(payload))
        .subscribe((subStatus: string) => {
          if (subStatus === 'SUBSCRIBED' && role === 'owner') {
            channel.send({
              type: 'broadcast',
              event: 'signal',
              payload: { type: 'owner-ready', callId: activeId }
            });
          }
        });

      channelRef.current = channel;
    }

    // 2. Subscribe to carId channel
    let carChannel: any = null;
    if (carId) {
      carChannel = supabase.channel(`call:${carId}`, {
        config: { broadcast: { self: false } }
      });

      carChannel
        .on('broadcast', { event: 'signal' }, ({ payload }: { payload: any }) => handleSignalMessage(payload))
        .subscribe();

      carChannelRef.current = carChannel;
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (carChannel) supabase.removeChannel(carChannel);
    };
  }, [carId, callId, initialCallId, role, handleSignalMessage]);

  const MAX_CALL_DURATION = 59; // Enforce maximum 59 seconds per call

  // Duration Timer for connected state with 59-second auto-disconnect
  useEffect(() => {
    if (status === 'connected') {
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          if (prev >= MAX_CALL_DURATION - 1) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            // Auto hang up at 59 seconds
            hangUpRef.current();
            return MAX_CALL_DURATION;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [status]);

  // Format duration mm:ss
  const formattedDuration = `${Math.floor(duration / 60)
    .toString()
    .padStart(2, '0')}:${(duration % 60).toString().padStart(2, '0')}`;
  
  const remainingSeconds = Math.max(0, MAX_CALL_DURATION - duration);

  // Method 1: CALLER Starts Call
  const startCall = async () => {
    try {
      setErrorMessage(null);
      setStatus('requesting_mic');

      // 1. Request microphone permission with strict acoustic echo cancellation & low latency
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: getAudioConstraints(),
          video: false
        });
        localStreamRef.current = stream;
      } catch (err: any) {
        setStatus('error');
        setErrorMessage('Microphone access is required to call the owner.');
        return;
      }

      // 2. Generate new callId UUID
      const newCallId = crypto.randomUUID();
      setCallId(newCallId);

      // 3. Get ICE Servers with low-latency configuration
      const iceServers = await getIceServers();

      // 4. Create RTCPeerConnection with bundled policy & ICE pool
      const pc = new RTCPeerConnection({
        iceServers,
        iceCandidatePoolSize: 10,
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
      });
      peerConnectionRef.current = pc;

      // Add local audio tracks & enforce constraints
      stream.getAudioTracks().forEach((track) => {
        if (track.applyConstraints) {
          track.applyConstraints(getAudioConstraints()).catch(() => {});
        }
        pc.addTrack(track, stream);
      });

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal({
            type: 'ice-candidate',
            callId: newCallId,
            candidate: event.candidate
          });
        }
      };

      // Handle Remote Stream
      pc.ontrack = (event) => {
        if (remoteAudioRef.current && event.streams[0]) {
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.play().catch((e) => console.warn('Audio play error:', e));
        }
        setStatus('connected');
      };

      const handleConnectionChange = () => {
        const cState = pc.connectionState;
        const iceState = pc.iceConnectionState;
        if (cState === 'connected' || iceState === 'connected' || iceState === 'completed') {
          setStatus('connected');
        } else if (cState === 'failed' || iceState === 'failed' || cState === 'closed') {
          setStatus('ended');
        }
      };

      pc.onconnectionstatechange = handleConnectionChange;
      pc.oniceconnectionstatechange = handleConnectionChange;

      // 5. Create SDP Offer
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      localOfferRef.current = offer;

      // 6. Send Push Notification to owner
      fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carId, callId: newCallId })
      }).catch((e) => console.error('Failed to trigger push alert:', e));

      // 7. Send Realtime Offer
      sendSignal({
        type: 'offer',
        callId: newCallId,
        sdp: offer
      });

      setStatus('calling');

      // Periodic offer re-broadcast while waiting for owner to answer
      const offerInterval = setInterval(() => {
        if (pc.connectionState !== 'connected' && localOfferRef.current) {
          sendSignal({
            type: 'offer',
            callId: newCallId,
            sdp: localOfferRef.current
          });
        } else {
          clearInterval(offerInterval);
        }
      }, 1500);

      // 8. 30-Second Timeout if owner doesn't answer
      timeoutRef.current = setTimeout(() => {
        clearInterval(offerInterval);
        if (peerConnectionRef.current && peerConnectionRef.current.connectionState !== 'connected') {
          setStatus('unreachable');
          cleanup();
        }
      }, 30000);

    } catch (err: any) {
      console.error('Error starting call:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Call initialization failed');
    }
  };

  // Method 2: OWNER Accepts Call
  const acceptCall = async (targetCallId?: string) => {
    try {
      setErrorMessage(null);
      const activeCallId = targetCallId || callId || initialCallId;
      if (!activeCallId) return;

      setStatus('requesting_mic');

      // 1. Request microphone permission with strict acoustic echo cancellation & low latency
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: getAudioConstraints(),
          video: false
        });
        localStreamRef.current = stream;
      } catch (err: any) {
        setStatus('error');
        setErrorMessage('Microphone access is required to answer the call.');
        return;
      }

      // 2. Get ICE Servers with low-latency configuration
      const iceServers = await getIceServers();

      // 3. Create PeerConnection with bundled policy & ICE pool
      const pc = new RTCPeerConnection({
        iceServers,
        iceCandidatePoolSize: 10,
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
      });
      peerConnectionRef.current = pc;

      // Add local audio tracks & enforce constraints
      stream.getAudioTracks().forEach((track) => {
        if (track.applyConstraints) {
          track.applyConstraints(getAudioConstraints()).catch(() => {});
        }
        pc.addTrack(track, stream);
      });

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal({
            type: 'ice-candidate',
            callId: activeCallId,
            candidate: event.candidate
          });
        }
      };

      // Handle Remote Stream
      pc.ontrack = (event) => {
        if (remoteAudioRef.current && event.streams[0]) {
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.play().catch((e) => console.warn('Audio play error:', e));
        }
        setStatus('connected');
      };

      const handleConnectionChange = () => {
        const cState = pc.connectionState;
        const iceState = pc.iceConnectionState;
        if (cState === 'connected' || iceState === 'connected' || iceState === 'completed') {
          setStatus('connected');
        } else if (cState === 'failed' || iceState === 'failed' || cState === 'closed') {
          setStatus('ended');
        }
      };

      pc.onconnectionstatechange = handleConnectionChange;
      pc.oniceconnectionstatechange = handleConnectionChange;

      // Request offer if not yet received
      if (!remoteOfferRef.current) {
        sendSignal({ type: 'request-offer', callId: activeCallId });
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      if (remoteOfferRef.current) {
        await pc.setRemoteDescription(new RTCSessionDescription(remoteOfferRef.current));
        await drainIceCandidates(pc);
      }

      // 4. Create Answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // 5. Send Answer Signal
      sendSignal({
        type: 'answer',
        callId: activeCallId,
        sdp: answer
      });

      setStatus('connecting');

      // Auto-transition to connected once descriptions are set & candidates exchange
      setTimeout(() => {
        if (pc.remoteDescription && pc.localDescription && pc.signalingState === 'stable') {
          setStatus('connected');
        }
      }, 800);

    } catch (err: any) {
      console.error('Error accepting call:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Failed to answer call');
    }
  };

  // Method 3: Decline Call
  const declineCall = (targetCallId?: string) => {
    const activeCallId = targetCallId || callId || initialCallId;
    if (activeCallId) {
      sendSignal({ type: 'decline', callId: activeCallId });
    }
    setStatus('declined');
    cleanup();
  };

  // Method 4: Hang Up Call
  const hangUp = () => {
    const activeCallId = callId || initialCallId;
    if (activeCallId) {
      sendSignal({ type: 'hangup', callId: activeCallId });
    }
    setStatus('ended');
    cleanup();
  };
  hangUpRef.current = hangUp;

  // Method 5: Toggle Mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const nextMute = !isMuted;
        audioTracks[0].enabled = !nextMute;
        setIsMuted(nextMute);
      }
    }
  };

  return {
    status,
    callId: callId || initialCallId,
    isMuted,
    duration,
    remainingSeconds,
    maxDuration: MAX_CALL_DURATION,
    formattedDuration,
    errorMessage,
    remoteAudioRef,
    startCall,
    acceptCall,
    declineCall,
    hangUp,
    toggleMute
  };
}
