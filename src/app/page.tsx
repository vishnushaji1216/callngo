'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Mail, Lock, ChevronDown, User, Phone, ArrowRight, LogOut, CheckCircle2, BellOff, ShoppingBag, QrCode } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProductPricingCards } from '@/components/ProductPricingCards';

export default function LandingPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  // Sign In / Sign Up Form States
  const [fullName, setFullName] = useState<string>('');
  const [phoneNum, setPhoneNum] = useState<string>('');
  const [loginIdentifier, setLoginIdentifier] = useState<string>(''); // Email or Phone
  const [password, setPassword] = useState<string>('');
  const [submittingAuth, setSubmittingAuth] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const currentUser = data.user;
      setUser(currentUser);
      if (currentUser) {
        supabase
          .from('profiles')
          .select('full_name')
          .eq('id', currentUser.id)
          .maybeSingle()
          .then(({ data: prof }) => {
            if (prof?.full_name) {
              setUserName(prof.full_name);
            } else if (currentUser.user_metadata?.full_name) {
              setUserName(currentUser.user_metadata.full_name);
            }
          });
      }
      setLoading(false);
    });
  }, []);

  // Handle Registration
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingAuth(true);
      setMessage(null);

      if (!fullName.trim()) {
        throw new Error('Please enter your full name');
      }

      const cleanPhone = phoneNum.replace(/[^0-9]/g, '');
      if (cleanPhone.length < 10) {
        throw new Error('Please enter a valid 10-digit mobile phone number');
      }

      if (!password || password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      const internalEmail = `${cleanPhone}@callngo.in`;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: internalEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone_number: cleanPhone
          }
        }
      });

      if (authError || !authData.user) {
        throw new Error(authError?.message || 'Registration failed');
      }

      // Upsert profile record with name & phone
      await supabase.from('profiles').upsert({
        id: authData.user.id,
        full_name: fullName.trim(),
        phone_number: cleanPhone
      });

      setUserName(fullName.trim());
      setUser(authData.user);
      router.push('/profile');
    } catch (err: any) {
      console.error('Sign up error:', err);
      setMessage({ type: 'error', text: err.message || 'Registration failed' });
      setSubmittingAuth(false);
    }
  };

  // Handle Sign In Submit (Supports Phone Number or Email)
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingAuth(true);
      setMessage(null);

      const trimmedIdentifier = loginIdentifier.trim();
      if (!trimmedIdentifier || !password) {
        throw new Error('Please enter your Phone and password');
      }

      // If user typed a phone number, convert to the internal email format
      const emailToLogin = trimmedIdentifier.includes('@')
        ? trimmedIdentifier
        : `${trimmedIdentifier.replace(/[^0-9]/g, '')}@callngo.in`;

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emailToLogin,
        password
      });

      if (authError || !authData.user) {
        throw new Error(authError?.message || 'Invalid phone number or password');
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
    setUserName('');
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
          <img
            src="/logo.png"
            alt="CallNGo Logo"
            className="w-10 h-10 rounded-xl object-contain shadow-sm"
          />
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
            <div className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-[#B5822B] mb-2 font-mono">
              Emergency Response Ready
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold font-serif text-[#2C1A12] tracking-tight leading-tight mb-1.5">
              🚨 If accident happens
            </h1>

            <p className="text-xs sm:text-sm font-serif text-[#6E5A4C] max-w-lg mx-auto leading-relaxed mb-3">
              &ldquo;Keep your loved ones informed. Your emergency contact is one scan away.&rdquo;
            </p>

            <div className="flex items-center justify-center gap-3 text-[11px] text-[#7A6657] font-medium">
              <span>• Emergency Medical Card</span>
              <span>• Instant Family SOS Call</span>
            </div>
          </div>

          {/* CARD 2: WHEN YOU PARK */}
          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border border-[#E4DCD0] shadow-sm text-center relative overflow-hidden">
            <div className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-[#B5822B] mb-2 font-mono">
              Smart Parking Assistant
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold font-serif text-[#2C1A12] tracking-tight leading-tight mb-1.5">
              🚗 When You Park
            </h2>

            <p className="text-xs sm:text-sm font-serif text-[#6E5A4C] max-w-lg mx-auto leading-relaxed mb-3">
              &ldquo;Park anywhere. Stay reachable. Get notified when someone needs you — without sharing your number.&rdquo;
            </p>

            <div className="flex items-center justify-center gap-3 text-[11px] text-[#7A6657] font-medium">
              <span>• Masked Private Calling</span>
              <span>• Zero Spam & Number Masked</span>
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
              <span>{user ? 'Account Settings Below' : 'Sign In or Register Below'}</span>
              <ChevronDown className="w-3.5 h-3.5 animate-bounce text-[#B5822B] group-hover:text-[#4A2E20]" />
            </button>
          </div>

        </div>
      </section>

      {/* PRICING & PRODUCTS SECTION (Directly accessible on homepage) */}
      <section className="py-12 px-4 sm:px-8 border-t border-[#E4DCD0] bg-white flex flex-col items-center">
        <div className="w-full max-w-5xl">
          <ProductPricingCards
            title="Buy CallNGo Smart QR Cards & Stickers"
            subtitle="Get genuine weatherproof stickers and premium valet cards delivered directly to your doorstep. Request via WhatsApp or Phone!"
            userName={userName}
          />
        </div>
      </section>

      {/* AUTH SECTION: LOGIN & REGISTRATION */}
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
                Logged in as <strong className="text-[#2C1A12]">{userName || 'User'}</strong>
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
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-xl sm:text-2xl font-bold text-[#2C1A12] font-serif tracking-tight">
                  {authMode === 'signup' ? 'Create Your Account' : 'Sign In to CallNGo'}
                </h3>
                <p className="text-xs text-[#7A6657] mt-1">
                  {authMode === 'signup'
                    ? 'Enter your name, phone number, and password to register.'
                    : 'Access your registered vehicles, emergency contacts, and privacy settings.'}
                </p>
              </div>

              {/* Mode Switch Tabs: Register vs Sign In */}
              <div className="flex items-center p-1 rounded-xl bg-[#FAF6EE] border border-[#E4DCD0]">
                <button
                  type="button"
                  onClick={() => { setAuthMode('signin'); setMessage(null); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                    authMode === 'signin'
                      ? 'bg-[#4A2E20] text-white shadow-sm'
                      : 'text-[#7A6657] hover:text-[#2C1A12]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('signup'); setMessage(null); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                    authMode === 'signup'
                      ? 'bg-[#4A2E20] text-white shadow-sm'
                      : 'text-[#7A6657] hover:text-[#2C1A12]'
                  }`}
                >
                  Register
                </button>
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

              {/* REGISTRATION FORM */}
              {authMode === 'signup' ? (
                <form onSubmit={handleSignUp} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#4A3B32] mb-1">Full Name *</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#7A6657] absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Vishnu Shaji"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#FAF6EE] border border-[#E4DCD0] text-[#2C1A12] text-xs sm:text-sm focus:outline-none focus:border-[#B5822B]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#4A3B32] mb-1">Phone Number *</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[#7A6657] absolute left-3 top-3" />
                      <input
                        type="tel"
                        required
                        value={phoneNum}
                        onChange={(e) => setPhoneNum(e.target.value)}
                        placeholder="9876543210"
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
                    {submittingAuth ? 'Creating Account...' : 'Register Account'}
                  </button>
                </form>
              ) : (
                /* LOGIN FORM */
                <form onSubmit={handleSignIn} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#4A3B32] mb-1">Phone Number</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[#7A6657] absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        placeholder="9876543210 or name@example.com"
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
              )}

              {/* ACTION CALLOUTS FOR QR SCAN / BUY */}
              <div className="pt-3 border-t border-[#E4DCD0] space-y-2.5">
                <div className="p-3 rounded-2xl bg-[#FAF6EE] border border-[#E4DCD0] flex items-center justify-between gap-2">
                  <div className="text-left">
                    <div className="text-xs font-bold text-[#2C1A12]">Have a physical sticker?</div>
                    <div className="text-[11px] text-[#7A6657]">Scan it to activate or link.</div>
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
