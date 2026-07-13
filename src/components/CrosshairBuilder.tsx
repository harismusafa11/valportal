/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Sliders, 
  Settings, 
  Copy, 
  Check, 
  Info, 
  ArrowLeft, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  Upload, 
  RefreshCw,
  Search,
  Target
} from 'lucide-react';
import crosshairsData from '../data/crosshairs.json';
import { supabase } from '../lib/supabaseClient';
import UserNav from './UserNav';
import { useLanguage } from '../lib/LanguageContext';

interface CrosshairState {
  color: number;          // 0-7, 8 for custom
  customColor: string;    // HEX string e.g. '#00ff00'
  outline: boolean;       // h
  outlineOpacity: number; // o
  outlineThickness: number; // t
  centerDot: boolean;     // d
  centerDotOpacity: number; // a
  centerDotThickness: number; // z
  innerLines: boolean;    // 0b
  innerOpacity: number;   // 0a
  innerLength: number;    // 0l
  innerThickness: number; // 0t
  innerOffset: number;    // 0o
  outerLines: boolean;    // 1b
  outerOpacity: number;   // 1a
  outerLength: number;    // 1l
  outerThickness: number; // 1t
  outerOffset: number;    // 1o
}

const DEFAULT_CROSSHAIR: CrosshairState = {
  color: 5, // Cyan
  customColor: '#00ffff',
  outline: false,
  outlineOpacity: 0.5,
  outlineThickness: 1,
  centerDot: false,
  centerDotOpacity: 1.0,
  centerDotThickness: 2,
  innerLines: true,
  innerOpacity: 1.0,
  innerLength: 4,
  innerThickness: 2,
  innerOffset: 2,
  outerLines: false,
  outerOpacity: 0.35,
  outerLength: 2,
  outerThickness: 2,
  outerOffset: 10,
};

const COLOR_MAP = [
  '#FFFFFF', // 0: White
  '#00FF00', // 1: Green
  '#7FFF00', // 2: Yellow-Green
  '#ADFF2F', // 3: Green-Yellow
  '#FFFF00', // 4: Yellow
  '#00FFFF', // 5: Cyan
  '#FFC0CB', // 6: Pink
  '#FF0000', // 7: Red
];

const COLOR_NAMES = [
  'White',
  'Green',
  'Yellow-Green',
  'Green-Yellow',
  'Yellow',
  'Cyan',
  'Pink',
  'Red',
];

interface ProPlayer {
  name: string;
  team: string;
  code: string;
  logoColor: string;
  avatarInitials: string;
}

// Loaded statically from src/data/crosshairs.json

// Map Background Previews
const MAP_BACKGROUNDS = [
  {
    id: 'ascent',
    name: 'Ascent Box',
    url: 'https://media.valorant-api.com/maps/7eae253f-414f-ab70-a155-949b2b963222/splash.png',
    position: '50% 55%'
  },
  {
    id: 'bind',
    name: 'Bind Hookah',
    url: 'https://media.valorant-api.com/maps/2c9140f1-4f66-8562-ab2c-e4a4ebe52783/splash.png',
    position: '48% 45%'
  },
  {
    id: 'icebox',
    name: 'Icebox Ice',
    url: 'https://media.valorant-api.com/maps/e2ad5c54-4114-a870-9641-8f2175ad0226/splash.png',
    position: '60% 40%'
  },
  {
    id: 'greenscreen',
    name: 'Green Screen',
    url: 'solid',
    color: '#00FF00'
  }
];

interface CrosshairBuilderProps {
  onBackToHome: () => void;
}

export default function CrosshairBuilder({ onBackToHome }: CrosshairBuilderProps) {
  const { language } = useLanguage();

  const localT = (key: string, replacements?: Record<string, string>) => {
    const dicts: Record<string, Record<string, string>> = {
      en: {
        TITLE: 'CROSSHAIR BUILDER',
        SUBTITLE: 'PRO DATABASE & CONFIGURATION TOOL',
        RESET_BUILDER: 'RESET BUILDER',
        PRESET_LIBRARY: 'PRESET LIBRARY',
        MANUAL_CONTROLS: 'MANUAL CONTROLS',
        DATABASE_TITLE: 'PRO & COMMUNITY DATABASE',
        DATABASE_SUB: 'Directly hydrate or copy from our database of {count} profiles',
        SEARCH_PLACEHOLDER: 'SEARCH PLAYER OR TEAM...',
        UPLOAD_BTN: 'UPLOAD CROSSHAIR',
        ALL_CATEGORIES: 'ALL CATEGORIES',
        CODES_SUFFIX: ' CODES',
        NO_CROSSHAIRS: 'NO CROSSHAIRS MATCHING FILTERS',
        IMPORT_EXPORT: 'IMPORT / EXPORT CODE',
        RESET: 'RESET',
        COPY_CODE: 'COPY CODE',
        COPIED: 'COPIED CODE',
        PASTE_PLACEHOLDER: 'PASTE VALORANT CODE HERE...',
        IMPORT: 'LOAD',
        HOW_TO_IMPORT: 'How to Import in Valorant',
        IMPORT_STEP1: '1. Copy the code above using the COPY CODE button.',
        IMPORT_STEP2: '2. Open Valorant, go to Settings > Crosshair.',
        IMPORT_STEP3: '3. Click the Import Profile (Down Arrow) button near the profile selector, paste the code, and click Import.',
        LIVE_PREVIEW: 'LIVE GENERATOR PREVIEW',
        BG_TEST: 'BACKGROUND TEST SCENARIO',
        RETURN_HOME: 'Back to Home'
      },
      id: {
        TITLE: 'PEMBUAT CROSSHAIR',
        SUBTITLE: 'PRESET DATABASE & ALAT KONFIGURASI',
        RESET_BUILDER: 'RESET BUILDER',
        PRESET_LIBRARY: 'PERPUSTAKAAN PRESET',
        MANUAL_CONTROLS: 'KONTROL MANUAL',
        DATABASE_TITLE: 'DATABASE PRO & KOMUNITAS',
        DATABASE_SUB: 'Salin langsung dari database berisi {count} profil pemain',
        SEARCH_PLACEHOLDER: 'CARI PEMAIN ATAU TIM...',
        UPLOAD_BTN: 'UNGHAH CROSSHAIR',
        ALL_CATEGORIES: 'SEMUA KATEGORI',
        CODES_SUFFIX: ' KODE',
        NO_CROSSHAIRS: 'TIDAK ADA CROSSHAIR YANG COCOK',
        IMPORT_EXPORT: 'IMPORT / EKSPOR KODE',
        RESET: 'RESET',
        COPY_CODE: 'SALIN KODE',
        COPIED: 'TERSALIN!',
        PASTE_PLACEHOLDER: 'TEMPEL KODE CROSSHAIR DI SINI...',
        IMPORT: 'IMPORT',
        HOW_TO_IMPORT: 'Cara Import di Valorant',
        IMPORT_STEP1: '1. Salin kode di atas dengan tombol SALIN KODE.',
        IMPORT_STEP2: '2. Buka Valorant, masuk ke Pengaturan > Crosshair.',
        IMPORT_STEP3: '3. Klik tombol Import Profile (Panah ke Bawah) di sebelah pemilih profil, tempel kode, lalu klik Import.',
        LIVE_PREVIEW: 'PRATINJAU GENERATOR LANGSUNG',
        BG_TEST: 'SKENARIO UJI LATAR BELAKANG',
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

  const [crosshair, setCrosshair] = useState<CrosshairState>(DEFAULT_CROSSHAIR);
  const [inputCode, setInputCode] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedBg, setSelectedBg] = useState<string>('ascent');
  
  // Copy notification states for pro player cards
  const [copiedPlayerIndex, setCopiedPlayerIndex] = useState<number | null>(null);

  // Search & Filtering States
  const [proSearchQuery, setProSearchQuery] = useState<string>('');
  const [proCategory, setProCategory] = useState<string>('All');
  const [visibleCount, setVisibleCount] = useState<number>(12);

  // Custom uploaded crosshairs state
  const [customCrosshairs, setCustomCrosshairs] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newCrosshairName, setNewCrosshairName] = useState<string>('');
  const [newCrosshairCategory, setNewCrosshairCategory] = useState<string>('Competitive');
  const [newCrosshairCode, setNewCrosshairCode] = useState<string>('');

  // Load custom uploads from Supabase (with localStorage fallback)
  useEffect(() => {
    async function loadCrosshairs() {
      let fetched: any[] = [];
      try {
        const { data, error } = await supabase
          .from('crosshairs')
          .select('*')
          .order('id', { ascending: false });

        if (error) {
          console.warn('Could not read from Supabase table:', error.message);
        } else if (data) {
          fetched = data.map(item => ({
            name: item.name,
            team: item.team || 'Custom Upload',
            code: item.code,
            logoColor: item.logo_color || 'from-[#FF4655] to-[#8B0000]',
            avatarInitials: item.avatar_initials || 'VAL',
            category: item.category || 'Competitive'
          }));
        }
      } catch (e) {
        console.warn('Supabase offline or table missing, falling back:', e);
      }

      // Load local storage custom items too so we have both
      try {
        const stored = localStorage.getItem('valportal_custom_crosshairs');
        const localList = stored ? JSON.parse(stored) : [];
        // Merge without duplicates based on name and code
        const merged = [...fetched];
        for (const localItem of localList) {
          if (!merged.some(m => m.name === localItem.name && m.code === localItem.code)) {
            merged.push(localItem);
          }
        }
        setCustomCrosshairs(merged);
      } catch (e) {
        console.error(e);
        if (fetched.length > 0) {
          setCustomCrosshairs(fetched);
        }
      }
    }

    loadCrosshairs();
  }, [isAddModalOpen]); // Reload list when modal closes

  // Submit custom crosshair handler
  const handleAddCrosshair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCrosshairName.trim()) return;

    const gradients = [
      'from-[#FF4655] to-[#8B0000]',
      'from-[#00F0FF] to-[#0055A5]',
      'from-[#FFA500] to-[#FF4500]',
      'from-[#FF007F] to-[#4B0082]',
      'from-[#00BFFF] to-[#00008B]',
      'from-[#FF3E3E] to-[#1C1C1C]'
    ];
    const logoColor = gradients[Math.floor(Math.random() * gradients.length)];
    const initials = newCrosshairName.trim().substring(0, 3).toUpperCase();
    const code = newCrosshairCode.trim() || getGeneratedCode();

    const newCrosshairItem = {
      name: newCrosshairName.trim(),
      team: 'Custom Upload',
      code: code,
      logoColor: logoColor,
      avatarInitials: initials,
      category: newCrosshairCategory
    };

    // Optimistic UI update
    setCustomCrosshairs(prev => [newCrosshairItem, ...prev]);

    // Insert into Supabase
    try {
      const { error } = await supabase.from('crosshairs').insert([
        {
          name: newCrosshairName.trim(),
          team: 'Custom Upload',
          code: code,
          logo_color: logoColor,
          avatar_initials: initials,
          category: newCrosshairCategory
        }
      ]);
      
      if (error) {
        console.warn('Supabase insert failed, saving to localStorage:', error.message);
        const stored = localStorage.getItem('valportal_custom_crosshairs');
        const localList = stored ? JSON.parse(stored) : [];
        localStorage.setItem('valportal_custom_crosshairs', JSON.stringify([newCrosshairItem, ...localList]));
      } else {
        console.log('Successfully saved to Supabase!');
      }
    } catch (err) {
      console.warn('Supabase request failed, saving to localStorage:', err);
      const stored = localStorage.getItem('valportal_custom_crosshairs');
      const localList = stored ? JSON.parse(stored) : [];
      localStorage.setItem('valportal_custom_crosshairs', JSON.stringify([newCrosshairItem, ...localList]));
    }

    // Reset fields & close modal
    setNewCrosshairName('');
    setIsAddModalOpen(false);
  };

  // Accordion Toggle States
  const [expandedSections, setExpandedSections] = useState({
    general: true,
    inner: true,
    outer: false
  });

  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const modalCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [modalCrosshair, setModalCrosshair] = useState<CrosshairState>(DEFAULT_CROSSHAIR);

  // Helper to generate code from a specific state
  const getCodeForState = (state: CrosshairState) => {
    let code = '0;P';
    code += `;c;${state.color}`;
    if (state.color === 8) {
      code += `;u;${state.customColor.replace('#', '')}`;
    }

    code += `;h;${state.outline ? '1' : '0'}`;
    if (state.outline) {
      code += `;o;${state.outlineOpacity}`;
      code += `;t;${state.outlineThickness}`;
    }

    code += `;d;${state.centerDot ? '1' : '0'}`;
    if (state.centerDot) {
      code += `;a;${state.centerDotOpacity}`;
      code += `;z;${state.centerDotThickness}`;
    }

    if (state.innerLines) {
      code += `;0b;1`;
      code += `;0t;${state.innerThickness}`;
      code += `;0l;${state.innerLength}`;
      code += `;0o;${state.innerOffset}`;
      code += `;0a;${state.innerOpacity}`;
    } else {
      code += `;0b;0`;
    }

    if (state.outerLines) {
      code += `;1b;1`;
      code += `;1t;${state.outerThickness}`;
      code += `;1l;${state.outerLength}`;
      code += `;1o;${state.outerOffset}`;
      code += `;1a;${state.outerOpacity}`;
    } else {
      code += `;1b;0`;
    }

    return code;
  };

  // Helper to parse code to state
  const parseCodeToState = (code: string): CrosshairState => {
    const state = { ...DEFAULT_CROSSHAIR };
    if (!code || !code.includes(';')) return state;
    const parts = code.trim().split(';');
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      const val = parts[i + 1];
      switch (key) {
        case 'c': state.color = parseInt(val, 10); break;
        case 'u': state.customColor = val.startsWith('#') ? val : `#${val}`; state.color = 8; break;
        case 'h': state.outline = val === '1'; break;
        case 'o': state.outlineOpacity = parseFloat(val); break;
        case 't': state.outlineThickness = parseInt(val, 10); break;
        case 'd': state.centerDot = val === '1'; break;
        case 'z': state.centerDotThickness = parseInt(val, 10); break;
        case 'a': state.centerDotOpacity = parseFloat(val); break;
        case '0b': state.innerLines = val === '1'; break;
        case '0a': state.innerOpacity = parseFloat(val); break;
        case '0l': state.innerLength = parseInt(val, 10); break;
        case '0t': state.innerThickness = parseInt(val, 10); break;
        case '0o': state.innerOffset = parseInt(val, 10); break;
        case '1b': state.outerLines = val === '1'; break;
        case '1a': state.outerOpacity = parseFloat(val); break;
        case '1l': state.outerLength = parseInt(val, 10); break;
        case '1t': state.outerThickness = parseInt(val, 10); break;
        case '1o': state.outerOffset = parseInt(val, 10); break;
      }
    }
    return state;
  };

  // Save current active crosshair to localStorage for Unified Profile
  useEffect(() => {
    try {
      const code = getCodeForState(crosshair);
      localStorage.setItem('valportal_user_crosshair', code);
    } catch (_) {}
  }, [crosshair]);

  // Redraw modal canvas when modalCrosshair state updates
  useEffect(() => {
    if (isAddModalOpen && modalCanvasRef.current) {
      const ctx = modalCanvasRef.current.getContext('2d');
      if (ctx) {
        draw(ctx, modalCrosshair, 128);
      }
    }
  }, [modalCrosshair, isAddModalOpen]);

  // Keep newCrosshairCode in sync with modalCrosshair settings
  useEffect(() => {
    if (isAddModalOpen) {
      setNewCrosshairCode(getCodeForState(modalCrosshair));
    }
  }, [modalCrosshair, isAddModalOpen]);

  // 1. Draw crosshair helper
  const draw = (ctx: CanvasRenderingContext2D, state: CrosshairState, size = 256) => {
    const cx = size / 2;
    const cy = size / 2;

    ctx.clearRect(0, 0, size, size);

    const mainColor = state.color === 8 ? state.customColor : (COLOR_MAP[state.color] || '#FFFFFF');

    const drawRect = (x: number, y: number, w: number, h: number, opacity: number) => {
      if (state.outline) {
        ctx.fillStyle = `rgba(0, 0, 0, ${state.outlineOpacity * opacity})`;
        const ot = state.outlineThickness;
        ctx.fillRect(x - ot, y - ot, w + ot * 2, h + ot * 2);
      }
      ctx.fillStyle = mainColor;
      ctx.globalAlpha = opacity;
      ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 1.0;
    };

    // A. Center Dot
    if (state.centerDot) {
      const dt = state.centerDotThickness;
      const dx = cx - dt / 2;
      const dy = cy - dt / 2;
      drawRect(dx, dy, dt, dt, state.centerDotOpacity);
    }

    // B. Inner Lines
    if (state.innerLines) {
      const t = state.innerThickness;
      const l = state.innerLength;
      const o = state.innerOffset;
      const op = state.innerOpacity;

      // Left
      drawRect(cx - o - l, cy - t / 2, l, t, op);
      // Right
      drawRect(cx + o, cy - t / 2, l, t, op);
      // Top
      drawRect(cx - t / 2, cy - o - l, t, l, op);
      // Bottom
      drawRect(cx - t / 2, cy + o, t, l, op);
    }

    // C. Outer Lines
    if (state.outerLines) {
      const t = state.outerThickness;
      const l = state.outerLength;
      const o = state.outerOffset;
      const op = state.outerOpacity;

      // Left
      drawRect(cx - o - l, cy - t / 2, l, t, op);
      // Right
      drawRect(cx + o, cy - t / 2, l, t, op);
      // Top
      drawRect(cx - t / 2, cy - o - l, t, l, op);
      // Bottom
      drawRect(cx - t / 2, cy + o, t, l, op);
    }
  };

  // Redraw whenever crosshair state updates
  useEffect(() => {
    if (mainCanvasRef.current) {
      const ctx = mainCanvasRef.current.getContext('2d');
      if (ctx) {
        draw(ctx, crosshair, 256);
      }
    }
  }, [crosshair]);

  // Handle parsing import code
  const handleImport = (code: string) => {
    if (!code || !code.includes(';')) return;
    
    const state = { ...DEFAULT_CROSSHAIR };
    const parts = code.trim().split(';');

    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      const val = parts[i + 1];

      switch (key) {
        case 'c':
          state.color = parseInt(val, 10);
          break;
        case 'u':
          state.customColor = val.startsWith('#') ? val : `#${val}`;
          state.color = 8;
          break;
        case 'h':
          state.outline = val === '1';
          break;
        case 'o':
          state.outlineOpacity = parseFloat(val);
          break;
        case 't':
          state.outlineThickness = parseInt(val, 10);
          break;
        case 'd':
          state.centerDot = val === '1';
          break;
        case 'z':
          state.centerDotThickness = parseInt(val, 10);
          break;
        case 'a':
          state.centerDotOpacity = parseFloat(val);
          break;
        case '0b':
          state.innerLines = val === '1';
          break;
        case '0a':
          state.innerOpacity = parseFloat(val);
          break;
        case '0l':
          state.innerLength = parseInt(val, 10);
          break;
        case '0t':
          state.innerThickness = parseInt(val, 10);
          break;
        case '0o':
          state.innerOffset = parseInt(val, 10);
          break;
        case '1b':
          state.outerLines = val === '1';
          break;
        case '1a':
          state.outerOpacity = parseFloat(val);
          break;
        case '1l':
          state.outerLength = parseInt(val, 10);
          break;
        case '1t':
          state.outerThickness = parseInt(val, 10);
          break;
        case '1o':
          state.outerOffset = parseInt(val, 10);
          break;
      }
    }

    setCrosshair(state);
  };

  // Handle generating string code
  const getGeneratedCode = () => {
    let code = '0;P';
    code += `;c;${crosshair.color}`;
    if (crosshair.color === 8) {
      code += `;u;${crosshair.customColor.replace('#', '')}`;
    }

    code += `;h;${crosshair.outline ? '1' : '0'}`;
    if (crosshair.outline) {
      code += `;o;${crosshair.outlineOpacity}`;
      code += `;t;${crosshair.outlineThickness}`;
    }

    code += `;d;${crosshair.centerDot ? '1' : '0'}`;
    if (crosshair.centerDot) {
      code += `;a;${crosshair.centerDotOpacity}`;
      code += `;z;${crosshair.centerDotThickness}`;
    }

    if (crosshair.innerLines) {
      code += `;0b;1`;
      code += `;0t;${crosshair.innerThickness}`;
      code += `;0l;${crosshair.innerLength}`;
      code += `;0o;${crosshair.innerOffset}`;
      code += `;0a;${crosshair.innerOpacity}`;
    } else {
      code += `;0b;0`;
    }

    if (crosshair.outerLines) {
      code += `;1b;1`;
      code += `;1t;${crosshair.outerThickness}`;
      code += `;1l;${crosshair.outerLength}`;
      code += `;1o;${crosshair.outerOffset}`;
      code += `;1a;${crosshair.outerOpacity}`;
    } else {
      code += `;1b;0`;
    }

    return code;
  };

  // Keep inputCode synced to current crosshair settings
  useEffect(() => {
    setInputCode(getGeneratedCode());
  }, [crosshair]);

  const handleCopyCode = () => {
    const code = getGeneratedCode();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyPlayerCode = (e: React.MouseEvent, code: string, idx: number) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedPlayerIndex(idx);
    setTimeout(() => setCopiedPlayerIndex(null), 2000);
  };

  // Helper to draw mini preview canvas on Pro player cards
  const MiniCanvas = ({ code }: { code: string }) => {
    const miniCanvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
      if (miniCanvasRef.current) {
        const ctx = miniCanvasRef.current.getContext('2d');
        if (ctx) {
          // Parse code into state temporarily to render it
          const state = { ...DEFAULT_CROSSHAIR };
          const parts = code.trim().split(';');
          for (let i = 0; i < parts.length - 1; i++) {
            const key = parts[i];
            const val = parts[i + 1];
            switch (key) {
              case 'c': state.color = parseInt(val, 10); break;
              case 'u': state.customColor = val.startsWith('#') ? val : `#${val}`; state.color = 8; break;
              case 'h': state.outline = val === '1'; break;
              case 'o': state.outlineOpacity = parseFloat(val); break;
              case 't': state.outlineThickness = parseInt(val, 10); break;
              case 'd': state.centerDot = val === '1'; break;
              case 'z': state.centerDotThickness = parseInt(val, 10); break;
              case 'a': state.centerDotOpacity = parseFloat(val); break;
              case '0b': state.innerLines = val === '1'; break;
              case '0a': state.innerOpacity = parseFloat(val); break;
              case '0l': state.innerLength = parseInt(val, 10); break;
              case '0t': state.innerThickness = parseInt(val, 10); break;
              case '0o': state.innerOffset = parseInt(val, 10); break;
              case '1b': state.outerLines = val === '1'; break;
              case '1a': state.outerOpacity = parseFloat(val); break;
              case '1l': state.outerLength = parseInt(val, 10); break;
              case '1t': state.outerThickness = parseInt(val, 10); break;
              case '1o': state.outerOffset = parseInt(val, 10); break;
            }
          }
          draw(ctx, state, 80);
        }
      }
    }, [code]);

    return (
      <canvas 
        ref={miniCanvasRef} 
        width={80} 
        height={80} 
        className="w-[80px] h-[80px] bg-black/40 border border-white/5 rounded-sm"
      />
    );
  };

  const currentBg = MAP_BACKGROUNDS.find(bg => bg.id === selectedBg);

  return (
    <div className="min-h-screen bg-[#0A0D10] text-white font-sans pb-16">
      
      {/* HEADER SECTION */}
      <header className="border-b border-white/5 bg-[#0F1215]/95 sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onBackToHome}
            className="p-1 text-gray-400 hover:text-white transition duration-150 cursor-pointer animate-pulse"
            title={localT('RETURN_HOME')}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-rajdhani font-bold tracking-widest text-lg text-white leading-none">{localT('TITLE')}</h1>
            <p className="text-[9px] font-mono text-[#FF4655] tracking-widest mt-1 hidden sm:block">{localT('SUBTITLE')}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setCrosshair(DEFAULT_CROSSHAIR)}
            className="px-3 py-1 bg-transparent hover:bg-white/5 border border-white/10 hover:border-white/20 text-[10px] font-mono text-gray-400 hover:text-white uppercase tracking-widest flex items-center space-x-1.5 transition duration-150 cursor-pointer"
          >
            <RefreshCw size={10} />
            <span className="hidden sm:inline">{localT('RESET_BUILDER')}</span>
          </button>
          
          <UserNav />
        </div>
      </header>

      {/* DASHBOARD SPLIT WORKSPACE */}
      <main className="max-w-7xl mx-auto px-6 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* LEFT SIDE: CONTROLS PANEL (ACCORDION SYSTEM) */}
          <div className="space-y-4 order-last lg:order-first">
            
            {/* ACCORDION 1: GENERAL SETTINGS */}
            <div className="border border-white/5 bg-[#0F1215] rounded-none">
              <button
                onClick={() => setExpandedSections({ ...expandedSections, general: !expandedSections.general })}
                className="w-full px-5 py-4 flex items-center justify-between font-rajdhani font-bold uppercase tracking-wider text-sm border-b border-white/5 bg-[#12161A] text-[#FF4655] cursor-pointer"
              >
                <span>1. General Settings</span>
                {expandedSections.general ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {expandedSections.general && (
                <div className="p-5 space-y-6">
                  {/* COLOR SELECTION */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest block">Crosshair Color</label>
                    <div className="flex flex-wrap gap-2">
                      {COLOR_MAP.map((col, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCrosshair({ ...crosshair, color: idx })}
                          className={`w-7 h-7 rounded-sm border transition duration-150 cursor-pointer ${crosshair.color === idx ? 'border-[#FF4655] scale-110 shadow-lg shadow-[#FF4655]/20' : 'border-transparent hover:scale-105'}`}
                          style={{ backgroundColor: col }}
                          title={COLOR_NAMES[idx]}
                        />
                      ))}
                      <button
                        onClick={() => setCrosshair({ ...crosshair, color: 8 })}
                        className={`px-3 py-0.5 rounded-sm border text-[10px] font-mono tracking-wider transition duration-150 cursor-pointer ${crosshair.color === 8 ? 'bg-[#FF4655] border-[#FF4655] text-black font-bold' : 'bg-[#161A1E] border-white/5 text-gray-400 hover:text-white'}`}
                      >
                        CUSTOM HEX
                      </button>
                    </div>

                    {crosshair.color === 8 && (
                      <div className="mt-3 flex items-center space-x-2">
                        <input
                          type="color"
                          value={crosshair.customColor}
                          onChange={(e) => setCrosshair({ ...crosshair, customColor: e.target.value })}
                          className="w-8 h-8 bg-transparent border-0 rounded-md cursor-pointer outline-none shrink-0"
                        />
                        <input
                          type="text"
                          maxLength={7}
                          value={crosshair.customColor}
                          onChange={(e) => setCrosshair({ ...crosshair, customColor: e.target.value })}
                          className="bg-[#161A1E] border border-white/5 focus:border-[#FF4655] focus:outline-none px-3 py-1.5 font-mono text-xs w-28 uppercase text-white rounded-none"
                          placeholder="#00FFFF"
                        />
                      </div>
                    )}
                  </div>

                  {/* OUTLINE SECTION */}
                  <div className="border-t border-white/5 pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">Outlines (Garis Tepi)</label>
                      <button
                        onClick={() => setCrosshair({ ...crosshair, outline: !crosshair.outline })}
                        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors duration-200 cursor-pointer ${crosshair.outline ? 'bg-[#FF4655]' : 'bg-[#1D2228]'}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 ${crosshair.outline ? 'translate-x-5.5' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    {crosshair.outline && (
                      <div className="space-y-4 pl-3 border-l border-[#FF4655]/20 mt-3">
                        <div className="space-y-1.5">
                          <div className="flex justify-between font-mono text-[9px] text-gray-500">
                            <span>OUTLINE OPACITY</span>
                            <span className="text-[#FF4655]">{crosshair.outlineOpacity}</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={crosshair.outlineOpacity}
                            onChange={(e) => setCrosshair({ ...crosshair, outlineOpacity: parseFloat(e.target.value) })}
                            className="w-full accent-[#FF4655] bg-[#161A1E]"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between font-mono text-[9px] text-gray-500">
                            <span>OUTLINE THICKNESS</span>
                            <span className="text-[#FF4655]">{crosshair.outlineThickness} px</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="6"
                            step="1"
                            value={crosshair.outlineThickness}
                            onChange={(e) => setCrosshair({ ...crosshair, outlineThickness: parseInt(e.target.value, 10) })}
                            className="w-full accent-[#FF4655] bg-[#161A1E]"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* CENTER DOT SECTION */}
                  <div className="border-t border-white/5 pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">Center Dot (Titik Tengah)</label>
                      <button
                        onClick={() => setCrosshair({ ...crosshair, centerDot: !crosshair.centerDot })}
                        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors duration-200 cursor-pointer ${crosshair.centerDot ? 'bg-[#FF4655]' : 'bg-[#1D2228]'}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 ${crosshair.centerDot ? 'translate-x-5.5' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    {crosshair.centerDot && (
                      <div className="space-y-4 pl-3 border-l border-[#FF4655]/20 mt-3">
                        <div className="space-y-1.5">
                          <div className="flex justify-between font-mono text-[9px] text-gray-500">
                            <span>DOT OPACITY</span>
                            <span className="text-[#FF4655]">{crosshair.centerDotOpacity}</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={crosshair.centerDotOpacity}
                            onChange={(e) => setCrosshair({ ...crosshair, centerDotOpacity: parseFloat(e.target.value) })}
                            className="w-full accent-[#FF4655] bg-[#161A1E]"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between font-mono text-[9px] text-gray-500">
                            <span>DOT THICKNESS</span>
                            <span className="text-[#FF4655]">{crosshair.centerDotThickness} px</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="6"
                            step="1"
                            value={crosshair.centerDotThickness}
                            onChange={(e) => setCrosshair({ ...crosshair, centerDotThickness: parseInt(e.target.value, 10) })}
                            className="w-full accent-[#FF4655] bg-[#161A1E]"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>

            {/* ACCORDION 2: INNER LINES SETTINGS */}
            <div className="border border-white/5 bg-[#0F1215] rounded-none">
              <button
                onClick={() => setExpandedSections({ ...expandedSections, inner: !expandedSections.inner })}
                className="w-full px-5 py-4 flex items-center justify-between font-rajdhani font-bold uppercase tracking-wider text-sm border-b border-white/5 bg-[#12161A] text-[#FF4655] cursor-pointer"
              >
                <span>2. Inner Lines Settings</span>
                {expandedSections.inner ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {expandedSections.inner && (
                <div className="p-5 space-y-6">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <label className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">Show Inner Lines</label>
                    <button
                      onClick={() => setCrosshair({ ...crosshair, innerLines: !crosshair.innerLines })}
                      className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors duration-200 cursor-pointer ${crosshair.innerLines ? 'bg-[#FF4655]' : 'bg-[#1D2228]'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 ${crosshair.innerLines ? 'translate-x-5.5' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {crosshair.innerLines && (
                    <div className="space-y-4 pl-3 border-l border-[#FF4655]/20 mt-3">
                      <div className="space-y-1.5">
                        <div className="flex justify-between font-mono text-[9px] text-gray-500">
                          <span>INNER LINE OPACITY</span>
                          <span className="text-[#FF4655]">{crosshair.innerOpacity}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={crosshair.innerOpacity}
                          onChange={(e) => setCrosshair({ ...crosshair, innerOpacity: parseFloat(e.target.value) })}
                          className="w-full accent-[#FF4655] bg-[#161A1E]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between font-mono text-[9px] text-gray-500">
                          <span>INNER LINE LENGTH</span>
                          <span className="text-[#FF4655]">{crosshair.innerLength}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="20"
                          step="1"
                          value={crosshair.innerLength}
                          onChange={(e) => setCrosshair({ ...crosshair, innerLength: parseInt(e.target.value, 10) })}
                          className="w-full accent-[#FF4655] bg-[#161A1E]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between font-mono text-[9px] text-gray-500">
                          <span>INNER LINE THICKNESS</span>
                          <span className="text-[#FF4655]">{crosshair.innerThickness} px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          step="1"
                          value={crosshair.innerThickness}
                          onChange={(e) => setCrosshair({ ...crosshair, innerThickness: parseInt(e.target.value, 10) })}
                          className="w-full accent-[#FF4655] bg-[#161A1E]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between font-mono text-[9px] text-gray-500">
                          <span>INNER LINE OFFSET (GAP)</span>
                          <span className="text-[#FF4655]">{crosshair.innerOffset}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="20"
                          step="1"
                          value={crosshair.innerOffset}
                          onChange={(e) => setCrosshair({ ...crosshair, innerOffset: parseInt(e.target.value, 10) })}
                          className="w-full accent-[#FF4655] bg-[#161A1E]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ACCORDION 3: OUTER LINES SETTINGS */}
            <div className="border border-white/5 bg-[#0F1215] rounded-none">
              <button
                onClick={() => setExpandedSections({ ...expandedSections, outer: !expandedSections.outer })}
                className="w-full px-5 py-4 flex items-center justify-between font-rajdhani font-bold uppercase tracking-wider text-sm border-b border-white/5 bg-[#12161A] text-[#FF4655] cursor-pointer"
              >
                <span>3. Outer Lines Settings</span>
                {expandedSections.outer ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {expandedSections.outer && (
                <div className="p-5 space-y-6">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <label className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">Show Outer Lines</label>
                    <button
                      onClick={() => setCrosshair({ ...crosshair, outerLines: !crosshair.outerLines })}
                      className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors duration-200 cursor-pointer ${crosshair.outerLines ? 'bg-[#FF4655]' : 'bg-[#1D2228]'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 ${crosshair.outerLines ? 'translate-x-5.5' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {crosshair.outerLines && (
                    <div className="space-y-4 pl-3 border-l border-[#FF4655]/20 mt-3">
                      <div className="space-y-1.5">
                        <div className="flex justify-between font-mono text-[9px] text-gray-500">
                          <span>OUTER LINE OPACITY</span>
                          <span className="text-[#FF4655]">{crosshair.outerOpacity}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={crosshair.outerOpacity}
                          onChange={(e) => setCrosshair({ ...crosshair, outerOpacity: parseFloat(e.target.value) })}
                          className="w-full accent-[#FF4655] bg-[#161A1E]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between font-mono text-[9px] text-gray-500">
                          <span>OUTER LINE LENGTH</span>
                          <span className="text-[#FF4655]">{crosshair.outerLength}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="20"
                          step="1"
                          value={crosshair.outerLength}
                          onChange={(e) => setCrosshair({ ...crosshair, outerLength: parseInt(e.target.value, 10) })}
                          className="w-full accent-[#FF4655] bg-[#161A1E]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between font-mono text-[9px] text-gray-500">
                          <span>OUTER LINE THICKNESS</span>
                          <span className="text-[#FF4655]">{crosshair.outerThickness} px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          step="1"
                          value={crosshair.outerThickness}
                          onChange={(e) => setCrosshair({ ...crosshair, outerThickness: parseInt(e.target.value, 10) })}
                          className="w-full accent-[#FF4655] bg-[#161A1E]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between font-mono text-[9px] text-gray-500">
                          <span>OUTER LINE OFFSET (GAP)</span>
                          <span className="text-[#FF4655]">{crosshair.outerOffset}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="20"
                          step="1"
                          value={crosshair.outerOffset}
                          onChange={(e) => setCrosshair({ ...crosshair, outerOffset: parseInt(e.target.value, 10) })}
                          className="w-full accent-[#FF4655] bg-[#161A1E]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT SIDE: INTERACTIVE PREVIEW PANEL */}
          <div className="flex flex-col items-center order-first lg:order-last">
            
            {/* SCREEN FRAME WRAPPER */}
            <div className="w-full max-w-[384px] bg-[#0F1215] border border-zinc-800 p-4 shadow-2xl relative">
              

              {/* INTERACTIVE BACKGROUND BOX (fixed size) */}
              <div 
                className="w-full aspect-square relative bg-cover bg-no-repeat overflow-hidden flex items-center justify-center border border-white/5 select-none pointer-events-none"
                style={{
                  backgroundImage: currentBg?.url === 'solid' ? 'none' : `url(${currentBg?.url})`,
                  backgroundColor: currentBg?.url === 'solid' ? currentBg?.color : '#161A1E',
                  backgroundPosition: currentBg?.position || 'center'
                }}
              >
                {/* 256x256 Canvas Element */}
                <canvas 
                  ref={mainCanvasRef} 
                  width={256} 
                  height={256} 
                  className="w-full h-full scale-[1.3] pointer-events-none relative z-10"
                />

                {/* Reticle grid reference crosshair */}
                <div className="absolute inset-0 border border-white/5 flex items-center justify-center opacity-30 pointer-events-none">
                  <div className="w-full h-[1px] bg-white/20 absolute" />
                  <div className="h-full w-[1px] bg-white/20 absolute" />
                </div>
              </div>

              {/* BOTTOM TERMINAL: IMPORT/EXPORT INPUT */}
              <div className="mt-4 space-y-2 border-t border-white/5 pt-3">
                <div className="flex space-x-1.5">
                  <input
                    type="text"
                    placeholder={localT('PASTE_PLACEHOLDER')}
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    className="flex-grow bg-[#161A1E] text-white border border-white/5 focus:border-[#FF4655] focus:outline-none px-3 py-2.5 text-[10px] font-mono tracking-wider rounded-none uppercase placeholder:text-gray-600 min-w-0"
                  />
                  <button
                    onClick={() => handleImport(inputCode)}
                    className="bg-[#FF4655] hover:bg-[#FF4655]/90 text-black font-mono font-bold text-[10px] px-4 py-2.5 uppercase transition cursor-pointer rounded-none shrink-0 font-bold"
                  >
                    {localT('IMPORT')}
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCopyCode}
                    className="flex-1 bg-[#161A1E] border border-white/5 hover:border-[#FF4655] hover:bg-[#FF4655]/5 text-white py-2 px-4 text-[10px] font-mono tracking-widest font-bold uppercase transition duration-150 flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check size={11} className="text-[#00FF00]" />
                        <span className="text-[#00FF00]">{localT('COPIED')}</span>
                      </>
                    ) : (
                      <>
                        <Copy size={11} className="text-[#FF4655]" />
                        <span>{localT('COPY_CODE')}</span>
                      </>
                    )}
                  </button>
                </div>

              </div>

              {/* CORNER TECH LABELS */}
              <div className="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-zinc-500" />
              <div className="absolute -top-1 -right-1 w-2 h-2 border-t border-r border-zinc-500" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b border-l border-zinc-500" />
              <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-zinc-500" />

            </div>

            {/* QUICK INFORMATION CARD */}
            <div className="w-full max-w-[384px] mt-4 bg-[#0F1215] border border-white/5 p-4 rounded-none">
              <div className="flex items-start space-x-3">
                <Info size={16} className="text-[#FF4655] shrink-0 mt-0.5" />
                <div className="font-mono text-[9px] text-gray-400 space-y-1.5 leading-relaxed">
                  <span className="text-white font-bold block uppercase tracking-wider">{localT('HOW_TO_IMPORT')}</span>
                  <p>{localT('IMPORT_STEP1')}</p>
                  <p>{localT('IMPORT_STEP2')}</p>
                  <p>{localT('IMPORT_STEP3')}</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* PRO PLAYER DATABASE SECTION */}
      <section className="max-w-7xl mx-auto px-6 mt-16 border-t border-white/5 pt-12">
        
        {/* SECTION TITLE HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-6 mb-8">
          <div>
            <h2 className="font-rajdhani text-2xl font-black uppercase tracking-wider text-white">{localT('DATABASE_TITLE')}</h2>
            <p className="font-mono text-[9px] text-gray-500 tracking-widest uppercase mt-1">{localT('DATABASE_SUB', { count: String(crosshairsData.length + customCrosshairs.length) })}</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            {/* Search box for player crosshair */}
            <div className="relative w-full md:w-72">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 pointer-events-none">
                <Search size={12} />
              </span>
              <input
                type="text"
                placeholder={localT('SEARCH_PLACEHOLDER')}
                value={proSearchQuery}
                onChange={(e) => {
                  setProSearchQuery(e.target.value);
                  setVisibleCount(12); // Reset page count on filter
                }}
                className="w-full bg-[#161A1E] text-white border border-white/5 focus:border-[#FF4655] focus:outline-none pl-8 pr-4 py-1.5 text-[10px] font-mono tracking-wider rounded-none uppercase placeholder:text-gray-600"
              />
            </div>

            {/* UPLOAD CUSTOM BUTTON */}
            <button
              onClick={() => {
                setNewCrosshairCode(getGeneratedCode());
                setIsAddModalOpen(true);
              }}
              className="bg-[#FF4655] hover:bg-[#FF4655]/95 text-black px-4 py-1.5 text-[10px] font-mono font-bold tracking-widest uppercase transition duration-150 rounded-none shrink-0 cursor-pointer"
            >
              {localT('UPLOAD_BTN')}
            </button>
          </div>
        </div>

        {/* Category Tabs Filter */}
        <div className="flex flex-wrap gap-1.5 mb-8">
          {['All', 'Pro', 'Competitive', 'Funny', 'Troll'].map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setProCategory(cat);
                setVisibleCount(12); // Reset pagination on category change
              }}
              className={`px-4 py-1.5 text-[10px] font-mono font-bold tracking-widest uppercase transition-all duration-150 border rounded-none cursor-pointer ${
                proCategory === cat 
                  ? 'bg-[#FF4655] text-black border-[#FF4655]' 
                  : 'bg-[#12161A] text-gray-400 border-white/5 hover:text-white hover:border-white/10'
              }`}
            >
              {cat === 'All' ? localT('ALL_CATEGORIES') : `${cat.toUpperCase()}${localT('CODES_SUFFIX')}`}
            </button>
          ))}
        </div>

        {/* PRO DATABASE GRID */}
        {(() => {
          // Merge custom local uploads + static crosshairsData
          const allCrosshairs = [...customCrosshairs, ...crosshairsData];

          // Perform filtering
          const filtered = allCrosshairs.filter(player => {
            const matchesSearch = 
              player.name.toLowerCase().includes(proSearchQuery.toLowerCase()) ||
              player.team.toLowerCase().includes(proSearchQuery.toLowerCase());
            
            const matchesCat = 
              proCategory === 'All' || 
              (player.category && player.category.toLowerCase() === proCategory.toLowerCase());
              
            return matchesSearch && matchesCat;
          });

          const sliced = filtered.slice(0, visibleCount);

          if (filtered.length === 0) {
            return (
              <div className="py-16 text-center border border-dashed border-white/5 font-mono text-xs text-gray-500 uppercase tracking-widest">
                NO CROSSHAIRS MATCHING FILTERS
              </div>
            );
          }

          return (
            <div className="space-y-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {sliced.map((player, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      handleImport(player.code);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="group bg-[#0F1215] border border-white/5 hover:border-[#FF4655] p-4 flex flex-col justify-between h-56 transition-all duration-300 relative rounded-none cursor-pointer hover:shadow-lg hover:shadow-[#FF4655]/5"
                  >
                    
                    {/* Header profile details */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center">
                        <div>
                          <h3 className="font-rajdhani font-bold text-lg leading-tight uppercase group-hover:text-[#FF4655] transition duration-150">
                            {player.name}
                          </h3>
                        </div>
                      </div>
                    </div>

                    {/* Core Crosshair Mini Preview Render */}
                    <div className="flex justify-center items-center my-4 pointer-events-none">
                      <MiniCanvas code={player.code} />
                    </div>

                    {/* Hover hydrated message and direct copy button */}
                    <div className="flex items-center justify-between border-t border-white/5 pt-3">
                      <span className="text-[8px] font-mono text-gray-500 uppercase group-hover:text-white transition duration-150">CLICK TO EDIT</span>
                      
                      <button
                        onClick={(e) => handleCopyPlayerCode(e, player.code, idx)}
                        className="px-2.5 py-1 bg-[#161A1E] hover:bg-[#FF4655] text-gray-400 hover:text-black font-mono font-bold text-[8px] tracking-widest uppercase transition duration-150 border border-white/5 flex items-center space-x-1.5 cursor-pointer"
                      >
                        {copiedPlayerIndex === idx ? (
                          <>
                            <Check size={8} />
                            <span>COPIED!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={8} />
                            <span>COPY CODE</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Corner brackets */}
                    <div className="absolute top-2 right-2 w-1.5 h-1.5 border-t border-r border-white/5 group-hover:border-[#FF4655] transition duration-150" />
                    <div className="absolute bottom-2 left-2 w-1.5 h-1.5 border-b border-l border-white/5 group-hover:border-[#FF4655] transition duration-150" />

                  </div>
                ))}
              </div>

              {/* Load More Pagination Button */}
              {filtered.length > visibleCount && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => setVisibleCount(prev => prev + 12)}
                    className="px-6 py-2.5 bg-transparent border border-white/10 hover:border-[#FF4655] hover:bg-[#FF4655]/5 text-gray-300 hover:text-white text-[11px] font-mono font-bold tracking-widest uppercase transition duration-150 cursor-pointer animate-pulse"
                  >
                    LOAD MORE PRO PROFILES ({filtered.length - visibleCount} REMAINING)
                  </button>
                </div>
              )}
            </div>
          );
        })()}
      </section>

      {/* UPLOAD CROSSHAIR DIALOG MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#0F1215] border border-zinc-800 p-6 shadow-2xl relative max-h-[90vh] flex flex-col rounded-none">
            
            {/* Header */}
            <div className="border-b border-white/5 pb-3 mb-4 shrink-0 flex items-center justify-between">
              <h3 className="font-rajdhani font-bold text-xl uppercase tracking-wider text-[#FF4655]">
                Upload Custom Crosshair
              </h3>
              <span className="text-[9px] font-mono text-gray-500 bg-white/5 px-2 py-0.5">MINI BUILDER ACTIVE</span>
            </div>

            {/* Scrollable Container */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
              
              {/* LIVE CANVAS PREVIEW INSIDE MODAL */}
              <div className="flex justify-center">
                <div 
                  className="w-32 h-32 relative bg-cover bg-no-repeat overflow-hidden flex items-center justify-center border border-white/10 shrink-0"
                  style={{
                    backgroundImage: currentBg?.url === 'solid' ? 'none' : `url(${currentBg?.url})`,
                    backgroundColor: currentBg?.url === 'solid' ? currentBg?.color : '#161A1E',
                    backgroundPosition: currentBg?.position || 'center'
                  }}
                >
                  <canvas 
                    ref={modalCanvasRef} 
                    width={128} 
                    height={128} 
                    className="w-full h-full scale-[1.3] pointer-events-none relative z-10"
                  />
                  {/* Crosshair target alignment grids */}
                  <div className="absolute inset-0 border border-white/5 flex items-center justify-center opacity-30 pointer-events-none">
                    <div className="w-full h-[1px] bg-white/20 absolute" />
                    <div className="h-full w-[1px] bg-white/20 absolute" />
                  </div>
                </div>
              </div>

              <form onSubmit={handleAddCrosshair} className="space-y-4">
                
                {/* Meta details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest block">
                      Crosshair Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="E.G. MY CUSTOM DOT"
                      value={newCrosshairName}
                      onChange={(e) => setNewCrosshairName(e.target.value)}
                      className="w-full bg-[#161A1E] text-white border border-white/5 focus:border-[#FF4655] focus:outline-none px-3 py-2 text-xs font-mono uppercase tracking-wider rounded-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest block">
                      Category Tag
                    </label>
                    <select
                      value={newCrosshairCategory}
                      onChange={(e) => setNewCrosshairCategory(e.target.value)}
                      className="w-full bg-[#161A1E] text-white border border-white/5 focus:border-[#FF4655] focus:outline-none px-3 py-2 text-xs font-mono uppercase tracking-wider rounded-none cursor-pointer"
                    >
                      <option value="Pro">Pro</option>
                      <option value="Competitive">Competitive</option>
                      <option value="Funny">Funny</option>
                      <option value="Troll">Troll</option>
                    </select>
                  </div>
                </div>

                {/* SLIDERS & SETTINGS CONTROLS */}
                <div className="space-y-4 border-t border-b border-white/5 py-4">
                  
                  {/* 1. GENERAL SETTINGS */}
                  <div className="space-y-3">
                    <h4 className="font-rajdhani text-[11px] text-[#FF4655] font-black uppercase tracking-widest">1. GENERAL SETTINGS</h4>
                    
                    {/* Color selection */}
                    <div className="space-y-1.5">
                      <div className="text-[9px] font-mono text-gray-500 uppercase">Crosshair Color</div>
                      <div className="flex flex-wrap gap-1">
                        {COLOR_MAP.map((colorVal, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setModalCrosshair({ ...modalCrosshair, color: idx })}
                            className={`w-5 h-5 rounded-none border transition ${modalCrosshair.color === idx ? 'border-white scale-110' : 'border-transparent hover:border-white/20'}`}
                            style={{ backgroundColor: colorVal }}
                          />
                        ))}
                        <button
                          type="button"
                          onClick={() => setModalCrosshair({ ...modalCrosshair, color: 8 })}
                          className={`px-2 py-0.5 text-[8px] font-mono border rounded-none transition ${modalCrosshair.color === 8 ? 'bg-[#FF4655] text-black border-[#FF4655]' : 'bg-transparent text-gray-400 border-white/10 hover:text-white'}`}
                        >
                          HEX
                        </button>
                      </div>
                      {modalCrosshair.color === 8 && (
                        <input
                          type="text"
                          value={modalCrosshair.customColor}
                          onChange={(e) => setModalCrosshair({ ...modalCrosshair, customColor: e.target.value })}
                          className="w-full bg-[#161A1E] text-white border border-white/5 px-2 py-1 text-[10px] font-mono rounded-none uppercase mt-1"
                        />
                      )}
                    </div>

                    {/* Outline settings */}
                    <div className="space-y-2 border border-white/5 p-3 bg-black/20">
                      <div className="flex items-center justify-between">
                        <label className="text-[9px] font-mono text-gray-400 uppercase tracking-wider">Outlines</label>
                        <button
                          type="button"
                          onClick={() => setModalCrosshair({ ...modalCrosshair, outline: !modalCrosshair.outline })}
                          className={`relative inline-flex h-4.5 w-9 items-center rounded-full transition-colors duration-200 cursor-pointer ${modalCrosshair.outline ? 'bg-[#FF4655]' : 'bg-[#1D2228]'}`}
                        >
                          <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform duration-200 ${modalCrosshair.outline ? 'translate-x-5' : 'translate-x-1'}`} />
                        </button>
                      </div>
                      {modalCrosshair.outline && (
                        <div className="space-y-3 pt-2 border-t border-white/5 mt-2">
                          <div className="space-y-1">
                            <div className="flex justify-between font-mono text-[8px] text-gray-500">
                              <span>OUTLINE OPACITY</span>
                              <span className="text-[#FF4655]">{modalCrosshair.outlineOpacity}</span>
                            </div>
                            <input
                              type="range" min="0" max="1" step="0.05"
                              value={modalCrosshair.outlineOpacity}
                              onChange={(e) => setModalCrosshair({ ...modalCrosshair, outlineOpacity: parseFloat(e.target.value) })}
                              className="w-full accent-[#FF4655] h-1"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between font-mono text-[8px] text-gray-500">
                              <span>OUTLINE THICKNESS</span>
                              <span className="text-[#FF4655]">{modalCrosshair.outlineThickness} px</span>
                            </div>
                            <input
                              type="range" min="1" max="6" step="1"
                              value={modalCrosshair.outlineThickness}
                              onChange={(e) => setModalCrosshair({ ...modalCrosshair, outlineThickness: parseInt(e.target.value, 10) })}
                              className="w-full accent-[#FF4655] h-1"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Center Dot settings */}
                    <div className="space-y-2 border border-white/5 p-3 bg-black/20">
                      <div className="flex items-center justify-between">
                        <label className="text-[9px] font-mono text-gray-400 uppercase tracking-wider">Center Dot</label>
                        <button
                          type="button"
                          onClick={() => setModalCrosshair({ ...modalCrosshair, centerDot: !modalCrosshair.centerDot })}
                          className={`relative inline-flex h-4.5 w-9 items-center rounded-full transition-colors duration-200 cursor-pointer ${modalCrosshair.centerDot ? 'bg-[#FF4655]' : 'bg-[#1D2228]'}`}
                        >
                          <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform duration-200 ${modalCrosshair.centerDot ? 'translate-x-5' : 'translate-x-1'}`} />
                        </button>
                      </div>
                      {modalCrosshair.centerDot && (
                        <div className="space-y-3 pt-2 border-t border-white/5 mt-2">
                          <div className="space-y-1">
                            <div className="flex justify-between font-mono text-[8px] text-gray-500">
                              <span>CENTER DOT OPACITY</span>
                              <span className="text-[#FF4655]">{modalCrosshair.centerDotOpacity}</span>
                            </div>
                            <input
                              type="range" min="0" max="1" step="0.05"
                              value={modalCrosshair.centerDotOpacity}
                              onChange={(e) => setModalCrosshair({ ...modalCrosshair, centerDotOpacity: parseFloat(e.target.value) })}
                              className="w-full accent-[#FF4655] h-1"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between font-mono text-[8px] text-gray-500">
                              <span>CENTER DOT THICKNESS</span>
                              <span className="text-[#FF4655]">{modalCrosshair.centerDotThickness} px</span>
                            </div>
                            <input
                              type="range" min="1" max="6" step="1"
                              value={modalCrosshair.centerDotThickness}
                              onChange={(e) => setModalCrosshair({ ...modalCrosshair, centerDotThickness: parseInt(e.target.value, 10) })}
                              className="w-full accent-[#FF4655] h-1"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. INNER LINES SETTINGS */}
                  <div className="space-y-3 border-t border-white/5 pt-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-rajdhani text-[11px] text-[#FF4655] font-black uppercase tracking-widest">2. INNER LINES SETTINGS</h4>
                      <button
                        type="button"
                        onClick={() => setModalCrosshair({ ...modalCrosshair, innerLines: !modalCrosshair.innerLines })}
                        className={`relative inline-flex h-4.5 w-9 items-center rounded-full transition-colors duration-200 cursor-pointer ${modalCrosshair.innerLines ? 'bg-[#FF4655]' : 'bg-[#1D2228]'}`}
                      >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform duration-200 ${modalCrosshair.innerLines ? 'translate-x-5' : 'translate-x-1'}`} />
                      </button>
                    </div>
                    {modalCrosshair.innerLines && (
                      <div className="space-y-3 pl-3 border-l border-[#FF4655]/20 mt-2">
                        <div className="space-y-1">
                          <div className="flex justify-between font-mono text-[8px] text-gray-500">
                            <span>INNER LINE OPACITY</span>
                            <span className="text-[#FF4655]">{modalCrosshair.innerOpacity}</span>
                          </div>
                          <input
                            type="range" min="0" max="1" step="0.05"
                            value={modalCrosshair.innerOpacity}
                            onChange={(e) => setModalCrosshair({ ...modalCrosshair, innerOpacity: parseFloat(e.target.value) })}
                            className="w-full accent-[#FF4655] h-1"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between font-mono text-[8px] text-gray-500">
                            <span>INNER LINE LENGTH</span>
                            <span className="text-[#FF4655]">{modalCrosshair.innerLength}</span>
                          </div>
                          <input
                            type="range" min="0" max="20" step="1"
                            value={modalCrosshair.innerLength}
                            onChange={(e) => setModalCrosshair({ ...modalCrosshair, innerLength: parseInt(e.target.value, 10) })}
                            className="w-full accent-[#FF4655] h-1"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between font-mono text-[8px] text-gray-500">
                            <span>INNER LINE THICKNESS</span>
                            <span className="text-[#FF4655]">{modalCrosshair.innerThickness} px</span>
                          </div>
                          <input
                            type="range" min="0" max="10" step="1"
                            value={modalCrosshair.innerThickness}
                            onChange={(e) => setModalCrosshair({ ...modalCrosshair, innerThickness: parseInt(e.target.value, 10) })}
                            className="w-full accent-[#FF4655] h-1"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between font-mono text-[8px] text-gray-500">
                            <span>INNER LINE OFFSET (GAP)</span>
                            <span className="text-[#FF4655]">{modalCrosshair.innerOffset}</span>
                          </div>
                          <input
                            type="range" min="0" max="20" step="1"
                            value={modalCrosshair.innerOffset}
                            onChange={(e) => setModalCrosshair({ ...modalCrosshair, innerOffset: parseInt(e.target.value, 10) })}
                            className="w-full accent-[#FF4655] h-1"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. OUTER LINES SETTINGS */}
                  <div className="space-y-3 border-t border-white/5 pt-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-rajdhani text-[11px] text-[#FF4655] font-black uppercase tracking-widest">3. OUTER LINES SETTINGS</h4>
                      <button
                        type="button"
                        onClick={() => setModalCrosshair({ ...modalCrosshair, outerLines: !modalCrosshair.outerLines })}
                        className={`relative inline-flex h-4.5 w-9 items-center rounded-full transition-colors duration-200 cursor-pointer ${modalCrosshair.outerLines ? 'bg-[#FF4655]' : 'bg-[#1D2228]'}`}
                      >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform duration-200 ${modalCrosshair.outerLines ? 'translate-x-5' : 'translate-x-1'}`} />
                      </button>
                    </div>
                    {modalCrosshair.outerLines && (
                      <div className="space-y-3 pl-3 border-l border-[#FF4655]/20 mt-2">
                        <div className="space-y-1">
                          <div className="flex justify-between font-mono text-[8px] text-gray-500">
                            <span>OUTER LINE OPACITY</span>
                            <span className="text-[#FF4655]">{modalCrosshair.outerOpacity}</span>
                          </div>
                          <input
                            type="range" min="0" max="1" step="0.05"
                            value={modalCrosshair.outerOpacity}
                            onChange={(e) => setModalCrosshair({ ...modalCrosshair, outerOpacity: parseFloat(e.target.value) })}
                            className="w-full accent-[#FF4655] h-1"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between font-mono text-[8px] text-gray-500">
                            <span>OUTER LINE LENGTH</span>
                            <span className="text-[#FF4655]">{modalCrosshair.outerLength}</span>
                          </div>
                          <input
                            type="range" min="0" max="20" step="1"
                            value={modalCrosshair.outerLength}
                            onChange={(e) => setModalCrosshair({ ...modalCrosshair, outerLength: parseInt(e.target.value, 10) })}
                            className="w-full accent-[#FF4655] h-1"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between font-mono text-[8px] text-gray-500">
                            <span>OUTER LINE THICKNESS</span>
                            <span className="text-[#FF4655]">{modalCrosshair.outerThickness} px</span>
                          </div>
                          <input
                            type="range" min="0" max="10" step="1"
                            value={modalCrosshair.outerThickness}
                            onChange={(e) => setModalCrosshair({ ...modalCrosshair, outerThickness: parseInt(e.target.value, 10) })}
                            className="w-full accent-[#FF4655] h-1"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between font-mono text-[8px] text-gray-500">
                            <span>OUTER LINE OFFSET (GAP)</span>
                            <span className="text-[#FF4655]">{modalCrosshair.outerOffset}</span>
                          </div>
                          <input
                            type="range" min="0" max="20" step="1"
                            value={modalCrosshair.outerOffset}
                            onChange={(e) => setModalCrosshair({ ...modalCrosshair, outerOffset: parseInt(e.target.value, 10) })}
                            className="w-full accent-[#FF4655] h-1"
                      />
                    </div>
                  </div>
                    )}
                  </div>

                </div>

                {/* Crosshair code input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest block font-mono">
                    Crosshair Code String
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VALORANT CODE..."
                    value={newCrosshairCode}
                    onChange={(e) => {
                      setNewCrosshairCode(e.target.value);
                      if (e.target.value.includes(';')) {
                        setModalCrosshair(parseCodeToState(e.target.value));
                      }
                    }}
                    className="w-full bg-[#161A1E] text-white border border-white/5 focus:border-[#FF4655] focus:outline-none px-3 py-2 text-xs font-mono uppercase tracking-wider rounded-none"
                  />
                  <p className="text-[8px] font-mono text-gray-500 leading-normal">
                    *Changing any sliders above or typing/pasting a code string directly will synchronize immediately.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/5 mt-6 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 border border-white/10 hover:border-white/20 text-gray-400 hover:text-white text-[10px] font-mono tracking-widest uppercase transition duration-150 rounded-none cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#FF4655] hover:bg-[#FF4655]/95 text-black font-bold text-[10px] font-mono tracking-widest uppercase transition duration-150 rounded-none cursor-pointer"
                  >
                    PUBLISH CROSSHAIR
                  </button>
                </div>
              </form>
            </div>

            {/* Corner brackets */}
            <div className="absolute top-2 right-2 w-1.5 h-1.5 border-t border-r border-white/10" />
            <div className="absolute bottom-2 left-2 w-1.5 h-1.5 border-b border-l border-white/10" />
          </div>
        </div>
      )}

    </div>
  );
}
