'use client';

import { useState } from 'react';
import { X, Send, Phone, Mail, CheckCircle2, MessageSquare, ShoppingBag } from 'lucide-react';

export interface ProductItem {
  id: string;
  name: string;
  price: number;
  badge?: string;
  description: string;
}

export const PRODUCTS: ProductItem[] = [
  {
    id: '1-sticker',
    name: '1 QR Sticker',
    price: 200,
    description: 'Weatherproof & UV-resistant windshield sticker for 1 car or bike.'
  },
  {
    id: '2-stickers',
    name: '2 QR Stickers',
    price: 350,
    badge: 'Popular • Save ₹50',
    description: 'Pack of 2 stickers for front/rear windshield or 2 separate vehicles.'
  },
  {
    id: 'valet-card',
    name: 'Valet Smart Card',
    price: 450,
    badge: 'Premium Card',
    description: 'Heavy-duty matte finish NFC & QR smart card for dashboard or key fob.'
  }
];

const ADMIN_PHONE = '+919891080270';
const ADMIN_WHATSAPP = '919891080270';
const ADMIN_EMAIL = 'admin@callngo.com';

interface ProductShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProductId?: string;
  initialName?: string;
  initialPhone?: string;
}

export function ProductShopModal({
  isOpen,
  onClose,
  initialProductId = '1-sticker',
  initialName = '',
  initialPhone = ''
}: ProductShopModalProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>(initialProductId);
  const [quantity, setQuantity] = useState<number>(1);
  const [customerName, setCustomerName] = useState<string>(initialName);
  const [customerPhone, setCustomerPhone] = useState<string>(initialPhone);
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentProduct = PRODUCTS.find((p) => p.id === selectedProductId) || PRODUCTS[0];
  const totalPrice = currentProduct.price * quantity;

  // Formats text message for WhatsApp and Email
  const getOrderSummaryText = () => {
    return `Hello CallNGo Team,
I would like to order:
- Item: ${currentProduct.name} (₹${currentProduct.price})
- Quantity: ${quantity}
- Total: ₹${totalPrice}
- Customer Name: ${customerName || 'Customer'}
- Phone: ${customerPhone || 'Not provided'}
- Delivery Address: ${deliveryAddress || 'Not provided'}

Please share payment and delivery details.`;
  };

  const handleWhatsAppOrder = () => {
    const text = encodeURIComponent(getOrderSummaryText());
    window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${text}`, '_blank');
    setSubmitted(true);
  };

  const handleEmailOrder = () => {
    const subject = encodeURIComponent(`Order Request: ${currentProduct.name} - ₹${totalPrice}`);
    const body = encodeURIComponent(getOrderSummaryText());
    window.location.href = `mailto:${ADMIN_EMAIL}?subject=${subject}&body=${body}`;
    setSubmitted(true);
  };

  const handleDirectCall = () => {
    window.location.href = `tel:${ADMIN_PHONE}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto text-left">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#B5822B] mb-1 font-mono">
          <ShoppingBag className="w-4 h-4 text-[#B5822B]" />
          Direct Order & Quote
        </div>

        <h3 className="text-xl font-bold text-gray-900 font-serif mb-1">
          Request Your CallNGo Tag
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          No payment gateway needed. Send a direct quote request to our team via WhatsApp, Email, or Phone!
        </p>

        {submitted ? (
          <div className="py-6 flex flex-col items-center text-center gap-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            <h4 className="font-bold text-base text-gray-900">Order Request Sent!</h4>
            <p className="text-xs text-gray-600 max-w-xs">
              Thank you for ordering. Our team will contact you shortly on your phone/WhatsApp to confirm delivery.
            </p>
            <button
              onClick={onClose}
              className="mt-3 px-6 py-2.5 rounded-xl bg-black text-white text-xs font-bold"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* Product Selection List */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700">Select Product:</label>
              {PRODUCTS.map((product) => {
                const isSelected = selectedProductId === product.id;
                return (
                  <label
                    key={product.id}
                    onClick={() => setSelectedProductId(product.id)}
                    className={`w-full p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition select-none ${
                      isSelected
                        ? 'border-black bg-[#FAF6EE] shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-black">{product.name}</span>
                        {product.badge && (
                          <span className="px-2 py-0.5 rounded-full bg-[#FFDF00] text-black text-[10px] font-bold">
                            {product.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-500 mt-0.5">{product.description}</span>
                    </div>

                    <div className="text-right pl-3 shrink-0">
                      <span className="font-mono font-black text-base text-black">
                        ₹{product.price}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
              <span className="text-xs font-semibold text-gray-700">Quantity:</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-7 h-7 rounded-lg bg-white border border-gray-300 font-bold text-sm text-gray-700 hover:bg-gray-100"
                >
                  -
                </button>
                <span className="font-mono font-bold text-sm text-black">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-7 h-7 rounded-lg bg-white border border-gray-300 font-bold text-sm text-gray-700 hover:bg-gray-100"
                >
                  +
                </button>
              </div>
            </div>

            {/* Contact Details Inputs */}
            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Your Name *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Your Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Delivery Address / City</label>
                <textarea
                  rows={2}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="e.g. Flat 402, Green Valley, Bangalore"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-black"
                />
              </div>
            </div>

            {/* Total Summary */}
            <div className="p-3 rounded-xl bg-[#FAF6EE] border border-[#E4DCD0] flex items-center justify-between">
              <span className="text-xs font-bold text-[#4A2E20]">Total Amount:</span>
              <span className="text-lg font-black font-mono text-[#2C1A12]">₹{totalPrice}</span>
            </div>

            {/* Action Buttons: WhatsApp / Email / Call */}
            <div className="space-y-2 pt-2">
              {/* WhatsApp Order Button */}
              <button
                type="button"
                onClick={handleWhatsAppOrder}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-md flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4 text-white" />
                Order via WhatsApp (Instant)
              </button>

              <div className="grid grid-cols-2 gap-2">
                {/* Email Quote Button */}
                <button
                  type="button"
                  onClick={handleEmailOrder}
                  className="py-2.5 px-3 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-800 font-bold text-xs transition flex items-center justify-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5 text-gray-600" />
                  Email Quote
                </button>

                {/* Call Admin Button */}
                <button
                  type="button"
                  onClick={handleDirectCall}
                  className="py-2.5 px-3 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-800 font-bold text-xs transition flex items-center justify-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5 text-gray-600" />
                  Call Admin
                </button>
              </div>
            </div>

            <p className="text-[10px] text-gray-400 text-center">
              Direct delivery across India • Fast courier support
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
