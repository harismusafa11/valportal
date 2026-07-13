import React, { useState } from 'react';
import { ShieldAlert, RotateCw, X } from 'lucide-react';

interface AdBlockModalProps {
  onRefresh: () => void;
}

export default function AdBlockModal({ onRefresh }: AdBlockModalProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md transition-opacity duration-300">
      <div className="relative w-full max-w-md bg-[#12181E] border border-[#FF4655]/20 rounded-2xl p-6 shadow-2xl shadow-[#FF4655]/5 animate-in fade-in zoom-in duration-300">
        
        {/* Close Button */}
        <button 
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#8BA0B8] hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="flex flex-col items-center text-center mt-2">
          <div className="w-14 h-14 bg-[#FF4655]/10 rounded-full flex items-center justify-center text-[#FF4655] mb-4 border border-[#FF4655]/25">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-bold text-white mb-2 tracking-wide font-sans">
            AdBlock Detected
          </h3>
          
          <p className="text-[#8BA0B8] text-sm leading-relaxed mb-6 max-w-[320px]">
            This website is supported by ads. Please disable your AdBlocker so we can continue providing free services.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              onClick={() => {
                onRefresh();
              }}
              className="flex-1 flex items-center justify-center gap-2 bg-[#FF4655] hover:bg-[#E03E4C] text-white py-2.5 px-4 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-[#FF4655]/10 hover:shadow-[#FF4655]/20"
            >
              <RotateCw className="w-4 h-4" />
              Refresh Page
            </button>
            
            <button
              onClick={() => setIsOpen(false)}
              className="flex-1 bg-white/5 hover:bg-white/10 text-[#8BA0B8] hover:text-white py-2.5 px-4 rounded-xl font-semibold text-sm transition-all border border-white/5"
            >
              Continue Anyway
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
