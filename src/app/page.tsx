'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Mail, Lock, ChevronDown, Car, AlertTriangle, ArrowRight, LogOut, CheckCircle2, BellOff, ShoppingBag, QrCode, ShieldCheck, PhoneCall, HeartPulse, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LandingPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [submittingAuth, setSubmittingAuth] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const currentUser = data.user;
      setUser(currentUser);
      setLoading(false);
    });
  }, []);

  // Handle Sign In Submit
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingAuth(true);
      setMessage(null);

      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError || !authData.user) {
        throw new Error(authError?.message || 'Login failed');
      }

      // Redirect to Profile Page
      router.push('/profile');
    } catch (err: any) {
      console.error('Sign in error:', err);
      setMessage({ type: 'error', text: err.message || 'Login failed' });
      setSubmittingAuth(false);
    }
  };

  const handleLogOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setMessage({ type: 'success', text: 'Logged out.' });
  };

  const scrollToAuth = () => {
    const authSection = document.getElementById('auth-section');
    if (authSection) {
      authSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F5EE] text-[#2C1A12] selection:bg-[#D4A254] selection:text-[#160f0b]">
      {/* Top Header */}
      <header className="w-full max-w-4xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between border-b border-[#E4DCD0]/60">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#4A2E20] flex items-center justify-center text-white text-base sm:text-lg font-bold shadow-md">
            🚗
          </div>
          <div>
            <span className="text-base sm:text-lg font-extrabold tracking-wider font-mono text-[#2C1A12] uppercase">
              CALL N GO
            </span>
            <span className="block text-[9px] sm:text-[10px] uppercase tracking-widest text-[#B5822B] font-bold">
              Private Vehicle QR Calling
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/scan"
            className="px-3 py-1.5 sm:py-2 rounded-xl bg-white hover:bg-[#FAF6EE] text-[#4A2E20] border border-[#E4DCD0] text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <QrCode className="w-3.5 h-3.5 text-[#B5822B]" />
            <span>Scan QR</span>
          </Link>

          {user ? (
            <div className="flex items-center gap-1.5">
              <Link
                href="/profile"
                className="px-3.5 py-1.5 sm:py-2 rounded-xl bg-[#4A2E20] hover:bg-[#3B2418] text-white text-xs font-bold transition flex items-center gap-1 shadow-sm"
              >
                Profile →
              </Link>
              <button
                onClick={handleLogOut}
                className="p-1.5 sm:p-2 rounded-xl bg-white hover:bg-[#FAF6EE] text-[#4A3B32] text-xs font-semibold border border-[#E4DCD0] transition"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5 text-red-600" />
              </button>
            </div>
          ) : (
            <button
              onClick={scrollToAuth}
              className="px-3.5 py-1.5 sm:py-2 rounded-xl bg-[#4A2E20] hover:bg-[#3B2418] text-white text-xs font-bold transition shadow-sm"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* DOWNSIDE BUY TAGS BANNER (Directly below header) */}
      <div className="w-full max-w-4xl mx-auto px-4 pt-3 pb-1">
        <Link
          href="/buy"
          className="w-full inline-flex items-center justify-between gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-[#FAF6EE] text-[#4A2E20] border border-[#E4DCD0] text-xs font-bold transition shadow-sm group"
        >
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-[#FAF6EE] text-[#B5822B]">
              <ShoppingBag className="w-4 h-4" />
            </span>
            <div className="text-left">
              <span className="font-extrabold text-[#2C1A12]">Buy Tags</span>
              <span className="text-[11px] text-[#7A6657] font-normal ml-2 hidden sm:inline">
                Stickers & Valet Smart Cards (from ₹200)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-[#B5822B] group-hover:translate-x-0.5 transition-transform">
            <span>Order Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>

      {/* HERO SECTION: TIGHT, RICH VERTICAL CARDS */}
      <section className="w-full max-w-4xl mx-auto px-4 py-3 sm:py-4">
        <div className="space-y-3">
          
          {/* CARD 1: IF ACCIDENT HAPPENS */}
          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border border-[#E4DCD0] shadow-sm text-center relative overflow-hidden">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-100 border border-red-200 text-red-800 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-2">
              <AlertTriangle className="w-3 h-3 text-red-600" />
              Emergency Response Ready
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold font-serif text-[#2C1A12] tracking-tight leading-tight mb-1.5">
              🚨 If accident happens
            </h1>

            <p className="text-xs sm:text-sm font-serif text-[#6E5A4C] max-w-lg mx-auto leading-relaxed mb-3">
              &ldquo;Keep your loved ones informed. Your emergency contact is one scan away.&rdquo;
            </p>

            <div className="flex items-center justify-center gap-2 flex-wrap text-[11px] text-[#4A3B32]">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#FAF6EE] border border-[#E4DCD0]">
                <HeartPulse className="w-3 h-3 text-red-600" />
                Emergency Medical Card
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#FAF6EE] border border-[#E4DCD0]">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Instant Family SOS Call
              </span>
            </div>
          </div>

          {/* CARD 2: WHEN YOU PARK */}
          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border border-[#E4DCD0] shadow-sm text-center relative overflow-hidden">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FAF6EE] border border-[#E4DCD0] text-[#4A2E20] text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-2">
              <Car className="w-3 h-3 text-[#B5822B]" />
              Smart Parking Assistant
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold font-serif text-[#2C1A12] tracking-tight leading-tight mb-1.5">
              🚗 When You Park
            </h2>

            <p className="text-xs sm:text-sm font-serif text-[#6E5A4C] max-w-lg mx-auto leading-relaxed mb-3">
              &ldquo;Park anywhere. Stay reachable. Get notified when someone needs you — without sharing your number.&rdquo;
            </p>

            <div className="flex items-center justify-center gap-2 flex-wrap text-[11px] text-[#4A3B32]">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#FAF6EE] border border-[#E4DCD0]">
                <PhoneCall className="w-3 h-3 text-[#B5822B]" />
                Masked Private Calling
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#FAF6EE] border border-[#E4DCD0]">
                <ShieldCheck className="w-3 h-3 text-[#4A2E20]" />
                Zero Spam & Number Masked
              </span>
            </div>
          </div>

          {/* PRIMARY CTAS */}
          <div className="pt-1 flex items-center justify-center gap-2.5 sm:gap-3 flex-wrap">
            <Link
              href="/scan"
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl sm:rounded-2xl bg-[#4A2E20] hover:bg-[#3B2418] text-white text-xs sm:text-sm font-bold transition shadow-md flex items-center justify-center gap-2"
            >
              <QrCode className="w-4 h-4 text-[#D4A254]" />
              Scan QR Sticker
            </Link>
            <Link
              href="/buy"
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl sm:rounded-2xl bg-white hover:bg-[#FAF6EE] text-[#4A2E20] border border-[#E4DCD0] text-xs sm:text-sm font-bold transition shadow-sm flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-4 h-4 text-[#B5822B]" />
              Buy Our Card
            </Link>
          </div>

          {/* QUICK SCROLL / SIGN IN ANCHOR */}
          <div className="pt-1 text-center">
            <button
              onClick={scrollToAuth}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#B5822B] hover:text-[#4A2E20] transition group cursor-pointer"
            >
              <span>Existing User? Sign In Below</span>
              <ChevronDown className="w-3.5 h-3.5 animate-bounce text-[#B5822B] group-hover:text-[#4A2E20]" />
            </button>
          </div>

        </div>
      </section>

      {/* AUTH SECTION: LOGIN FORM */}
      <section id="auth-section" className="py-8 sm:py-12 px-4 bg-[#FAF6EE] border-t border-[#E4DCD0] flex flex-col items-center justify-center">
        <div className="w-full max-w-md bg-white border border-[#E4DCD0] rounded-3xl p-5 sm:p-7 shadow-lg">
          
          {user ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 text-2xl mx-auto">
                ✓
              </div>
              <h3 className="text-lg font-bold text-[#2C1A12] font-serif">
                You are logged in
              </h3>
              <p className="text-xs text-[#7A6657]">
                Logged in as <strong className="text-[#2C1A12]">{user.email}</strong>
              </p>

              <div className="pt-2 flex flex-col gap-2.5">
                <Link
                  href="/profile"
                  className="w-full py-3 px-6 rounded-2xl bg-[#4A2E20] hover:bg-[#3B2418] text-white font-bold text-xs sm:text-sm transition shadow-md flex items-center justify-center gap-2"
                >
                  <span>Go to My Profile & Vehicles</span>
                  <ArrowRight className="w-4 h-4 text-[#D4A254]" />
                </Link>

                <button
                  onClick={handleLogOut}
                  className="w-full py-2 rounded-xl bg-white border border-[#E4DCD0] text-[#7A6657] hover:text-[#2C1A12] text-xs font-semibold transition"
                >
                  Log Out
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="text-center">
                <h3 className="text-xl sm:text-2xl font-bold text-[#2C1A12] font-serif tracking-tight">
                  Sign In to CallNGo
                </h3>
                <p className="text-xs text-[#7A6657] mt-1">
                  Access your registered vehicles, emergency contacts, and privacy settings.
                </p>
              </div>

              {/* System Messages */}
              {message && (
                <div
                  className={`p-3 rounded-2xl border text-xs flex items-center gap-2 ${
                    message.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-red-50 border-red-200 text-red-900'
                  }`}
                >
                  {message.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <BellOff className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{message.text}</span>
                </div>
              )}

              {/* LOGIN FORM */}
              <form onSubmit={handleSignIn} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#4A3B32] mb-1">Email Address *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#7A6657] absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@example.com"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#FAF6EE] border border-[#E4DCD0] text-[#2C1A12] text-xs sm:text-sm focus:outline-none focus:border-[#B5822B]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#4A3B32] mb-1">Password *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#7A6657] absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#FAF6EE] border border-[#E4DCD0] text-[#2C1A12] text-xs sm:text-sm focus:outline-none focus:border-[#B5822B]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submittingAuth}
                  className="w-full py-3 rounded-xl bg-[#4A2E20] hover:bg-[#3B2418] text-white font-bold text-xs sm:text-sm transition shadow-md disabled:opacity-50 mt-1"
                >
                  {submittingAuth ? 'Signing In...' : 'Sign In'}
                </button>
              </form>

              {/* ACTION CALLOUTS FOR QR SCAN / BUY */}
              <div className="pt-3 border-t border-[#E4DCD0] space-y-2.5">
                <div className="p-3 rounded-2xl bg-[#FAF6EE] border border-[#E4DCD0] flex items-center justify-between gap-2">
                  <div className="text-left">
                    <div className="text-xs font-bold text-[#2C1A12]">Have a new QR sticker?</div>
                    <div className="text-[11px] text-[#7A6657]">Scan it on our scan page to register.</div>
                  </div>
                  <Link
                    href="/scan"
                    className="px-3 py-1.5 rounded-xl bg-[#4A2E20] text-white text-xs font-bold hover:bg-[#3B2418] transition shrink-0"
                  >
                    Scan QR →
                  </Link>
                </div>

                <div className="text-center text-xs text-[#7A6657]">
                  Don&apos;t have a sticker or valet card yet?{' '}
                  <Link href="/buy" className="text-[#B5822B] font-bold underline hover:text-[#4A2E20]">
                    Buy Our Card
                  </Link>
                </div>
              </div>
            </div>
          )}

        </div>
      </section>
    </main>
  );
}
