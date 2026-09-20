'use client';

import { useState } from 'react';
import { PRODUCTS, ProductShopModal } from './ProductShopModal';
import { Sparkles, ShoppingBag, ShieldCheck, ArrowRight } from 'lucide-react';

interface ProductPricingCardsProps {
  onSelectProduct?: (productId: string) => void;
  title?: string;
  subtitle?: string;
  userName?: string;
  userPhone?: string;
}

export function ProductPricingCards({
  title = 'Buy CallNGo Smart QR Cards & Stickers',
  subtitle = 'Get genuine weatherproof stickers and premium valet cards delivered directly to your doorstep.',
  userName = '',
  userPhone = ''
}: ProductPricingCardsProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>('1-sticker');
  const [showOrderModal, setShowOrderModal] = useState<boolean>(false);

  const handleOpenOrder = (productId: string) => {
    setSelectedProductId(productId);
    setShowOrderModal(true);
  };

  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF6EE] border border-[#E4DCD0] text-[#B5822B] text-xs font-bold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5 text-[#B5822B]" />
          Direct Pricing & Products
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold font-serif text-[#2C1A12] tracking-tight">
          {title}
        </h2>
        <p className="text-xs sm:text-sm text-[#7A6657] mt-2 max-w-lg mx-auto">
          {subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto text-left">
        {PRODUCTS.map((product) => {
          const isFeatured = product.id === '2-stickers';
          return (
            <div
              key={product.id}
              className={`rounded-3xl p-6 flex flex-col justify-between transition-all duration-200 relative ${
                isFeatured
                  ? 'bg-gradient-to-b from-[#2C1A12] to-[#1A110B] text-white shadow-xl border-2 border-[#D4A254] scale-[1.02]'
                  : 'bg-white text-[#2C1A12] border border-[#E4DCD0] shadow-sm hover:shadow-md'
              }`}
            >
              {/* Badge if present */}
              {product.badge && (
                <span
                  className={`absolute -top-3 right-6 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase shadow-sm ${
                    isFeatured
                      ? 'bg-[#FFDF00] text-black'
                      : 'bg-black text-white'
                  }`}
                >
                  {product.badge}
                </span>
              )}

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">
                    {product.id === 'valet-card' ? '💳' : '🏷️'}
                  </span>
                  <h3 className={`font-bold text-lg ${isFeatured ? 'text-white' : 'text-[#2C1A12]'}`}>
                    {product.name}
                  </h3>
                </div>

                <p className={`text-xs leading-relaxed mb-6 ${isFeatured ? 'text-gray-300' : 'text-[#7A6657]'}`}>
                  {product.description}
                </p>
              </div>

              <div>
                <div className="mb-4">
                  <span className="text-xs font-semibold opacity-70">Price: </span>
                  <span className="text-3xl font-black font-mono tracking-tight">
                    ₹{product.price}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenOrder(product.id)}
                  className={`w-full py-3 px-4 rounded-2xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm ${
                    isFeatured
                      ? 'bg-[#FFDF00] hover:bg-[#F0D000] text-black'
                      : 'bg-[#4A2E20] hover:bg-[#3B2418] text-white'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Order / Request Quote
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 text-center text-xs text-[#7A6657] flex items-center justify-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <span>No upfront payment required • Pay after confirmation with admin</span>
      </div>

      <ProductShopModal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        initialProductId={selectedProductId}
        initialName={userName}
        initialPhone={userPhone}
      />
    </div>
  );
}
