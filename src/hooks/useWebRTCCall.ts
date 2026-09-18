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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to fetch ICE servers from server
  const getIceServers = async (): Promise<RTCIceServer[]> => {
    try {
      const res = await fetch('/api/turn');
      const data = await res.json();
      return data.iceServers || [{ urls: 'stun:stun.l.google.com:19302' }];
    } catch (e) {
      console.warn('Failed to fetch turn servers, fallback to default STUN', e);
      return [{ urls: 'stun:stun.l.google.com:19302' }];
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
  }, []);

  // Broadcast signaling message helper
  const sendSignal = useCallback((payload: any) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'signal',
        payload
      });
    }
  }, []);

  // Initialize Realtime channel subscription
  useEffect(() => {
    if (!carId) return;

    const channelName = `call:${carId}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } }
    });

    channel
      .on('broadcast', { event: 'signal' }, async ({ payload }) => {
        if (!payload || !payload.callId) return;

        // Ignore messages for other calls if callId is already set
        if (callId && payload.callId !== callId && payload.type !== 'offer') {
          return;
        }

        const msgCallId = payload.callId;

        switch (payload.type) {
          case 'offer':
            if (role === 'owner' && (status === 'idle' || status === 'incoming')) {
              setCallId(msgCallId);
              setStatus('incoming');
              // Store offer SDP for accepting
              if (peerConnectionRef.current) {
                try {
                  await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                } catch (e) {
                  console.error('Error setting remote offer:', e);
                }
              }
            }
            break;

          case 'answer':
            if (role === 'caller' && payload.callId === callId) {
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
              }
              if (peerConnectionRef.current) {
                try {
                  await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                  setStatus('connected');
                } catch (e) {
                  console.error('Error setting remote answer:', e);
                }
              }
            }
            break;

          case 'ice-candidate':
            if (payload.callId === (callId || msgCallId) && payload.candidate) {
              if (peerConnectionRef.current) {
                try {
                  await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
                } catch (e) {
                  console.error('Error adding ICE candidate:', e);
                }
              }
            }
            break;

          case 'decline':
            if (payload.callId === callId) {
              setStatus('declined');
              cleanup();
            }
            break;

          case 'hangup':
            if (payload.callId === callId) {
              setStatus('ended');
              cleanup();
            }
            break;
        }
      })
      .subscribe((subStatus) => {
        if (subStatus === 'SUBSCRIBED') {
          console.log(`Subscribed to Realtime channel call:${carId}`);
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [carId, callId, role, status, cleanup]);

  // Duration Timer for connected state
  useEffect(() => {
    if (status === 'connected') {
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
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

  // Method 1: CALLER Starts Call
  const startCall = async () => {
    try {
      setErrorMessage(null);
      setStatus('requesting_mic');

      // 1. Request microphone permission
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;
      } catch (err: any) {
        setStatus('error');
        setErrorMessage('Microphone access is required to call the owner.');
        return;
      }

      // 2. Generate new callId UUID
      const newCallId = crypto.randomUUID();
      setCallId(newCallId);

      // 3. Get ICE Servers
      const iceServers = await getIceServers();

      // 4. Create RTCPeerConnection
      const pc = new RTCPeerConnection({ iceServers });
      peerConnectionRef.current = pc;

      // Add local audio tracks
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

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
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setStatus('connected');
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          setStatus('ended');
        }
      };

      // 5. Create SDP Offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: true
      });
      await pc.setLocalDescription(offer);

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

      // 8. 30-Second Timeout if owner doesn't answer
      timeoutRef.current = setTimeout(() => {
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
  const acceptCall = async (targetCallId?: string, remoteOfferSdp?: RTCSessionDescriptionInit) => {
    try {
      setErrorMessage(null);
      const activeCallId = targetCallId || callId;
      if (!activeCallId) return;

      setStatus('requesting_mic');

      // 1. Request microphone permission
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;
      } catch (err: any) {
        setStatus('error');
        setErrorMessage('Microphone access is required to answer the call.');
        return;
      }

      // 2. Get ICE Servers
      const iceServers = await getIceServers();

      // 3. Create PeerConnection if not existing
      let pc = peerConnectionRef.current;
      if (!pc) {
        pc = new RTCPeerConnection({ iceServers });
        peerConnectionRef.current = pc;
      }

      // Add local audio tracks
      stream.getTracks().forEach((track) => pc!.addTrack(track, stream));

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
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc!.connectionState === 'connected') {
          setStatus('connected');
        } else if (pc!.connectionState === 'failed' || pc!.connectionState === 'closed') {
          setStatus('ended');
        }
      };

      if (remoteOfferSdp && pc.signalingState !== 'stable') {
        await pc.setRemoteDescription(new RTCSessionDescription(remoteOfferSdp));
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
    } catch (err: any) {
      console.error('Error accepting call:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Failed to answer call');
    }
  };

  // Method 3: Decline Call
  const declineCall = (targetCallId?: string) => {
    const activeCallId = targetCallId || callId;
    if (activeCallId) {
      sendSignal({ type: 'decline', callId: activeCallId });
    }
    setStatus('declined');
    cleanup();
  };

  // Method 4: Hang Up Call
  const hangUp = () => {
    if (callId) {
      sendSignal({ type: 'hangup', callId });
    }
    setStatus('ended');
    cleanup();
  };

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
    callId,
    isMuted,
    duration,
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
