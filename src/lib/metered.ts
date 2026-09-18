export interface RTCIceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export async function fetchMeteredIceServers(): Promise<RTCIceServerConfig[]> {
  const meteredDomain = process.env.METERED_DOMAIN;
  const meteredSecretKey = process.env.METERED_SECRET_KEY;

  const defaultStun: RTCIceServerConfig = {
    urls: 'stun:stun.l.google.com:19302'
  };

  if (!meteredDomain || !meteredSecretKey) {
    console.warn('Metered credentials missing. Falling back to default STUN server.');
    return [defaultStun];
  }

  try {
    const response = await fetch(
      `https://${meteredDomain}/api/v1/turn/credentials?apiKey=${meteredSecretKey}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      console.error('Failed to fetch Metered TURN credentials:', response.statusText);
      return [defaultStun];
    }

    const iceServers = await response.json();
    if (Array.isArray(iceServers) && iceServers.length > 0) {
      return [defaultStun, ...iceServers];
    }

    return [defaultStun];
  } catch (error) {
    console.error('Error fetching Metered TURN credentials:', error);
    return [defaultStun];
  }
}
