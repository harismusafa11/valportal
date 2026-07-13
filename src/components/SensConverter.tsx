import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ArrowLeft, 
  HelpCircle, 
  Copy, 
  Check, 
  ChevronDown, 
  Target, 
  Activity, 
  Sparkles, 
  Bookmark, 
  Info,
  Maximize2
} from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';

interface SensConverterProps {
  onBackToHome: () => void;
}

interface GameDefinition {
  id: string;
  name: string;
  shortName: string;
  conversionFactor: number; // Factor to divide source by to get Valorant (or multiply for Fortnite)
  isMultiply: boolean;
  defaultSens: number;
  minSens: number;
  maxSens: number;
  step: number;
  color: string;
}

const GAMES_LIST: GameDefinition[] = [
  { 
    id: 'cs2', 
    name: 'CS2 / CS:GO', 
    shortName: 'CS2', 
    conversionFactor: 3.1818, 
    isMultiply: false, 
    defaultSens: 2.5, 
    minSens: 0.1, 
    maxSens: 10.0, 
    step: 0.01, 
    color: '#E0A92E' 
  },
  { 
    id: 'apex', 
    name: 'Apex Legends', 
    shortName: 'APEX', 
    conversionFactor: 3.1818, 
    isMultiply: false, 
    defaultSens: 2.5, 
    minSens: 0.1, 
    maxSens: 10.0, 
    step: 0.1, 
    color: '#D82A2A' 
  },
  { 
    id: 'ow2', 
    name: 'Overwatch 2 / Destiny 2', 
    shortName: 'OW2', 
    conversionFactor: 10.6, 
    isMultiply: false, 
    defaultSens: 5.0, 
    minSens: 0.5, 
    maxSens: 50.0, 
    step: 0.05, 
    color: '#F99E1A' 
  },
  { 
    id: 'fortnite', 
    name: 'Fortnite', 
    shortName: 'FORTNITE', 
    conversionFactor: 0.126, 
    isMultiply: true, 
    defaultSens: 8.0, 
    minSens: 0.5, 
    maxSens: 100.0, 
    step: 0.1, 
    color: '#F4E842' 
  },
  { 
    id: 'r6s', 
    name: 'Rainbow Six Siege', 
    shortName: 'R6S', 
    conversionFactor: 12.2, 
    isMultiply: false, 
    defaultSens: 50.0, 
    minSens: 1.0, 
    maxSens: 100.0, 
    step: 1, 
    color: '#1E63C4' 
  },
  { 
    id: 'valorant', 
    name: 'Valorant', 
    shortName: 'VAL', 
    conversionFactor: 1.0, 
    isMultiply: false, 
    defaultSens: 0.35, 
    minSens: 0.01, 
    maxSens: 4.0, 
    step: 0.001, 
    color: '#FF4655' 
  }
];

export default function SensConverter({ onBackToHome }: SensConverterProps) {
  const { language } = useLanguage();

  const localT = (key: string, replacements?: Record<string, string>) => {
    const dicts: Record<string, Record<string, string>> = {
      en: {
        TITLE: 'MOUSE SENSITIVITY CONVERTER',
        SUBTITLE: 'SENSITIVITY CONVERTER ENGINE',
        STATUS_ACTIVE: 'STATUS: ACTIVE // PRECISION MODE',
        CROSS_GAME: 'CROSS-GAME MOUSE CONVERSIONS',
        TRANSLATOR: 'SENSITIVITY TRANSLATOR',
        DESCRIPTION: 'Convert hipfire and scoped zoom values between Valorant and other FPS games with mouse DPI adjustments and physical cm/360 distance telemetry.',
        SOURCE_SETTINGS: '01 // SOURCE SETTINGS',
        SELECT_SOURCE: 'SELECT SOURCE GAME',
        SELECTED: 'SELECTED',
        RETURN_HOME: 'Back to Home'
      },
      id: {
        TITLE: 'KONVERTER SENSITIVITAS MOUSE',
        SUBTITLE: 'MESIN KONVERTER SENSITIVITAS',
        STATUS_ACTIVE: 'STATUS: AKTIF // MODE PRESISI',
        CROSS_GAME: 'KONVERSI MOUSE ANTAR-GAME',
        TRANSLATOR: 'TRANSLATOR SENSITIVITAS',
        DESCRIPTION: 'Konversikan nilai hipfire dan zoom teropong antara Valorant dan game FPS lainnya dengan penyesuaian DPI mouse dan telemetri jarak cm/360 fisik.',
        SOURCE_SETTINGS: '01 // PENGATURAN SUMBER',
        SELECT_SOURCE: 'PILIH GAME SUMBER',
        SELECTED: 'TERPILIH',
        RETURN_HOME: 'Kembali ke Beranda'
      }
    };
    let text = dicts[language]?.[key] || dicts.en?.[key] || key; // fallback to English dictionary first, then key
    if (replacements) {
      Object.entries(replacements).forEach(([placeholder, val]) => {
        text = text.replace(new RegExp(`{${placeholder}}`, 'g'), val);
      });
    }
    return text;
  };

  const [sourceGame, setSourceGame] = useState<GameDefinition>(GAMES_LIST[0]);
  const [sourceSens, setSourceSens] = useState<number>(GAMES_LIST[0].defaultSens);
  const [sourceDpi, setSourceDpi] = useState<number>(800);
  const [targetDpi, setTargetDpi] = useState<number>(800);
  
  // Custom Game Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Scoped sensitivity states
  const [scopedMultiplier, setScopedMultiplier] = useState<number>(1.0);
  const [isScopedOpen, setIsScopedOpen] = useState(false);

  // Copy success animation state
  const [copied, setCopied] = useState(false);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update default sensitivities when source game changes
  const handleSelectGame = (game: GameDefinition) => {
    setSourceGame(game);
    setSourceSens(game.defaultSens);
    setIsDropdownOpen(false);
  };

  // Convert inputs to Valorant Hipfire Sens
  const valorantSens = useMemo(() => {
    let baseValSens = 0;
    if (sourceGame.id === 'valorant') {
      baseValSens = sourceSens;
    } else if (sourceGame.isMultiply) {
      baseValSens = sourceSens * sourceGame.conversionFactor;
    } else {
      baseValSens = sourceSens / sourceGame.conversionFactor;
    }
    
    // Scale for changes in DPI
    const finalValSens = baseValSens * (sourceDpi / targetDpi);
    return parseFloat(finalValSens.toFixed(4));
  }, [sourceGame, sourceSens, sourceDpi, targetDpi]);

  // Save converted Valorant sensitivity to localStorage for Unified Profile
  useEffect(() => {
    try {
      const sensData = {
        sens: parseFloat(valorantSens.toFixed(4)),
        dpi: targetDpi,
        edpi: parseFloat((valorantSens * targetDpi).toFixed(1))
      };
      localStorage.setItem('valportal_user_settings', JSON.stringify(sensData));
    } catch (_) {}
  }, [valorantSens, targetDpi]);

  // eDPI (Effective DPI)
  const eDpi = useMemo(() => {
    return parseFloat((valorantSens * targetDpi).toFixed(1));
  }, [valorantSens, targetDpi]);

  // cm/360 Calculation
  const cmPer360 = useMemo(() => {
    if (valorantSens <= 0 || targetDpi <= 0) return 0;
    // Yaw constant of Valorant is 0.07 deg/tick
    const distance = 13062.857 / (valorantSens * targetDpi);
    return parseFloat(distance.toFixed(2));
  }, [valorantSens, targetDpi]);

  // Scoped sensitivities
  const scopedSens = useMemo(() => {
    return parseFloat((valorantSens * scopedMultiplier).toFixed(4));
  }, [valorantSens, scopedMultiplier]);

  const handleCopy = () => {
    navigator.clipboard.writeText(valorantSens.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0A0E11] text-white scanlines font-sans pb-16">
      
      {/* HEADER NAVBAR */}
      <header className="border-b border-white/5 bg-[#0F1215]/95 sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToHome}
            className="p-1.5 hover:bg-white/5 border border-white/5 hover:border-white/20 transition rounded cursor-pointer mr-2"
            title={localT('RETURN_HOME')}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <span className="font-rajdhani font-bold tracking-widest text-lg text-white leading-none block">VALPORTAL</span>
            <h1 className="text-[9px] font-mono text-[#FF4655] tracking-widest uppercase hidden sm:block font-bold">{localT('SUBTITLE')}</h1>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="bg-[#12161A] border border-white/5 px-3 py-1 text-[8px] font-mono text-gray-500 uppercase tracking-widest hidden sm:block">
            {localT('STATUS_ACTIVE')}
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-6 mt-8">
        
        {/* Title area */}
        <div className="border-b border-white/5 pb-4 mb-8">
          <span className="text-[9px] font-mono text-[#00F0FF] tracking-widest uppercase block font-bold">
            {localT('CROSS_GAME')}
          </span>
          <h2 className="font-rajdhani text-2xl font-black uppercase text-white tracking-widest mt-0.5">
            {localT('TRANSLATOR')}
          </h2>
          <p className="text-xs text-gray-500 mt-1 max-w-xl">
            {localT('DESCRIPTION')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Input Settings */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Card 1: Input Setup */}
            <div className="bg-[#12161A] border border-white/5 p-6 relative">
              <div className="text-[8px] font-mono text-[#FF4655] tracking-widest uppercase font-bold mb-4 block">
                {localT('SOURCE_SETTINGS')}
              </div>

              <div className="space-y-5">
                
                {/* Custom Dropdown Game Selector */}
                <div className="space-y-2">
                  <label className="text-[9px] font-mono text-gray-400 uppercase tracking-widest block font-bold">
                    {localT('SELECT_SOURCE')}
                  </label>
                  
                  <div className="relative" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full bg-[#0A0E11] text-left px-4 py-3 border border-white/5 hover:border-white/15 focus:outline-none flex items-center justify-between text-xs font-mono tracking-wider cursor-pointer uppercase text-white"
                    >
                      <div className="flex items-center space-x-3">
                        <span 
                          className="w-2.5 h-2.5 rounded-full inline-block" 
                          style={{ backgroundColor: sourceGame.color }}
                        />
                        <span>{sourceGame.name}</span>
                      </div>
                      <ChevronDown size={14} className={`text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isDropdownOpen && (
                      <div className="absolute left-0 right-0 mt-1 bg-[#0F1215] border border-white/10 shadow-2xl z-40 p-1">
                        {GAMES_LIST.map((game) => (
                          <button
                            key={game.id}
                            type="button"
                            onClick={() => handleSelectGame(game)}
                            className="w-full text-left px-4 py-2.5 hover:bg-white/5 border border-transparent hover:border-white/5 text-xs font-mono tracking-wider text-gray-400 hover:text-white uppercase transition flex items-center justify-between cursor-pointer"
                          >
                            <div className="flex items-center space-x-3">
                              <span 
                                className="w-2 h-2 rounded-full inline-block" 
                                style={{ backgroundColor: game.color }}
                              />
                              <span>{game.name}</span>
                            </div>
                            {sourceGame.id === game.id && (
                              <span className="text-[8px] font-mono text-[#00F0FF] tracking-widest font-black uppercase">
                                {localT('SELECTED')}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Source Hipfire Sensitivity & Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-mono text-gray-400 uppercase tracking-widest font-bold">
                      {sourceGame.shortName} HIPFIRE SENSITIVITY
                    </label>
                    <input
                      type="number"
                      value={sourceSens}
                      step={sourceGame.step}
                      min={sourceGame.minSens}
                      max={sourceGame.maxSens}
                      onChange={(e) => setSourceSens(parseFloat(e.target.value) || 0)}
                      className="bg-[#0A0E11] text-white border border-white/5 focus:border-[#FF4655] focus:outline-none w-20 text-center py-1 text-xs font-mono rounded-none uppercase"
                    />
                  </div>

                  <input
                    type="range"
                    min={sourceGame.minSens}
                    max={sourceGame.maxSens}
                    step={sourceGame.step}
                    value={sourceSens}
                    onChange={(e) => setSourceSens(parseFloat(e.target.value))}
                    className="w-full accent-[#FF4655] h-1 bg-[#0A0E11] cursor-pointer"
                  />
                  <div className="flex justify-between text-[7.5px] font-mono text-gray-600 uppercase">
                    <span>MIN: {sourceGame.minSens}</span>
                    <span>MAX: {sourceGame.maxSens}</span>
                  </div>
                </div>

                {/* DPI Dual Inputs */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-mono text-gray-400 uppercase tracking-widest block font-bold">
                      SOURCE MOUSE DPI
                    </label>
                    <input
                      type="number"
                      value={sourceDpi}
                      step={50}
                      min={100}
                      max={16000}
                      onChange={(e) => setSourceDpi(Math.max(100, parseInt(e.target.value) || 0))}
                      className="w-full bg-[#0A0E11] text-white border border-white/5 focus:border-[#FF4655] focus:outline-none px-3 py-2 text-xs font-mono rounded-none uppercase"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-mono text-gray-400 uppercase tracking-widest block font-bold">
                      TARGET VALORANT DPI
                    </label>
                    <input
                      type="number"
                      value={targetDpi}
                      step={50}
                      min={100}
                      max={16000}
                      onChange={(e) => setTargetDpi(Math.max(100, parseInt(e.target.value) || 0))}
                      className="w-full bg-[#0A0E11] text-white border border-white/5 focus:border-[#FF4655] focus:outline-none px-3 py-2 text-xs font-mono rounded-none uppercase"
                    />
                  </div>
                </div>

              </div>

              {/* Corner decor */}
              <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#FF4655]/30 rounded-xs" />
            </div>

            {/* Collapsible Scoped Sensitivity Card */}
            <div className="bg-[#12161A] border border-white/5 p-6 relative">
              <button
                type="button"
                onClick={() => setIsScopedOpen(!isScopedOpen)}
                className="w-full flex items-center justify-between focus:outline-none cursor-pointer text-left"
              >
                <div>
                  <span className="text-[8px] font-mono text-[#00F0FF] tracking-widest uppercase font-bold block mb-1">
                    02 // TARGET COMPILATION OPTIONS
                  </span>
                  <span className="font-rajdhani text-sm font-black uppercase text-white tracking-widest">
                    SCOPED SENSITIVITY CALCULATOR
                  </span>
                </div>
                <ChevronDown size={16} className={`text-gray-500 transition-transform ${isScopedOpen ? 'rotate-180' : ''}`} />
              </button>

              {isScopedOpen && (
                <div className="mt-6 pt-5 border-t border-white/5 space-y-4 animate-fade-in">
                  <p className="text-[10px] text-gray-400 font-sans leading-relaxed">
                    Set zoom scale multipliers for Operator & Marshal sniper rifles. Recommend 1:1 focal length translation or muscle memory profiles.
                  </p>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[9px] font-mono text-gray-400 uppercase tracking-widest font-bold">
                        ZOOM MULTIPLIER (ZOOM 1)
                      </label>
                      <input
                        type="number"
                        value={scopedMultiplier}
                        step={0.001}
                        min={0.1}
                        max={2.0}
                        onChange={(e) => setScopedMultiplier(parseFloat(e.target.value) || 1.0)}
                        className="bg-[#0A0E11] text-white border border-white/5 focus:border-[#00F0FF] focus:outline-none w-20 text-center py-1 text-xs font-mono rounded-none uppercase"
                      />
                    </div>

                    <input
                      type="range"
                      min={0.5}
                      max={1.5}
                      step={0.001}
                      value={scopedMultiplier}
                      onChange={(e) => setScopedMultiplier(parseFloat(e.target.value))}
                      className="w-full accent-[#00F0FF] h-1 bg-[#0A0E11] cursor-pointer"
                    />
                  </div>

                  {/* Recommendations Row */}
                  <div className="space-y-1.5">
                    <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest font-bold">
                      RECOMMENDED MULTIPLIERS //
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setScopedMultiplier(1.0)}
                        className="px-2.5 py-1 text-[8.5px] font-mono border border-white/5 hover:border-white/10 hover:bg-white/5 text-gray-400 hover:text-white uppercase transition cursor-pointer"
                      >
                        Default: 1.0
                      </button>
                      <button
                        type="button"
                        onClick={() => setScopedMultiplier(0.847)}
                        className="px-2.5 py-1 text-[8.5px] font-mono border border-white/5 hover:border-[#00F0FF] hover:bg-white/5 text-gray-400 hover:text-[#00F0FF] uppercase transition cursor-pointer"
                      >
                        CS2 / CS:GO AWP (0.847)
                      </button>
                    </div>
                  </div>

                  {/* Zoom Preview Panel */}
                  <div className="bg-[#0A0E11] border border-white/5 p-4 flex items-center justify-between mt-2">
                    <div>
                      <span className="text-[7.5px] font-mono text-gray-500 uppercase tracking-widest block font-bold">
                        SCOPED ZOOM PREVIEW
                      </span>
                      <span className="font-rajdhani text-base font-black text-[#00F0FF] tracking-wider block mt-0.5">
                        {scopedSens}
                      </span>
                    </div>
                    <div className="text-right text-[7.5px] font-mono text-gray-500 uppercase">
                      Calculated zoom scale sens
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: Results Dashboard */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Main converted sensitivity */}
            <div className="bg-[#12161A] border border-white/5 p-6 relative flex flex-col justify-between h-72">
              <div>
                <span className="text-[8px] font-mono text-[#00F0FF] tracking-widest uppercase font-bold block mb-1">
                  TELEMETRY REPORT //
                </span>
                <h3 className="font-rajdhani text-lg font-black uppercase text-white tracking-widest border-b border-white/5 pb-2">
                  CONVERTED HIPFIRE SENS
                </h3>
              </div>

              {/* Large Output display */}
              <div className="my-auto text-center py-4">
                <span className="text-6xl md:text-7xl font-rajdhani font-black text-[#FF4655] tracking-tighter block leading-none">
                  {valorantSens}
                </span>
                <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest mt-1 block">
                  VALORANT IN-GAME SETTING
                </span>
              </div>

              {/* Clipboard Action */}
              <button
                type="button"
                onClick={handleCopy}
                className={`w-full py-2.5 text-[10px] font-mono font-bold tracking-widest uppercase transition flex items-center justify-center space-x-2 border cursor-pointer ${
                  copied
                    ? 'bg-emerald-500 border-emerald-500 text-black'
                    : 'bg-transparent border-white/10 text-gray-300 hover:border-[#FF4655] hover:text-[#FF4655]'
                }`}
              >
                {copied ? (
                  <>
                    <Check size={12} />
                    <span>COPIED CONFIG CODE!</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span>COPY VALUE</span>
                  </>
                )}
              </button>
            </div>

            {/* Detailed Physics Telemetry (cm/360 and eDPI) */}
            <div className="grid grid-cols-2 gap-4">
              
              {/* eDPI display */}
              <div className="bg-[#12161A] border border-white/5 p-5 flex flex-col justify-between">
                <div>
                  <span className="text-[7.5px] font-mono text-gray-500 uppercase tracking-widest block font-bold">
                    EFFECTIVE DPI //
                  </span>
                  <h4 className="font-rajdhani text-xs font-bold text-white uppercase tracking-widest mt-0.5">
                    eDPI TELEMETRY
                  </h4>
                </div>
                <div className="py-5 text-left">
                  <span className="text-3xl font-rajdhani font-black text-white tracking-tight block">
                    {eDpi}
                  </span>
                  <span className="text-[7.5px] font-mono text-gray-600 uppercase tracking-widest mt-0.5 block">
                    Sens x DPI
                  </span>
                </div>
              </div>

              {/* cm/360 display */}
              <div className="bg-[#12161A] border border-white/5 p-5 flex flex-col justify-between">
                <div>
                  <span className="text-[7.5px] font-mono text-gray-500 uppercase tracking-widest block font-bold">
                    PHYSICAL DISTANCE //
                  </span>
                  <h4 className="font-rajdhani text-xs font-bold text-white uppercase tracking-widest mt-0.5">
                    CM / 360° ROTATION
                  </h4>
                </div>
                <div className="py-5 text-left">
                  <span className="text-3xl font-rajdhani font-black text-white tracking-tight block">
                    {cmPer360} cm
                  </span>
                  <span className="text-[7.5px] font-mono text-gray-600 uppercase tracking-widest mt-0.5 block">
                    Mouse travel per rotation
                  </span>
                </div>
              </div>

            </div>

          </div>

        </div>

      </main>

    </div>
  );
}
