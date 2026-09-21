'use client';

import Link from 'next/link';
import { ArrowLeft, ShieldCheck, ShoppingBag, Sparkles } from 'lucide-react';
import { ProductPricingCards } from '@/components/ProductPricingCards';

export default function BuyPage() {
  return (
    <main className="min-h-screen bg-[#FDFBF7] text-[#1A1A1A] flex flex-col items-center justify-between p-4 sm:p-8 font-sans">
      {/* Top Navigation */}
      <header className="w-full max-w-4xl flex items-center justify-between py-4 border-b border-[#E4DCD0]">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#4A2E20] hover:text-black transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="flex items-center gap-2 font-bold text-sm tracking-tight text-black">
          <img
            src="/logo.png"
            alt="CallNGo Logo"
            className="w-7 h-7 rounded-lg object-contain"
          />
          <span className="text-black font-extrabold font-serif">CallNGo</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#FFDF00] text-black font-bold">
            Store
          </span>
        </div>

        <Link
          href="/profile"
          className="text-xs font-semibold text-[#7A6657] hover:text-black transition"
        >
          My Profile →
        </Link>
      </header>

      {/* Main Pricing & Product Section */}
      <div className="w-full max-w-4xl py-12">
        <ProductPricingCards
          title="Buy Our Cards & Stickers"
          subtitle="Select your sticker pack or premium valet smart card. No payment gateway needed — request a direct quote via WhatsApp, Email, or Phone!"
        />
      </div>

      {/* Footer */}
      <footer className="w-full max-w-4xl py-6 border-t border-[#E4DCD0] text-center text-xs text-[#7A6657]">
        <p>© {new Date().getFullYear()} CallNGo. Fast door-to-door delivery across India.</p>
      </footer>
    </main>
  );
}
