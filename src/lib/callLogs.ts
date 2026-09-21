import fs from 'fs';
import path from 'path';
import { createAdminServerClient } from '@/lib/supabase/server';

export interface CallLog {
  id: string;
  car_id: string;
  owner_id?: string | null;
  caller_phone?: string | null;
  caller_ip: string;
  reason: string;
  call_sid?: string | null;
  status: string;
  is_spam?: boolean;
  reported_at?: string | null;
  created_at: string;
  car_nickname?: string;
  car_plate?: string;
}

export interface BlockedIP {
  ip: string;
  reason: string;
  spam_count: number;
  blocked_until: string;
  created_at: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const CALL_LOGS_FILE = path.join(DATA_DIR, 'call_logs.json');
const BLOCKED_IPS_FILE = path.join(DATA_DIR, 'blocked_ips.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readLocalCallLogs(): CallLog[] {
  ensureDataDir();
  if (!fs.existsSync(CALL_LOGS_FILE)) return [];
  try {
    const raw = fs.readFileSync(CALL_LOGS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeLocalCallLogs(logs: CallLog[]) {
  ensureDataDir();
  fs.writeFileSync(CALL_LOGS_FILE, JSON.stringify(logs, null, 2));
}

function readLocalBlockedIPs(): BlockedIP[] {
  ensureDataDir();
  if (!fs.existsSync(BLOCKED_IPS_FILE)) return [];
  try {
    const raw = fs.readFileSync(BLOCKED_IPS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeLocalBlockedIPs(ips: BlockedIP[]) {
  ensureDataDir();
  fs.writeFileSync(BLOCKED_IPS_FILE, JSON.stringify(ips, null, 2));
}

/**
 * Saves a new call audit log.
 */
export async function saveCallLog(logData: {
  car_id: string;
  owner_id?: string | null;
  caller_phone?: string | null;
  caller_ip: string;
  reason: string;
  call_sid?: string | null;
  status: string;
  car_nickname?: string;
  car_plate?: string;
}): Promise<CallLog> {
  const id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const newLog: CallLog = {
    id,
    ...logData,
    is_spam: false,
    reported_at: null,
    created_at: new Date().toISOString()
  };

  // 1. Try Supabase
  try {
    const supabase = createAdminServerClient();
    const { data, error } = await supabase
      .from('call_logs')
      .insert({
        car_id: logData.car_id,
        owner_id: logData.owner_id || null,
        caller_phone: logData.caller_phone || null,
        caller_ip: logData.caller_ip,
        reason: logData.reason,
        call_sid: logData.call_sid || null,
        status: logData.status,
        is_spam: false,
        created_at: newLog.created_at
      })
      .select('id')
      .single();

    if (!error && data?.id) {
      newLog.id = data.id;
    }
  } catch (err) {
    console.warn('[CallLogs] Supabase write failed, falling back to local JSON:', err);
  }

  // 2. Always maintain local cache
  const local = readLocalCallLogs();
  local.unshift(newLog);
  // Keep last 1000 logs
  if (local.length > 1000) local.length = 1000;
  writeLocalCallLogs(local);

  return newLog;
}

/**
 * Returns only the single most recent call for an owner's vehicles.
 */
export async function getLastCallForOwner(ownerId: string): Promise<CallLog | null> {
  // 1. Try Supabase
  try {
    const supabase = createAdminServerClient();
    const { data: cars } = await supabase
      .from('cars')
      .select('id, nickname, plate_number')
      .eq('owner_id', ownerId);

    if (cars && cars.length > 0) {
      const carIds = cars.map(c => c.id);
      const { data: logs, error } = await supabase
        .from('call_logs')
        .select('*')
        .in('car_id', carIds)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && logs && logs.length > 0) {
        const found = logs[0];
        const car = cars.find(c => c.id === found.car_id);
        return {
          ...found,
          car_nickname: car?.nickname || 'Vehicle',
          car_plate: car?.plate_number || 'N/A'
        };
      }
    }
  } catch (err) {
    console.warn('[CallLogs] Supabase query for last call failed, falling back to local JSON:', err);
  }

  // 2. Local Fallback
  const local = readLocalCallLogs();
  const userLog = local.find(l => l.owner_id === ownerId);
  return userLog || null;
}

/**
 * Returns all call logs for admin studio audit.
 */
export async function getAllCallLogs(limit = 50): Promise<CallLog[]> {
  try {
    const supabase = createAdminServerClient();
    const { data: logs, error } = await supabase
      .from('call_logs')
      .select('*, cars(nickname, plate_number)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!error && logs) {
      return logs.map((l: any) => ({
        ...l,
        car_nickname: l.cars?.nickname || 'Vehicle',
        car_plate: l.cars?.plate_number || 'N/A'
      }));
    }
  } catch (err) {
    console.warn('[CallLogs] Supabase getAllCallLogs failed:', err);
  }

  return readLocalCallLogs().slice(0, limit);
}

/**
 * Reports a call as spam and evaluates the 30-day 4-strike threshold for automatic IP blocking.
 */
export async function reportCallSpam(logId: string, ownerId: string): Promise<{
  success: boolean;
  isBlocked: boolean;
  spamCount: number;
  blockedUntil?: string;
}> {
  let targetLog: CallLog | null = null;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // 1. Update Supabase
  try {
    const supabase = createAdminServerClient();
    // Verify log belongs to owner
    const { data: log } = await supabase
      .from('call_logs')
      .select('*')
      .eq('id', logId)
      .single();

    if (log && log.owner_id === ownerId) {
      targetLog = log;
      await supabase
        .from('call_logs')
        .update({
          is_spam: true,
          reported_at: now.toISOString()
        })
        .eq('id', logId);
    }
  } catch (err) {
    console.warn('[CallLogs] Supabase reportCallSpam error:', err);
  }

  // 2. Local JSON update
  const local = readLocalCallLogs();
  const localIdx = local.findIndex(l => l.id === logId);
  if (localIdx !== -1) {
    local[localIdx].is_spam = true;
    local[localIdx].reported_at = now.toISOString();
    writeLocalCallLogs(local);
    if (!targetLog) targetLog = local[localIdx];
  }

  if (!targetLog) {
    throw new Error('Call log not found or unauthorized');
  }

  const callerIp = targetLog.caller_ip;

  // 3. Count spam reports for this IP in the past 30 days
  let spamCount = 0;
  try {
    const supabase = createAdminServerClient();
    const { count } = await supabase
      .from('call_logs')
      .select('id', { count: 'exact', head: true })
      .eq('caller_ip', callerIp)
      .eq('is_spam', true)
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (count !== null) {
      spamCount = count;
    }
  } catch {
    // Count from local
    spamCount = local.filter(
      l => l.caller_ip === callerIp && l.is_spam && new Date(l.created_at) >= thirtyDaysAgo
    ).length;
  }

  let isBlocked = false;
  let blockedUntil: string | undefined;

  // 4. Threshold check: 4+ spam reports in 30 days => Ban for 30 days
  if (spamCount >= 4) {
    isBlocked = true;
    const expiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    blockedUntil = expiry.toISOString();

    const blockRecord: BlockedIP = {
      ip: callerIp,
      reason: `${spamCount} spam reports within 30 days`,
      spam_count: spamCount,
      blocked_until: blockedUntil,
      created_at: now.toISOString()
    };

    // Save block to Supabase
    try {
      const supabase = createAdminServerClient();
      await supabase.from('blocked_ips').upsert(blockRecord);
    } catch (err) {
      console.warn('[CallLogs] Failed to save blocked IP to Supabase:', err);
    }

    // Save block to local
    const localBlocked = readLocalBlockedIPs();
    const existingIdx = localBlocked.findIndex(b => b.ip === callerIp);
    if (existingIdx !== -1) {
      localBlocked[existingIdx] = blockRecord;
    } else {
      localBlocked.push(blockRecord);
    }
    writeLocalBlockedIPs(localBlocked);

    console.log(`[Anti-Spam Alert] IP ${callerIp} automatically BLOCKED until ${blockedUntil} (Spam reports: ${spamCount})`);
  }

  return {
    success: true,
    isBlocked,
    spamCount,
    blockedUntil
  };
}

/**
 * Checks if an IP is currently blocked.
 */
export async function isIPBlocked(ip: string): Promise<boolean> {
  const cleanIp = ip.trim();
  const now = new Date();

  // 1. Try Supabase
  try {
    const supabase = createAdminServerClient();
    const { data: block } = await supabase
      .from('blocked_ips')
      .select('*')
      .eq('ip', cleanIp)
      .single();

    if (block) {
      if (new Date(block.blocked_until) > now) {
        return true;
      }
      // Block expired, clean up
      await supabase.from('blocked_ips').delete().eq('ip', cleanIp);
    }
  } catch {
    // Ignore and check local
  }

  // 2. Local Fallback
  const localBlocked = readLocalBlockedIPs();
  const found = localBlocked.find(b => b.ip === cleanIp);
  if (found) {
    if (new Date(found.blocked_until) > now) {
      return true;
    }
    // Remove expired
    writeLocalBlockedIPs(localBlocked.filter(b => b.ip !== cleanIp));
  }

  return false;
}

/**
 * Returns all currently blocked IPs for admin view.
 */
export async function getBlockedIPs(): Promise<BlockedIP[]> {
  const now = new Date();
  try {
    const supabase = createAdminServerClient();
    const { data } = await supabase
      .from('blocked_ips')
      .select('*')
      .gte('blocked_until', now.toISOString())
      .order('created_at', { ascending: false });

    if (data) return data;
  } catch {
    // fallback
  }

  const local = readLocalBlockedIPs();
  return local.filter(b => new Date(b.blocked_until) > now);
}

/**
 * Unblocks an IP address (Admin action).
 */
export async function unblockIP(ip: string): Promise<boolean> {
  const cleanIp = ip.trim();
  try {
    const supabase = createAdminServerClient();
    await supabase.from('blocked_ips').delete().eq('ip', cleanIp);
  } catch {
    // fallback
  }

  const local = readLocalBlockedIPs();
  writeLocalBlockedIPs(local.filter(b => b.ip !== cleanIp));
  return true;
}
