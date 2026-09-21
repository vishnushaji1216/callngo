'use client';

import { QRCodeSVG } from 'qrcode.react';
import { Phone, Mail } from 'lucide-react';

interface QRStickerCardProps {
  qrUrl: string;
  tagId?: string;
  carNickname?: string;
  className?: string;
  id?: string;
}

export function QRStickerCard({
  qrUrl,
  tagId,
  carNickname,
  className = '',
  id
}: QRStickerCardProps) {
  return (
    <div
      id={id}
      className={`printable-card w-[350px] min-w-[350px] max-w-[350px] h-[225px] min-h-[225px] max-h-[225px] rounded-2xl overflow-hidden border border-[#523326] shadow-md flex flex-row bg-white break-inside-avoid select-none shrink-0 ${className}`}
      style={{ boxSizing: 'border-box' }}
    >
      {/* LEFT PANEL: Deep Rich Chocolate Brown */}
      <div className="w-[50%] min-w-[50%] max-w-[50%] bg-[#382016] p-3 text-[#FAF6EE] flex flex-col items-center text-center justify-between border-r border-[#4A2E20] overflow-hidden shrink-0">
        {/* Wheel Logo (blends seamlessly with dark brown) */}
        <div className="w-12 h-12 flex items-center justify-center shrink-0">
          <img
            src="/logo.png"
            alt="CallNGo Wheel Logo"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Underlined Headline matching reference */}
        <div className="my-0.5 shrink-0">
          <h4 className="text-[12px] font-bold font-serif text-[#FAF6EE] leading-tight underline underline-offset-3 decoration-[#E8DFC9] whitespace-nowrap">
            Scan the QR
          </h4>
          <h5 className="text-[12px] font-bold font-serif text-[#FAF6EE] underline underline-offset-3 decoration-[#E8DFC9] leading-tight whitespace-nowrap mt-0.5">
            connect the owner
          </h5>
        </div>

        {/* Action Badge Pill: Call & Message */}
        <div className="px-3 py-1 rounded-full bg-[#FAF6EE] text-[#382016] font-bold text-[9.5px] flex items-center justify-center gap-2.5 shadow-xs whitespace-nowrap shrink-0">
          <span className="flex items-center gap-1">
            <Phone className="w-2.5 h-2.5 fill-[#382016] text-[#382016]" />
            Call
          </span>
          <span className="flex items-center gap-1">
            <Mail className="w-2.5 h-2.5 text-[#382016]" />
            Message
          </span>
        </div>

        {/* 4 Feature Bullets matching reference */}
        <ul className="text-left text-[8.5px] space-y-0.5 text-[#FAF6EE] font-serif w-full pl-0.5 leading-snug shrink-0">
          <li className="whitespace-nowrap">• Please move your car</li>
          <li className="whitespace-nowrap">• Your headlight is on</li>
          <li className="whitespace-nowrap">• Call incase of accident</li>
          <li className="whitespace-nowrap">• Your vehicle is in my way</li>
        </ul>
      </div>

      {/* RIGHT PANEL: Warm Cream */}
      <div className="w-[50%] min-w-[50%] max-w-[50%] bg-[#FBF8EE] p-2.5 text-[#2A160F] flex flex-col items-center justify-between text-center overflow-hidden shrink-0">
        {/* Brand Header: Strict Single Line, Spaced Letters */}
        <div className="text-[11.5px] font-black tracking-[0.25em] font-mono text-[#382016] uppercase whitespace-nowrap pt-0.5 shrink-0">
          CALL N GO
        </div>

        {/* QR Code in Rounded White Card matching reference */}
        <div className="p-1.5 bg-white rounded-2xl shadow-xs border border-[#E8DFC9] flex items-center justify-center my-0.5 shrink-0">
          <QRCodeSVG
            value={qrUrl}
            size={96}
            bgColor="#FFFFFF"
            fgColor="#382016"
            level="H"
            marginSize={1}
          />
        </div>

        {/* Tag ID (compact when available) */}
        {tagId ? (
          <div className="text-[8px] font-mono font-bold text-[#7A6657] uppercase tracking-wider whitespace-nowrap shrink-0">
            TAG: {tagId.substring(0, 13)}
          </div>
        ) : null}

        {/* Bottom Website Pill matching reference */}
        <div className="pb-0.5 shrink-0">
          <span className="px-3.5 py-0.5 rounded-md bg-[#382016] text-[#FAF6EE] text-[8.5px] font-bold tracking-wider font-mono shadow-xs inline-block whitespace-nowrap">
            callngo.in
          </span>
        </div>
      </div>
    </div>
  );
}
