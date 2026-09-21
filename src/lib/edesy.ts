/**
 * Edesy Voice Masking API Client
 * Base URL: https://voice-api.edesy.in/v1
 */

const EDESY_BASE_URL = 'https://voice-api.edesy.in/v1';

/**
 * Normalize Indian phone numbers to 10-digit mobile format
 * Removes +91, 91, 0, spaces, dashes
 */
export function normalizeIndianPhone(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length > 10) {
    return digits.slice(-10);
  }
  return digits;
}

export interface InitiateCallParams {
  partyA: string; // Caller / Visitor 10-digit mobile
  partyB: string; // Vehicle Owner 10-digit mobile
  maxDurationSec?: number; // Capped at 59s
}

export interface EdesyCallResponse {
  call_sid: string;
  status: string;
  party_a: string;
  party_b: string;
  masked_number: string;
}

export interface EdesyCallStatusResponse {
  id: string;
  jambonz_call_sid?: string;
  caller_number: string;
  target_number: string;
  masked_number: string;
  direction: string;
  status: 'initiated' | 'ringing' | 'answered' | 'in-progress' | 'completed' | 'failed' | 'no-answer';
  started_at?: string;
  answered_at?: string;
  ended_at?: string;
  duration_sec?: number;
  price?: number;
  hangup_cause?: string;
  recording_url?: string;
}

/**
 * Initiates an outbound telecom masked call bridging Party A and Party B.
 */
export async function initiateMaskedCall({
  partyA,
  partyB,
  maxDurationSec = 59
}: InitiateCallParams): Promise<EdesyCallResponse> {
  const apiKey = process.env.EDESY_API_KEY;
  if (!apiKey || apiKey === 'vp_YOUR_API_KEY_HERE') {
    throw new Error('EDESY_API_KEY is not configured in .env.local');
  }

  const cleanPartyA = normalizeIndianPhone(partyA);
  const cleanPartyB = normalizeIndianPhone(partyB);

  if (cleanPartyA.length !== 10) {
    throw new Error('Party A (caller) must be a valid 10-digit mobile number.');
  }

  if (cleanPartyB.length !== 10) {
    throw new Error('Party B (owner) must be a valid 10-digit mobile number.');
  }

  if (cleanPartyA === cleanPartyB) {
    throw new Error('Caller phone and vehicle owner phone cannot be the same number.');
  }

  const res = await fetch(`${EDESY_BASE_URL}/masking/calls`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      party_a: cleanPartyA,
      party_b: cleanPartyB,
      max_duration_sec: maxDurationSec
    })
  });

  const json = await res.json();

  if (!res.ok) {
    const errorMsg = json?.error?.message || `Edesy API error (${res.status})`;
    throw new Error(errorMsg);
  }

  return json.data;
}

/**
 * Polls the current live status of an ongoing masked call.
 */
export async function getMaskedCallStatus(callSid: string): Promise<EdesyCallStatusResponse> {
  const apiKey = process.env.EDESY_API_KEY;
  if (!apiKey || apiKey === 'vp_YOUR_API_KEY_HERE') {
    throw new Error('EDESY_API_KEY is not configured in .env.local');
  }

  const res = await fetch(`${EDESY_BASE_URL}/masking/calls/${callSid}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json?.error?.message || 'Call status not found');
  }

  return json.data;
}

/**
 * Checks current wallet balance on Edesy.
 */
export interface EdesyBillingResponse {
  balance: number;
  currency: string;
}

export interface EdesyUsageStats {
  total_sessions: number;
  active_sessions: number;
  total_mappings: number;
  total_calls: number;
  total_minutes: number;
  total_cost: number;
  answered_calls: number;
  failed_calls: number;
}

export async function getWalletBalance(): Promise<EdesyBillingResponse> {
  const apiKey = process.env.EDESY_API_KEY;
  if (!apiKey || apiKey === 'vp_YOUR_API_KEY_HERE') {
    throw new Error('EDESY_API_KEY is not configured');
  }

  const res = await fetch(`${EDESY_BASE_URL}/masking/billing`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    },
    cache: 'no-store'
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || 'Failed to fetch billing info');
  return json.data;
}

/**
 * Retrieves aggregate usage statistics from Edesy.
 */
export async function getUsageStats(startDate?: string, endDate?: string): Promise<EdesyUsageStats> {
  const apiKey = process.env.EDESY_API_KEY;
  if (!apiKey || apiKey === 'vp_YOUR_API_KEY_HERE') {
    throw new Error('EDESY_API_KEY is not configured');
  }

  let url = `${EDESY_BASE_URL}/masking/stats`;
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    },
    cache: 'no-store'
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || 'Failed to fetch usage stats');
  return json.data;
}
