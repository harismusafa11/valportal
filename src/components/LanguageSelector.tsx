import React, { useState } from 'react';
import { useLanguage, LANGUAGES, LanguageCode } from '../lib/LanguageContext';
import { ChevronDown, Globe } from 'lucide-react';

export default function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const activeLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 border border-white/10 hover:border-[#00F0FF] bg-[#161A1E] text-[10px] font-mono font-bold tracking-widest text-gray-300 hover:text-white transition duration-150 flex items-center space-x-1.5 cursor-pointer uppercase"
      >
        <Globe size={11} className="text-[#00F0FF]" />
        <span>{activeLang.flag} {activeLang.name}</span>
        <ChevronDown size={10} className={`transition-transform duration-200 text-gray-500 ${isOpen ? 'rotate-180 text-[#00F0FF]' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40 cursor-default" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 mt-2 w-40 bg-[#0F1215] border border-white/10 shadow-2xl z-50 rounded-none p-1 space-y-0.5 max-h-60 overflow-y-auto">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-[10px] font-mono font-bold transition flex items-center justify-between border border-transparent hover:border-white/5 cursor-pointer ${
                  lang.code === language 
                    ? 'bg-[#00F0FF]/5 text-white border-[#00F0FF]/20' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{lang.flag} {lang.name}</span>
                {lang.code === language && <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF]" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
