import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  ChevronLeft, 
  RotateCcw, 
  Target, 
  Activity, 
  Check, 
  Play, 
  Info,
  ChevronRight,
  TrendingUp,
  Bookmark
} from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';

interface SensFinderProps {
  onBackToHome: () => void;
}

interface CalibrationStep {
  step: number;
  lowerBound: number;
  upperBound: number;
  average: number;
  choice: 'low' | 'high' | null;
}

export default function SensFinder({ onBackToHome }: SensFinderProps) {
  const { language } = useLanguage();

  const localT = (key: string, replacements?: Record<string, string>) => {
    const dicts: Record<string, Record<string, string>> = {
      en: {
        TITLE: 'PSA SENSITIVITY FINDER',
        SUBTITLE: 'AIM SENSITIVITY FINDER (PSA)',
        STATUS_ACTIVE: 'STATUS: ACTIVE // PSA METHOD',
        PSA_METHOD: 'PERFECT SENSITIVITY APPROACH (PSA)',
        FINDER_TITLE: 'AIM SENSITIVITY WIZARD',
        DESCRIPTION: 'Find your perfect custom in-game sensitivity using the bisection calibration algorithm. Test boundaries in game and select the most stable response.',
        SETUP: 'SOFTWARE SETUP',
        TESTING: 'CALIBRATION TESTING',
        COMPLETED: 'CALIBRATION COMPLETE',
        RETURN_HOME: 'Back to Home'
      },
      id: {
        TITLE: 'PENCARI SENSITIVITAS PSA',
        SUBTITLE: 'MESIN KALIBRASI SENSITIVITAS',
        STATUS_ACTIVE: 'STATUS: AKTIF // METODE PSA',
        PSA_METHOD: 'METODE SENSITIVITAS SEMPURNA (PSA)',
        FINDER_TITLE: 'KALIBRASI SENSITIVITAS',
        DESCRIPTION: 'Temukan sensitivitas mouse ideal Anda menggunakan pendekatan kalkulasi matematika biner (Metode PSA) yang terstruktur.',
        SETUP: 'PENGATURAN PERANGKAT LUNAK',
        TESTING: 'PENGUJIAN KALIBRASI',
        COMPLETED: 'KALIBRASI SELESAI',
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

  const [step, setStep] = useState<number>(0); // 0: Setup, 1-7: Testing, 8: Completed
  const [startingSens, setStartingSens] = useState<number>(0.4);
  const [mouseDpi, setMouseDpi] = useState<number>(800);
  
  // Math bounds states
  const [lowerBound, setLowerBound] = useState<number>(0);
  const [upperBound, setUpperBound] = useState<number>(0);
  const [average, setAverage] = useState<number>(0);

  // History stack for Undo
  const [history, setHistory] = useState<CalibrationStep[]>([]);

  // Save calibrated sensitivity to localStorage for Unified Profile
  useEffect(() => {
    if (step === 8) {
      try {
        const sensData = {
          sens: parseFloat(average.toFixed(4)),
          dpi: mouseDpi,
          edpi: parseFloat((average * mouseDpi).toFixed(1))
        };
        localStorage.setItem('valportal_user_settings', JSON.stringify(sensData));
      } catch (_) {}
    }
  }, [step, average, mouseDpi]);

  // Initialize bounds and transition to Step 1
  const handleStartCalibration = () => {
    const initialLower = startingSens * 0.5;
    const initialUpper = startingSens * 1.5;
    
    setLowerBound(initialLower);
    setUpperBound(initialUpper);
    setAverage(startingSens);
    setHistory([]);
    setStep(1);
  };

  // Handle Low Sensitivity Choice
  const handleChooseLow = () => {
    // Record current state before changing
    const currentRecord: CalibrationStep = {
      step,
      lowerBound,
      upperBound,
      average,
      choice: 'low'
    };

    setHistory([...history, currentRecord]);

    // Update bounds
    const nextUpper = average;
    const nextAverage = (lowerBound + nextUpper) / 2;

    setUpperBound(nextUpper);
    setAverage(nextAverage);
    setStep(prev => prev + 1);
  };

  // Handle High Sensitivity Choice
  const handleChooseHigh = () => {
    // Record current state before changing
    const currentRecord: CalibrationStep = {
      step,
      lowerBound,
      upperBound,
      average,
      choice: 'high'
    };

    setHistory([...history, currentRecord]);

    // Update bounds
    const nextLower = average;
    const nextAverage = (nextLower + upperBound) / 2;

    setLowerBound(nextLower);
    setAverage(nextAverage);
    setStep(prev => prev + 1);
  };

  // Undo Last Choice
  const handleUndo = () => {
    if (history.length === 0) return;
    
    const prevHistory = [...history];
    const lastRecord = prevHistory.pop()!;
    
    setHistory(prevHistory);
    setStep(lastRecord.step);
    setLowerBound(lastRecord.lowerBound);
    setUpperBound(lastRecord.upperBound);
    setAverage(lastRecord.average);
  };

  // Reset/Restart calibration back to Step 0 config
  const handleRestart = () => {
    setStep(0);
    setHistory([]);
  };

  // Calculations for final output formatting
  const finalSens = parseFloat(average.toFixed(4));
  const finalEdpi = parseFloat((finalSens * mouseDpi).toFixed(1));
  const finalCm360 = parseFloat((13062.857 / (finalSens * mouseDpi)).toFixed(2));

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
            <h1 className="text-[9px] font-mono text-[#FF4655] tracking-widest uppercase hidden sm:block font-bold">{localT('TITLE')}</h1>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {step > 0 && step <= 7 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleUndo}
                className="px-2.5 py-1 text-[8.5px] font-mono border border-white/5 hover:border-white/25 hover:bg-white/5 text-gray-400 hover:text-white transition flex items-center space-x-1 cursor-pointer rounded-xs"
              >
                <ChevronLeft size={10} />
                <span className="hidden xs:inline">UNDO</span>
              </button>
              <button
                onClick={handleRestart}
                className="px-2.5 py-1 text-[8.5px] font-mono border border-white/5 hover:border-[#FF4655] hover:bg-[#FF4655]/5 text-gray-400 hover:text-[#FF4655] transition flex items-center space-x-1 cursor-pointer rounded-xs"
              >
                <RotateCcw size={10} />
                <span className="hidden xs:inline">RESET</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-4xl mx-auto px-6 mt-8">
        
        {/* Title plate */}
        <div className="border-b border-white/5 pb-4 mb-8">
          <span className="text-[9px] font-mono text-[#00F0FF] tracking-widest uppercase block font-bold">
            {localT('PSA_METHOD')}
          </span>
          <h2 className="font-rajdhani text-2xl font-black uppercase text-white tracking-widest mt-0.5">
            {localT('FINDER_TITLE')}
          </h2>
          <p className="text-xs text-gray-500 mt-1 max-w-xl">
            {localT('DESCRIPTION')}
          </p>
        </div>

        {/* STEP 0: Configuration Form */}
        {step === 0 && (
          <div className="bg-[#12161A] border border-white/5 p-6 md:p-8 max-w-xl mx-auto relative">
            <div className="text-[8px] font-mono text-[#FF4655] tracking-widest uppercase font-bold mb-6 block">
              INITIAL CALIBRATION SETUP //
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-mono text-gray-400 uppercase tracking-widest block font-bold">
                  STARTING SENSITIVITY (CURRENT COMFORTABLE VALUE)
                </label>
                <input
                  type="number"
                  step={0.01}
                  min={0.05}
                  max={5.0}
                  value={startingSens}
                  onChange={(e) => setStartingSens(parseFloat(e.target.value) || 0.4)}
                  className="w-full bg-[#0A0E11] text-white border border-white/5 focus:border-[#FF4655] focus:outline-none px-4 py-3 text-xs font-mono rounded-none uppercase"
                  placeholder="e.g. 0.4"
                />
                <span className="text-[7.5px] font-mono text-gray-500 block">
                  The wizard will use this to calculate the initial boundaries (+/- 50%).
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-mono text-gray-400 uppercase tracking-widest block font-bold">
                  MOUSE DPI
                </label>
                <input
                  type="number"
                  step={50}
                  min={100}
                  max={16000}
                  value={mouseDpi}
                  onChange={(e) => setMouseDpi(parseInt(e.target.value) || 800)}
                  className="w-full bg-[#0A0E11] text-white border border-white/5 focus:border-[#FF4655] focus:outline-none px-4 py-3 text-xs font-mono rounded-none uppercase"
                  placeholder="e.g. 800"
                />
              </div>

              <button
                type="button"
                onClick={handleStartCalibration}
                className="w-full py-3 bg-[#FF4655] hover:bg-[#FF4655]/90 text-white font-rajdhani font-black tracking-widest text-xs uppercase transition duration-150 flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-[#FF4655]/10 hover:shadow-[#FF4655]/20"
              >
                <Play size={12} fill="white" />
                <span>START WIZARD CALIBRATION</span>
              </button>
            </div>

            {/* Corner accent decoration */}
            <div className="absolute top-2 right-2 w-2.5 h-2.5 border-t border-r border-[#FF4655]/40" />
            <div className="absolute bottom-2 left-2 w-2.5 h-2.5 border-b border-l border-[#FF4655]/40" />
          </div>
        )}

        {/* STEPS 1 - 7: Calibration Cycles */}
        {step >= 1 && step <= 7 && (
          <div className="space-y-8">
            
            {/* Wizard header details and progress */}
            <div className="bg-[#12161A] border border-white/5 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">WIZARD TRACKING SYSTEM</span>
                <h4 className="font-rajdhani text-sm font-bold text-white uppercase tracking-widest mt-0.5">
                  TESTING LOOP: CYCLE {step} OF 7
                </h4>
              </div>

              {/* Progress bar */}
              <div className="w-full md:w-64 space-y-1.5">
                <div className="flex justify-between text-[7px] font-mono text-gray-500 uppercase tracking-widest">
                  <span>PROGRESS</span>
                  <span>{Math.round((step / 7) * 100)}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#0A0E11] border border-white/5 relative overflow-hidden">
                  <div 
                    className="h-full bg-[#FF4655] transition-all duration-300"
                    style={{ width: `${(step / 7) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Comparison Options Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Option A: Low Sens Card */}
              <div className="bg-[#12161A] border border-white/5 p-6 hover:border-white/10 transition flex flex-col justify-between h-72 relative rounded-none">
                <div>
                  <span className="text-[7.5px] font-mono text-gray-500 tracking-widest uppercase font-bold block mb-1">
                    OPTION A //
                  </span>
                  <h3 className="font-rajdhani text-sm font-bold text-gray-300 uppercase tracking-widest">
                    LOW SENSITIVITY
                  </h3>
                </div>

                <div className="my-auto text-center py-4">
                  <span className="text-5xl md:text-6xl font-rajdhani font-black text-gray-400 tracking-tighter block leading-none">
                    {lowerBound.toFixed(4)}
                  </span>
                  <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest mt-1 block">
                    eDPI: {parseFloat((lowerBound * mouseDpi).toFixed(1))}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleChooseLow}
                  className="w-full py-2.5 bg-transparent border border-white/10 hover:border-gray-400 text-gray-300 hover:text-white font-mono text-[10px] font-bold tracking-widest uppercase transition cursor-pointer"
                >
                  PREFER LOW SENS
                </button>

                <div className="absolute top-1.5 right-1.5 w-1 h-1 bg-gray-600" />
              </div>

              {/* Option B: High Sens Card */}
              <div className="bg-[#12161A] border border-white/5 p-6 hover:border-[#00F0FF]/30 transition flex flex-col justify-between h-72 relative rounded-none">
                <div>
                  <span className="text-[7.5px] font-mono text-[#00F0FF] tracking-widest uppercase font-bold block mb-1">
                    OPTION B //
                  </span>
                  <h3 className="font-rajdhani text-sm font-bold text-[#00F0FF] uppercase tracking-widest">
                    HIGH SENSITIVITY
                  </h3>
                </div>

                <div className="my-auto text-center py-4">
                  <span className="text-5xl md:text-6xl font-rajdhani font-black text-[#00F0FF] tracking-tighter block leading-none">
                    {upperBound.toFixed(4)}
                  </span>
                  <span className="text-[8px] font-mono text-[#00F0FF]/40 uppercase tracking-widest mt-1 block">
                    eDPI: {parseFloat((upperBound * mouseDpi).toFixed(1))}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleChooseHigh}
                  className="w-full py-2.5 bg-[#00F0FF]/5 border border-[#00F0FF]/25 hover:border-[#00F0FF] text-[#00F0FF] font-mono text-[10px] font-bold tracking-widest uppercase transition cursor-pointer"
                >
                  PREFER HIGH SENS
                </button>

                <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#00F0FF]/40 rounded-xs animate-pulse" />
              </div>

            </div>

            {/* Instruction Panel */}
            <div className="bg-[#12161A] border border-white/5 p-5 space-y-3 relative">
              <div className="flex items-center space-x-2 border-b border-white/5 pb-2">
                <Info size={12} className="text-[#FF4655]" />
                <span className="text-[9px] font-mono text-white tracking-widest uppercase font-bold">
                  CALIBRATION TRAINING INSTRUCTIONS
                </span>
              </div>
              <ul className="space-y-2 text-[10.5px] font-sans text-gray-400 leading-relaxed list-decimal pl-4">
                <li>Buka game <strong>VALORANT</strong> dan muat halaman <strong>Training Range</strong> (The Range).</li>
                <li>Ubah sensitivitas bidikan game Anda menjadi opsi pertama (<strong>{lowerBound.toFixed(4)}</strong>). Lakukan latihan menembak bot, penelusuran target (*target tracking*), dan tembakan membalik (*flick shots*) selama kurang lebih 30 detik.</li>
                <li>Ganti sensitivitas game Anda menjadi opsi kedua (<strong>{upperBound.toFixed(4)}</strong>) dan ulangi metode latihan menembak yang sama selama 30 detik.</li>
                <li>Bandingkan keduanya dengan cermat. Klik tombol opsi di atas yang memberikan kontrol bidikan paling stabil dan pergerakan tangan yang paling nyaman bagi Anda untuk melanjutkan ke langkah berikutnya.</li>
              </ul>
            </div>

          </div>
        )}

        {/* STEP 8: Completed Calibration Result */}
        {step > 7 && (
          <div className="space-y-8 animate-fade-in">
            
            {/* Large Banner Output */}
            <div className="bg-[#12161A] border border-white/5 p-6 md:p-8 relative flex flex-col items-center justify-between text-center min-h-[300px]">
              
              <div className="w-full flex items-center justify-between border-b border-white/5 pb-3 mb-6">
                <div className="text-left">
                  <span className="text-[8px] font-mono text-[#00F0FF] tracking-widest uppercase font-bold block">
                    CALIBRATION COMPLETE // SYSTEM REPORT
                  </span>
                  <h3 className="font-rajdhani text-sm font-bold text-white uppercase tracking-widest mt-0.5">
                    PERFECT SENSITIVITY CALCULATION
                  </h3>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 flex items-center space-x-1.5">
                  <Check size={10} className="text-emerald-400" />
                  <span className="text-[7.5px] font-mono text-emerald-400 font-bold uppercase tracking-widest">
                    STABLE SOLVED
                  </span>
                </div>
              </div>

              <div className="my-auto py-4">
                <span className="text-6xl md:text-8xl font-rajdhani font-black text-[#FF4655] tracking-tighter block leading-none">
                  {finalSens}
                </span>
                <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mt-2 block font-bold">
                  YOUR SCIENTIFIC PERFECT SENSITIVITY
                </span>
              </div>

              <button
                type="button"
                onClick={handleRestart}
                className="w-full max-w-sm py-2.5 bg-[#FF4655]/5 border border-[#FF4655]/20 hover:border-[#FF4655] text-gray-400 hover:text-white font-mono text-[10px] font-bold tracking-widest uppercase transition cursor-pointer"
              >
                RESTART NEW CALIBRATION
              </button>

              <div className="absolute top-2 right-2 w-2 h-2 border-t border-r border-zinc-700" />
              <div className="absolute bottom-2 left-2 w-2 h-2 border-b border-l border-zinc-700" />
            </div>

            {/* Calculated Telemetries */}
            <div className="grid grid-cols-2 gap-4">
              
              {/* eDPI */}
              <div className="bg-[#12161A] border border-white/5 p-5">
                <span className="text-[7.5px] font-mono text-gray-500 uppercase tracking-widest block font-bold">
                  SOLVED eDPI //
                </span>
                <span className="text-2xl font-rajdhani font-black text-white tracking-tight block mt-1">
                  {finalEdpi}
                </span>
                <span className="text-[7px] font-mono text-gray-600 uppercase mt-0.5 block">
                  Mouse DPI set to: {mouseDpi}
                </span>
              </div>

              {/* cm/360 */}
              <div className="bg-[#12161A] border border-white/5 p-5">
                <span className="text-[7.5px] font-mono text-gray-500 uppercase tracking-widest block font-bold">
                  PHYSICAL DISTANCE //
                </span>
                <span className="text-2xl font-rajdhani font-black text-white tracking-tight block mt-1">
                  {finalCm360} cm
                </span>
                <span className="text-[7px] font-mono text-gray-600 uppercase mt-0.5 block">
                  Required mouse travel per 360° turn
                </span>
              </div>

            </div>

            {/* History Table */}
            <div className="bg-[#12161A] border border-white/5 p-5 space-y-4">
              <div className="flex items-center space-x-2 border-b border-white/5 pb-2">
                <TrendingUp size={12} className="text-[#FF4655]" />
                <span className="text-[9px] font-mono text-white tracking-widest uppercase font-bold">
                  CALIBRATION PATH HISTORY (PSA DECISIONS)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full font-mono text-[9px] text-gray-400 text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-gray-500 uppercase text-[8px] tracking-widest">
                      <th className="py-2.5">STEP</th>
                      <th className="py-2.5 text-center">LOWER BOUND</th>
                      <th className="py-2.5 text-center">UPPER BOUND</th>
                      <th className="py-2.5 text-center text-white">MIDPOINT</th>
                      <th className="py-2.5 text-right">DECISION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((record) => (
                      <tr key={record.step} className="border-b border-white/5 hover:bg-white/5 transition">
                        <td className="py-2">{record.step}</td>
                        <td className="py-2 text-center text-gray-500">{record.lowerBound.toFixed(4)}</td>
                        <td className="py-2 text-center text-gray-500">{record.upperBound.toFixed(4)}</td>
                        <td className="py-2 text-center text-white font-bold">{record.average.toFixed(4)}</td>
                        <td className="py-2 text-right">
                          <span className={`px-2 py-0.5 rounded-sm font-bold text-[7.5px] uppercase ${
                            record.choice === 'low'
                              ? 'bg-gray-500/10 text-gray-300 border border-gray-500/20'
                              : 'bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/20'
                          }`}>
                            {record.choice === 'low' ? 'Low Sens' : 'High Sens'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </main>

    </div>
  );
}
