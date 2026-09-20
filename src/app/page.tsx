'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { ShieldCheck, User, Mail, Lock, PhoneCall, ChevronDown, Car, AlertTriangle, ArrowRight, LogOut, CheckCircle2, BellOff, Camera, Sparkles, ShoppingBag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { QRScannerModal } from '@/components/QRScannerModal';
import { ProductPricingCards } from '@/components/ProductPricingCards';

export default function LandingPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [showScanner, setShowScanner] = useState<boolean>(false);
  const [verifyingSticker, setVerifyingSticker] = useState<boolean>(false);

  // Registration Form States
  const [fullName, setFullName] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
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

  // Handle Scanned Sticker for Registration
  const handleScanSticker = async (scannedId: string) => {
    setShowScanner(false);
    try {
      setVerifyingSticker(true);
      setMessage(null);

      const res = await fetch(`/api/cars/${scannedId}/public`);
      if (!res.ok) throw new Error('Could not check vehicle sticker');
      const data = await res.json();

      if (data.is_activated) {
        setMessage({
          type: 'error',
          text: '⚠️ This vehicle sticker has already been claimed and registered! Please scan a new, unassigned sticker.'
        });
      } else {
        // Unlinked sticker: redirect to register and activate this vehicle!
        router.push(`/c/${scannedId}`);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to verify sticker' });
    } finally {
      setVerifyingSticker(false);
    }
  };

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

  const scrollToHero2 = () => {
    const hero2Section = document.getElementById('hero-section-2');
    if (hero2Section) {
      hero2Section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F5EE] text-[#2C1A12] selection:bg-[#D4A254] selection:text-[#160f0b]">
      {/* Top Header */}
      <header className="w-full max-w-5xl mx-auto px-4 py-6 flex items-center justify-between border-b border-[#E4DCD0]/60">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-[#4A2E20] flex items-center justify-center text-white text-lg font-bold shadow-md">
            🚗
          </div>
          <div>
            <span className="text-lg font-extrabold tracking-wider font-mono text-[#2C1A12] uppercase">
              CALL N GO
            </span>
            <span className="block text-[10px] uppercase tracking-widest text-[#B5822B] font-bold">
              Private Vehicle QR Calling
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-3 py-2 rounded-xl bg-white hover:bg-[#FAF6EE] text-[#4A2E20] border border-[#E4DCD0] text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[#B5822B]" />
            Buy Tags
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/profile"
                className="px-4 py-2 rounded-xl bg-[#4A2E20] hover:bg-[#3B2418] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                Go to Profile →
              </Link>
              <button
                onClick={handleLogOut}
                className="px-3 py-2 rounded-xl bg-white hover:bg-[#FAF6EE] text-[#4A3B32] text-xs font-semibold border border-[#E4DCD0] transition flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5 text-red-600" />
                Log Out
              </button>
            </div>
          ) : (
            <button
              onClick={scrollToAuth}
              className="px-4 py-2 rounded-xl bg-[#4A2E20] hover:bg-[#3B2418] text-white text-xs font-bold transition shadow-sm"
            >
              Sign In / Scan QR
            </button>
          )}
        </div>
      </header>

      {/* HERO SECTION 1: ACCIDENT EMERGENCY */}
      <section className="min-h-[85vh] flex flex-col items-center justify-center p-6 text-center max-w-4xl mx-auto relative">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-100 border border-red-200 text-red-800 text-xs font-bold uppercase tracking-wider mb-6 animate-pulse">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          Emergency Response Ready
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold font-serif text-[#2C1A12] tracking-tight leading-[1.15] mb-6">
          🚨 If accident happens
        </h1>

        <p className="text-lg sm:text-2xl font-serif text-[#6E5A4C] max-w-2xl mb-12 leading-relaxed">
          "Keep your loved ones informed. Your emergency contact is one scan away."
        </p>

        {/* Scroll Down Indicator to Hero 2 */}
        <button
          onClick={scrollToHero2}
          className="flex flex-col items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#B5822B] hover:text-[#4A2E20] transition group cursor-pointer"
        >
          <span>Scroll Down For Parking Protection</span>
          <ChevronDown className="w-5 h-5 animate-bounce text-[#B5822B] group-hover:text-[#4A2E20]" />
        </button>
      </section>

      {/* HERO SECTION 2: PARKING CONTACT */}
      <section id="hero-section-2" className="min-h-[85vh] flex flex-col items-center justify-center p-6 text-center max-w-4xl mx-auto border-t border-[#E4DCD0]/60 relative">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FAF6EE] border border-[#E4DCD0] text-[#4A2E20] text-xs font-bold uppercase tracking-wider mb-6">
          <Car className="w-4 h-4 text-[#B5822B]" />
          Smart Parking Assistant
        </div>

        <h2 className="text-4xl sm:text-6xl font-extrabold font-serif text-[#2C1A12] tracking-tight leading-[1.15] mb-6">
          🚗 When You Park
        </h2>

        <p className="text-lg sm:text-2xl font-serif text-[#6E5A4C] max-w-2xl mb-12 leading-relaxed">
          "Park anywhere. Stay reachable. Get notified when someone needs you — without sharing your number."
        </p>

        {/* Scroll Down Indicator to Pricing Section */}
        <button
          onClick={() => document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' })}
          className="flex flex-col items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#B5822B] hover:text-[#4A2E20] transition group cursor-pointer"
        >
          <span>Scroll Down For Products & Pricing</span>
          <ChevronDown className="w-5 h-5 animate-bounce text-[#B5822B] group-hover:text-[#4A2E20]" />
        </button>
      </section>

      {/* SECTION 3: PRODUCTS & PRICING */}
      <section id="pricing-section" className="py-20 px-4 bg-[#FAF6EE]/50 border-t border-[#E4DCD0]/60">
        <ProductPricingCards />
      </section>

      {/* BOTTOM AUTH SECTION: LOGIN OR REGISTER ONLY */}
      <section id="auth-section" className="py-16 px-4 bg-[#FAF6EE] border-t border-[#E4DCD0] flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-md bg-white border border-[#E4DCD0] rounded-3xl p-6 sm:p-8 shadow-xl">
          
          {user ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 text-2xl mx-auto">
                ✓
              </div>
              <h3 className="text-xl font-bold text-[#2C1A12] font-serif">
                You are logged in
              </h3>
              <p className="text-xs text-[#7A6657]">
                Logged in as <strong className="text-[#2C1A12]">{user.email}</strong>
              </p>

              <div className="pt-2 flex flex-col gap-3">
                <Link
                  href="/profile"
                  className="w-full py-3.5 px-6 rounded-2xl bg-[#4A2E20] hover:bg-[#3B2418] text-white font-bold text-sm transition shadow-md flex items-center justify-center gap-2"
                >
                  <span>Go to My Profile & Vehicles</span>
                  <ArrowRight className="w-4 h-4 text-[#D4A254]" />
                </Link>

                <button
                  onClick={handleLogOut}
                  className="w-full py-2.5 rounded-xl bg-white border border-[#E4DCD0] text-[#7A6657] hover:text-[#2C1A12] text-xs font-semibold transition"
                >
                  Log Out
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-[#2C1A12] font-serif tracking-tight">
                  {authMode === 'signup' ? 'Create Your Account' : 'Welcome Back'}
                </h3>
                <p className="text-xs text-[#7A6657] mt-1">
                  {authMode === 'signup'
                    ? 'Register your account to manage your profile and vehicle QR cards.'
                    : 'Sign in to access your vehicles and call alert settings.'}
                </p>
              </div>

              {/* System Messages */}
              {message && (
                <div
                  className={`p-3.5 rounded-2xl border text-xs flex items-center gap-2.5 ${
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

              {/* Tab Selector: Register or Login */}
              <div className="flex items-center p-1 rounded-xl bg-[#FAF6EE] border border-[#E4DCD0]">
                <button
                  onClick={() => { setAuthMode('signup'); setMessage(null); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${
                    authMode === 'signup'
                      ? 'bg-[#4A2E20] text-white shadow-sm font-bold'
                      : 'text-[#7A6657] hover:text-[#2C1A12]'
                  }`}
                >
                  Register
                </button>
                <button
                  onClick={() => { setAuthMode('signin'); setMessage(null); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${
                    authMode === 'signin'
                      ? 'bg-[#4A2E20] text-white shadow-sm font-bold'
                      : 'text-[#7A6657] hover:text-[#2C1A12]'
                  }`}
                >
                  Login
                </button>
              </div>

              {/* REGISTER VIA STICKER SCAN */}
              {authMode === 'signup' ? (
                <div className="space-y-4 py-4 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-[#FAF6EE] border border-[#E4DCD0] text-[#B5822B] flex items-center justify-center text-3xl mx-auto shadow-inner">
                    📷
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-[#2C1A12]">Scan Physical Sticker to Register</h4>
                    <p className="text-xs text-[#7A6657] mt-1 leading-relaxed max-w-xs mx-auto">
                      Registration is strictly tied to your CallNGo QR code sticker. Scan your sticker to verify it is unassigned and create your vehicle account.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    disabled={verifyingSticker}
                    className="w-full py-3.5 rounded-2xl bg-[#4A2E20] hover:bg-[#3B2418] text-white font-bold text-sm transition shadow-lg shadow-[#4A2E20]/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4 text-[#D4A254]" />
                    {verifyingSticker ? 'Verifying Sticker...' : 'Scan QR Sticker to Register'}
                  </button>

                  <p className="text-[11px] text-gray-500">
                    Already registered? Switch to <strong className="cursor-pointer text-[#4A2E20] underline" onClick={() => setAuthMode('signin')}>Login</strong>.
                  </p>
                </div>
              ) : (
                /* LOGIN FORM */
                <form onSubmit={handleSignIn} className="space-y-4">
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
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#FAF6EE] border border-[#E4DCD0] text-[#2C1A12] text-sm focus:outline-none focus:border-[#B5822B]"
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
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#FAF6EE] border border-[#E4DCD0] text-[#2C1A12] text-sm focus:outline-none focus:border-[#B5822B]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingAuth}
                    className="w-full py-3.5 rounded-xl bg-[#4A2E20] hover:bg-[#3B2418] text-white font-bold text-sm transition shadow-md disabled:opacity-50 mt-2"
                  >
                    {submittingAuth ? 'Signing In...' : 'Sign In'}
                  </button>
                </form>
              )}
            </div>
          )}

        </div>
      </section>

      {/* QR SCANNER MODAL */}
      <QRScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleScanSticker}
        title="Scan Sticker to Register"
        subtitle="Point camera at your CallNGo sticker QR code to activate your account"
      />
    </main>
  );
}
