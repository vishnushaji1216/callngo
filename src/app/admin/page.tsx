'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, Lock, Mail, Plus, Printer, LogOut, Copy, Check, RefreshCw, Unlink, Sparkles, Car, CheckCircle2, AlertCircle, Eye, EyeOff, Wallet, ExternalLink, PhoneCall } from 'lucide-react';
import Link from 'next/link';
import { QRStickerCard } from '@/components/QRStickerCard';

export interface Sticker {
  id: string;
  owner_id: string | null;
  nickname: string | null;
  model_number: string | null;
  plate_number: string | null;
  activated_at: string | null;
  created_at: string;
}

export default function AdminPage() {
  // Auth state
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showAdminPassword, setShowAdminPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  // Dashboard state
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [quantity, setQuantity] = useState<number>(5);
  const [generating, setGenerating] = useState<boolean>(false);
  const [filter, setFilter] = useState<'all' | 'unclaimed' | 'claimed'>('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [origin, setOrigin] = useState<string>('');

  // Edesy Voice Masking API States (Wallet & Call Metrics)
  const [edesyLoading, setEdesyLoading] = useState<boolean>(false);
  const [edesyBilling, setEdesyBilling] = useState<{ balance: number; currency: string } | null>(null);
  const [edesyStats, setEdesyStats] = useState<{
    total_sessions: number;
    active_sessions: number;
    total_mappings: number;
    total_calls: number;
    total_minutes: number;
    total_cost: number;
    answered_calls: number;
    failed_calls: number;
  } | null>(null);
  const [edesyError, setEdesyError] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    const sessionAuth = sessionStorage.getItem('callngo_admin_logged_in');
    if (sessionAuth === 'true') {
      setIsAdminLoggedIn(true);
      fetchStickers();
      fetchEdesyData();
    } else {
      setLoading(false);
    }
  }, []);

  // Handle Admin Login
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    const cleanEmail = emailInput.trim().toLowerCase();
    const cleanPassword = passwordInput.trim();

    // Valid email admingmail.com or admin@gmail.com and pass 1234
    if ((cleanEmail === 'admin@gmail.com' || cleanEmail === 'admingmail.com') && cleanPassword === '1234') {
      setIsAdminLoggedIn(true);
      sessionStorage.setItem('callngo_admin_logged_in', 'true');
      fetchStickers();
      fetchEdesyData();
    } else {
      setAuthError('Invalid admin email or password. (Hint: admin@gmail.com / 1234)');
    }
  };

  const handleLogOut = () => {
    sessionStorage.removeItem('callngo_admin_logged_in');
    setIsAdminLoggedIn(false);
  };

  // Fetch all stickers from API
  const fetchStickers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/qrs?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch stickers');
      setStickers(data.cars || []);
    } catch (err: any) {
      console.error('Error fetching admin stickers:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to load stickers' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch Edesy wallet balance and usage stats
  const fetchEdesyData = async () => {
    try {
      setEdesyLoading(true);
      setEdesyError(null);
      const res = await fetch(`/api/admin/edesy?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      });
      const data = await res.json();
      if (!res.ok && !data.billing && !data.stats) {
        throw new Error(data.error || 'Failed to fetch Edesy data');
      }
      if (data.billing) setEdesyBilling(data.billing);
      if (data.stats) setEdesyStats(data.stats);
      if (data.billingError && !data.billing) setEdesyError(data.billingError);
    } catch (err: any) {
      console.warn('Error fetching Edesy data:', err);
      setEdesyError(err.message || 'Unable to connect to Edesy API');
    } finally {
      setEdesyLoading(false);
    }
  };

  // Batch generate QR stickers
  const handleGenerateQRs = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setGenerating(true);
      setMessage(null);

      const res = await fetch('/api/admin/qrs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate stickers');

      setMessage({ type: 'success', text: `Successfully generated ${data.count} new pre-printed physical QR code stickers!` });
      await fetchStickers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to generate QR stickers' });
    } finally {
      setGenerating(false);
    }
  };

  // Force delink a sticker back to unclaimed
  const handleDelinkSticker = async (carId: string) => {
    if (!confirm('Are you sure you want to force-delink this sticker? It will return to the unclaimed pool.')) return;
    try {
      setMessage(null);
      const res = await fetch(`/api/admin/qrs/${carId}/delink`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delink sticker');

      // Optimistically update local state so the table immediately shows it as unclaimed
      setStickers((prev) =>
        prev.map((s) =>
          s.id === carId
            ? { ...s, owner_id: null, nickname: null, model_number: null, plate_number: null, activated_at: null }
            : s
        )
      );

      setMessage({ type: 'success', text: 'Sticker force-delinked successfully. Vehicle details removed and QR is now in the unclaimed pool.' });
      await fetchStickers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to delink sticker' });
    }
  };

  const handlePrintSheet = () => {
    window.print();
  };

  // Filtered stickers list
  const filteredStickers = stickers.filter((s) => {
    if (filter === 'unclaimed') return s.owner_id === null;
    if (filter === 'claimed') return s.owner_id !== null;
    return true;
  });

  const unclaimedCount = stickers.filter((s) => s.owner_id === null).length;
  const claimedCount = stickers.filter((s) => s.owner_id !== null).length;

  // 1. ADMIN LOGIN FORM
  if (!isAdminLoggedIn) {
    return (
      <main className="min-h-screen bg-[#F8F5EE] text-[#2C1A12] flex items-center justify-center p-4 selection:bg-[#D4A254] selection:text-[#160f0b]">
        <div className="w-full max-w-md bg-white border border-[#E4DCD0] rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#4A2E20] text-[#D4A254] flex items-center justify-center text-2xl mb-4 shadow-md">
            <Lock className="w-8 h-8 text-[#D4A254]" />
          </div>

          <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
            CallNGo Administrator
          </span>

          <h1 className="text-2xl font-bold font-serif text-[#2C1A12] tracking-tight mb-2">
            Admin Portal Access
          </h1>
          <p className="text-xs text-[#7A6657] mb-6">
            Log in to generate, manage, and print physical QR code stickers for marketing & distribution.
          </p>

          {authError && (
            <div className="w-full p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs mb-4 text-left flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="w-full text-left space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#4A3B32] mb-1">Admin Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#7A6657] absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="admin@gmail.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-[#E4DCD0] text-[#2C1A12] text-sm focus:outline-none focus:border-[#B5822B]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4A3B32] mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#7A6657] absolute left-3 top-3" />
                <input
                  type={showAdminPassword ? 'text' : 'password'}
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-white border border-[#E4DCD0] text-[#2C1A12] text-sm focus:outline-none focus:border-[#B5822B]"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                  className="absolute right-3 top-2.5 p-1 text-[#7A6657] hover:text-[#2C1A12] transition"
                  title={showAdminPassword ? 'Hide password' : 'Show password'}
                  aria-label={showAdminPassword ? 'Hide password' : 'Show password'}
                >
                  {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-[#4A2E20] hover:bg-[#3B2418] text-white font-bold text-sm transition shadow-lg shadow-[#4A2E20]/20 flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-[#D4A254]" />
              Log In to Admin Portal
            </button>
          </form>
        </div>
      </main>
    );
  }

  // 2. ADMIN DASHBOARD
  return (
    <main className="min-h-screen bg-[#F8F5EE] text-[#2C1A12] p-4 sm:p-8 flex flex-col items-center selection:bg-[#D4A254] selection:text-[#160f0b]">
      {/* Print Styles Sheet: Formats all selected QR cards into physical printable cards without clipping */}
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 6mm;
        }
        @media print {
          html, body {
            background: white !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          .printable-sheet, .printable-sheet * {
            visibility: visible;
          }
          .printable-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
          }
          .printable-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 3.4in) !important;
            gap: 0.2in !important;
            justify-content: center !important;
            margin: 0 auto !important;
          }
          .printable-grid > div {
            padding: 0 !important;
            margin: 0 !important;
            display: flex !important;
            justify-content: center !important;
            overflow: visible !important;
          }
          .printable-grid > div > div {
            transform: none !important;
          }
          .printable-card {
            width: 3.4in !important;
            min-width: 3.4in !important;
            max-width: 3.4in !important;
            height: 2.18in !important;
            min-height: 2.18in !important;
            max-height: 2.18in !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-shadow: none !important;
            border: 1px solid #382016 !important;
            border-radius: 12px !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="w-full max-w-6xl space-y-6">

        {/* Header Navigation */}
        <header className="no-print flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-[#E4DCD0] p-6 rounded-3xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#4A2E20] flex items-center justify-center text-white text-xl font-bold shadow-md">
              👑
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#2C1A12] tracking-tight font-serif">Admin Physical QR Code Studio</h1>
              <p className="text-xs text-[#6E5A4C]">
                Batch generate, print, and track physical CallNGo vehicle stickers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-3.5 py-2 rounded-xl bg-[#FAF6EE] hover:bg-[#F4EFE6] text-xs font-semibold text-[#4A2E20] border border-[#E4DCD0] transition"
            >
              ← Home
            </Link>

            <button
              onClick={handleLogOut}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-red-50 text-red-700 text-xs font-semibold border border-red-200 transition flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5 text-red-600" />
              Log Out Admin
            </button>
          </div>
        </header>

        {/* System Messages */}
        {message && (
          <div
            className={`no-print p-4 rounded-2xl border text-sm flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* EDESY TELECOM WALLET & CALL METRICS */}
        <section className="no-print bg-white border border-[#E4DCD0] p-6 rounded-3xl space-y-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4DCD0] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#FAF6EE] border border-[#E4DCD0] flex items-center justify-center text-[#B5822B] shadow-xs shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#2C1A12] font-serif flex items-center gap-2 flex-wrap">
                  <span>Edesy Number Masking API & Wallet</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-mono font-bold uppercase">
                    voice-api.edesy.in
                  </span>
                </h2>
                <p className="text-xs text-[#7A6657] mt-0.5">
                  Live prepaid wallet balance & call usage metrics for masked private calling.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={fetchEdesyData}
                disabled={edesyLoading}
                className="px-3.5 py-2 rounded-xl bg-[#FAF6EE] hover:bg-[#F2ECE1] border border-[#E4DCD0] text-[#4A2E20] text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${edesyLoading ? 'animate-spin' : ''}`} />
                <span>{edesyLoading ? 'Checking...' : 'Refresh Balance'}</span>
              </button>

              <a
                href="https://masking.edesy.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-[#4A2E20] hover:bg-[#3B2418] text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
              >
                <span>Top Up Wallet</span>
                <ExternalLink className="w-3 h-3 text-[#D4A254]" />
              </a>
            </div>
          </div>

          {edesyError && !edesyBilling && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Status: {edesyError}. Check `EDESY_API_KEY` in `.env.local`.</span>
            </div>
          )}

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* Box 1: Prepaid Balance */}
            <div className="p-4 rounded-2xl bg-[#FAF6EE] border border-[#E4DCD0] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-[#7A6657] uppercase tracking-wider">Prepaid Balance</span>
                {edesyBilling && (
                  <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase ${
                    edesyBilling.balance < 5
                      ? 'bg-red-100 text-red-800 border border-red-300'
                      : edesyBilling.balance < 15
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}>
                    {edesyBilling.balance < 5 ? 'Low Balance' : 'Active'}
                  </span>
                )}
              </div>
              <div className="my-1">
                <div className="text-2xl font-black font-mono text-[#2C1A12]">
                  {edesyBilling ? `₹${Number(edesyBilling.balance).toFixed(2)}` : edesyLoading ? '...' : '₹0.00'}
                </div>
                <div className="text-[10.5px] text-[#7A6657] mt-0.5">
                  Billed at ₹1.50 / min
                </div>
              </div>
            </div>

            {/* Box 2: Total Calls Done */}
            <div className="p-4 rounded-2xl bg-white border border-[#E4DCD0] flex flex-col justify-between">
              <span className="text-[11px] font-bold text-[#7A6657] uppercase tracking-wider">Total Calls Done</span>
              <div className="my-1">
                <div className="text-2xl font-black font-mono text-[#4A2E20]">
                  {edesyStats ? edesyStats.total_calls : edesyLoading ? '...' : 0}
                </div>
                <div className="text-[10.5px] text-[#7A6657] mt-0.5">
                  Total calls initiated
                </div>
              </div>
            </div>

            {/* Box 3: Answered Calls */}
            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Answered Calls</span>
              <div className="my-1">
                <div className="text-2xl font-black font-mono text-emerald-900">
                  {edesyStats ? edesyStats.answered_calls : edesyLoading ? '...' : 0}
                </div>
                <div className="text-[10.5px] text-emerald-700 mt-0.5">
                  Successfully connected
                </div>
              </div>
            </div>

            {/* Box 4: Total Minutes */}
            <div className="p-4 rounded-2xl bg-white border border-[#E4DCD0] flex flex-col justify-between">
              <span className="text-[11px] font-bold text-[#7A6657] uppercase tracking-wider">Call Duration</span>
              <div className="my-1">
                <div className="text-2xl font-black font-mono text-[#2C1A12]">
                  {edesyStats ? `${Number(edesyStats.total_minutes).toFixed(1)}m` : edesyLoading ? '...' : '0m'}
                </div>
                <div className="text-[10.5px] text-[#7A6657] mt-0.5">
                  Total duration billed
                </div>
              </div>
            </div>

            {/* Box 5: Total Cost */}
            <div className="p-4 rounded-2xl bg-white border border-[#E4DCD0] flex flex-col justify-between">
              <span className="text-[11px] font-bold text-[#7A6657] uppercase tracking-wider">Total Cost</span>
              <div className="my-1">
                <div className="text-2xl font-black font-mono text-[#B5822B]">
                  {edesyStats ? `₹${Number(edesyStats.total_cost).toFixed(2)}` : edesyLoading ? '...' : '₹0.00'}
                </div>
                <div className="text-[10.5px] text-[#7A6657] mt-0.5">
                  Total telecom spend
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TOP STATS & BATCH GENERATOR */}
        <section className="no-print grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Box 1: Batch Generator Form */}
          <div className="md:col-span-2 bg-white border border-[#E4DCD0] p-6 rounded-3xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#E4DCD0] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#2C1A12] flex items-center gap-2 font-serif">
                  <Sparkles className="w-5 h-5 text-[#B5822B]" />
                  Batch Generate Physical QR Stickers
                </h2>
                <p className="text-xs text-[#7A6657] mt-0.5">
                  Generates N unassigned physical QR sticker IDs starting in unclaimed status (`owner_id = NULL`).
                </p>
              </div>
            </div>

            <form onSubmit={handleGenerateQRs} className="flex flex-col sm:flex-row items-end gap-3 pt-1">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-[#4A3B32] mb-1">Number of Stickers to Generate</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FAF6EE] border border-[#E4DCD0] text-[#2C1A12] text-sm font-bold focus:outline-none focus:border-[#B5822B]"
                />
              </div>

              <button
                type="submit"
                disabled={generating}
                className="px-6 py-2.5 rounded-xl bg-[#4A2E20] hover:bg-[#3B2418] text-white font-bold text-xs transition shadow-md flex items-center gap-2 disabled:opacity-50 shrink-0"
              >
                <Plus className="w-4 h-4 text-[#D4A254]" />
                {generating ? 'Generating...' : `Generate ${quantity} Physical QR Cards`}
              </button>
            </form>
          </div>

          {/* Box 2: Quick Stats & Print Sheet Action */}
          <div className="bg-white border border-[#E4DCD0] p-6 rounded-3xl space-y-4 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#B5822B] mb-3">
                Inventory Overview
              </h3>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded-2xl bg-[#FAF6EE] border border-[#E4DCD0]">
                  <span className="block text-2xl font-mono font-bold text-[#4A2E20]">{unclaimedCount}</span>
                  <span className="text-[11px] text-[#7A6657] font-semibold">Unclaimed (Ready to Sell)</span>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <span className="block text-2xl font-mono font-bold text-emerald-900">{claimedCount}</span>
                  <span className="text-[11px] text-emerald-700 font-semibold">Claimed & Active</span>
                </div>
              </div>
            </div>

            <button
              onClick={handlePrintSheet}
              className="w-full py-3 rounded-xl bg-[#2A1812] hover:bg-[#1E0F0A] text-[#F5F2E6] font-bold text-xs transition shadow-md flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4 text-[#D4A254]" />
              Print Batch Sticker Sheet
            </button>
          </div>
        </section>

        {/* INVENTORY TABLE & PRINTABLE CARDS */}
        <section className="bg-white border border-[#E4DCD0] p-6 rounded-3xl space-y-6 shadow-sm">
          <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4DCD0] pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#2C1A12] font-serif">
                Physical Sticker Inventory ({filteredStickers.length})
              </h2>
              <p className="text-xs text-[#7A6657] mt-0.5">
                Full list of all physical QR code stickers generated in the system.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center p-1 rounded-xl bg-[#FAF6EE] border border-[#E4DCD0]">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filter === 'all' ? 'bg-[#4A2E20] text-white shadow-sm font-bold' : 'text-[#7A6657] hover:text-[#2C1A12]'
                }`}
              >
                All ({stickers.length})
              </button>
              <button
                onClick={() => setFilter('unclaimed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filter === 'unclaimed' ? 'bg-[#4A2E20] text-white shadow-sm font-bold' : 'text-[#7A6657] hover:text-[#2C1A12]'
                }`}
              >
                Unclaimed ({unclaimedCount})
              </button>
              <button
                onClick={() => setFilter('claimed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filter === 'claimed' ? 'bg-[#4A2E20] text-white shadow-sm font-bold' : 'text-[#7A6657] hover:text-[#2C1A12]'
                }`}
              >
                Claimed ({claimedCount})
              </button>
            </div>
          </div>

          {loading ? (
            <div className="no-print py-12 flex items-center justify-center">
              <div className="w-8 h-8 border-3 border-[#4A2E20] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredStickers.length === 0 ? (
            <div className="no-print p-8 text-center rounded-2xl bg-[#FAF6EE] border border-[#E4DCD0]">
              <p className="text-sm font-bold text-[#2C1A12]">No QR Stickers Found</p>
              <p className="text-xs text-[#7A6657] mt-1">Use the Batch Generator above to create physical QR stickers.</p>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* TABLE VIEW FOR ON-SCREEN ADMIN MANAGEMENT */}
              <div className="no-print overflow-x-auto">
                <table className="w-full text-left text-xs text-[#2C1A12]">
                  <thead className="bg-[#FAF6EE] text-[#4A3B32] uppercase font-mono text-[10px] tracking-wider border-b border-[#E4DCD0]">
                    <tr>
                      <th className="p-3">QR Preview</th>
                      <th className="p-3">Sticker Tag ID</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Vehicle Details (If Claimed)</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4DCD0]">
                    {filteredStickers.map((s) => {
                      const qrUrl = `${origin || 'http://localhost:3000'}/c/${s.id}`;

                      return (
                        <tr key={s.id} className="hover:bg-[#FAF6EE]/60 transition">
                          <td className="p-3">
                            <div className="p-1 bg-[#EAE7D7] rounded-lg inline-block border border-[#DCD3C1]">
                              <QRCodeSVG value={qrUrl} size={48} bgColor="#EAE7D7" fgColor="#2A160F" level="M" />
                            </div>
                          </td>

                          <td className="p-3 font-mono font-bold">
                            <span className="block text-[#2C1A12]">{s.id}</span>
                            <span className="text-[10px] text-[#7A6657]">Created: {new Date(s.created_at).toLocaleDateString()}</span>
                          </td>

                          <td className="p-3">
                            {s.owner_id ? (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider border border-emerald-300">
                                Claimed
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold uppercase tracking-wider border border-amber-300">
                                Unclaimed (Ready to Sell)
                              </span>
                            )}
                          </td>

                          <td className="p-3">
                            {s.owner_id ? (
                              <div>
                                <span className="font-bold text-[#2C1A12] block">{s.nickname || 'Vehicle'}</span>
                                <span className="text-[11px] font-mono text-[#B5822B]">PLATE: {s.plate_number || 'N/A'}</span>
                              </div>
                            ) : (
                              <span className="text-[#7A6657] italic">Not activated yet</span>
                            )}
                          </td>

                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(qrUrl);
                                  setCopiedId(s.id);
                                  setTimeout(() => setCopiedId(null), 2000);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-white border border-[#E4DCD0] text-[#4A2E20] font-semibold hover:bg-[#FAF6EE] transition flex items-center gap-1"
                              >
                                {copiedId === s.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                {copiedId === s.id ? 'Copied' : 'Copy URL'}
                              </button>

                              {s.owner_id && (
                                <button
                                  onClick={() => handleDelinkSticker(s.id)}
                                  className="px-2.5 py-1.5 rounded-lg bg-white border border-amber-200 text-amber-800 font-semibold hover:bg-amber-50 transition flex items-center gap-1"
                                >
                                  <Unlink className="w-3 h-3 text-amber-700" />
                                  Force Delink
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* PRINTABLE BATCH CARDS SHEET (Targeted by window.print()) */}
              <div className="printable-sheet space-y-6 pt-4">
                <div className="hidden print:block text-center border-b pb-4 mb-4">
                  <h1 className="text-xl font-bold font-serif text-[#2C1A12]">CALL N GO - Physical QR Sticker Cards</h1>
                  <p className="text-[10px] text-gray-600">Batch Sheet Print | Total Stickers: {filteredStickers.length}</p>
                </div>

                <div className="printable-grid grid grid-cols-1 md:grid-cols-2 gap-6 justify-items-center">
                  {filteredStickers.map((s) => {
                    const qrUrl = `${origin || 'http://localhost:3000'}/c/${s.id}`;

                    return (
                      <div key={s.id} className="w-full flex justify-center items-center py-2 overflow-x-auto">
                        <div className="shrink-0 scale-[0.88] sm:scale-100 origin-center transition-transform">
                          <QRStickerCard
                            qrUrl={qrUrl}
                            tagId={s.id}
                            carNickname={s.nickname || undefined}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}
        </section>

      </div>
    </main>
  );
}
