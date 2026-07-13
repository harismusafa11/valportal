/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Download, 
  Edit3, 
  Save, 
  Settings, 
  Shield, 
  Target, 
  User, 
  Zap, 
  Loader2, 
  Lock, 
  Check, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { useLanguage } from '../lib/LanguageContext';
import { useAuth } from '../lib/useAuth';
import AuthModal from './AuthModal';
import { 
  getLocalSetupData, 
  saveLocalSetupData, 
  syncLocalStorageToSupabase, 
  UnifiedSetupData,
  ProfileData,
  SettingsData,
  HighScoresData
} from '../lib/profileSync';

// ─── Default Fallbacks ────────────────────────────────────────────────────────

const DEFAULT_PROFILE: ProfileData = {
  username: 'JETT',
  tagline: '#WIND',
  title: 'WINDUP',
  accountLevel: 99,
  cardUuid: '3432dc3d-47da-4675-67ae-53adb1fdad5e',
  cardWideArt: 'https://media.valorant-api.com/playercards/3432dc3d-47da-4675-67ae-53adb1fdad5e/wideart.png',
  cardLargeArt: 'https://media.valorant-api.com/playercards/3432dc3d-47da-4675-67ae-53adb1fdad5e/largeart.png',
  rankName: 'Radiant',
  rankIcon: 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/27/largeicon.png'
};

const DEFAULT_SETTINGS: SettingsData = {
  sens: 0.4,
  dpi: 800,
  edpi: 320
};

const DEFAULT_CROSSHAIR = '0;P;c;5;h;0;d;1;z;3;a;1;0b;0;1b;0';

// ─── Crosshair Parsing & Draw ──────────────────────────────────────────────────

interface CrosshairState {
  color: number;
  customColor: string;
  outline: boolean;
  outlineOpacity: number;
  outlineThickness: number;
  centerDot: boolean;
  centerDotOpacity: number;
  centerDotThickness: number;
  innerLines: boolean;
  innerOpacity: number;
  innerLength: number;
  innerThickness: number;
  innerOffset: number;
  outerLines: boolean;
  outerOpacity: number;
  outerLength: number;
  outerThickness: number;
  outerOffset: number;
}

const COLOR_MAP = [
  '#FFFFFF', '#00FF00', '#7FFF00', '#ADFF2F',
  '#FFFF00', '#00FFFF', '#FFC0CB', '#FF0000',
];

function parseCrosshairCode(code: string): CrosshairState {
  const state: CrosshairState = {
    color: 5,
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
}

function drawCrosshairOnCanvas(
  ctx: CanvasRenderingContext2D,
  code: string,
  cx: number,
  cy: number
) {
  const state = parseCrosshairCode(code);
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

  // Center Dot
  if (state.centerDot) {
    const dt = state.centerDotThickness;
    drawRect(cx - dt / 2, cy - dt / 2, dt, dt, state.centerDotOpacity);
  }

  // Inner Lines
  if (state.innerLines) {
    const t = state.innerThickness;
    const l = state.innerLength;
    const o = state.innerOffset;
    const op = state.innerOpacity;
    drawRect(cx - o - l, cy - t / 2, l, t, op);
    drawRect(cx + o, cy - t / 2, l, t, op);
    drawRect(cx - t / 2, cy - o - l, t, l, op);
    drawRect(cx - t / 2, cy + o, t, l, op);
  }

  // Outer Lines
  if (state.outerLines) {
    const t = state.outerThickness;
    const l = state.outerLength;
    const o = state.outerOffset;
    const op = state.outerOpacity;
    drawRect(cx - o - l, cy - t / 2, l, t, op);
    drawRect(cx + o, cy - t / 2, l, t, op);
    drawRect(cx - t / 2, cy - o - l, t, l, op);
    drawRect(cx - t / 2, cy + o, t, l, op);
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface UserProfileProps {
  onBackToHome: () => void;
}

export default function UserProfile({ onBackToHome }: UserProfileProps) {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  
  // Local states
  const [profile, setProfile] = useState<ProfileData>(DEFAULT_PROFILE);
  const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS);
  const [crosshair, setCrosshair] = useState<string>(DEFAULT_CROSSHAIR);
  const [aimHighScores, setAimHighScores] = useState<HighScoresData>({});
  
  // API Choices (for editing)
  const [ranks, setRanks] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  
  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editTag, setEditTag] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editLevel, setEditLevel] = useState(99);
  const [editRankName, setEditRankName] = useState('Unrated');
  const [editCardUuid, setEditCardUuid] = useState('');

  // UI state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const exportAreaRef = useRef<HTMLDivElement>(null);

  // Sanitize profile to migrate obsolete API endpoints/uuids
  const sanitizeProfile = (prof: ProfileData): ProfileData => {
    if (prof.cardUuid === '7e63b69e-433e-4f7f-d5b7-7e61882d2a45') {
      return {
        ...prof,
        cardUuid: DEFAULT_PROFILE.cardUuid,
        cardWideArt: DEFAULT_PROFILE.cardWideArt,
        cardLargeArt: DEFAULT_PROFILE.cardLargeArt
      };
    }
    if (prof.rankIcon && prof.rankIcon.includes('03b252c6-413a-d66a-287a-39b434ccd20c')) {
      return {
        ...prof,
        rankIcon: DEFAULT_PROFILE.rankIcon,
        rankName: 'Radiant'
      };
    }
    return prof;
  };

  // Load Setup Data
  const loadData = async () => {
    setIsSyncing(true);
    // 1. Load local first
    const local = getLocalSetupData();
    if (local.profile) setProfile(sanitizeProfile(local.profile));
    if (local.settings) setSettings(local.settings);
    if (local.crosshair) setCrosshair(local.crosshair);
    if (local.aimHighScores) setAimHighScores(local.aimHighScores);

    // 2. If logged in, perform hybrid sync
    if (user) {
      const synced = await syncLocalStorageToSupabase();
      if (synced) {
        if (synced.profile) setProfile(sanitizeProfile(synced.profile));
        if (synced.settings) setSettings(synced.settings);
        if (synced.crosshair) setCrosshair(synced.crosshair);
        if (synced.aimHighScores) setAimHighScores(synced.aimHighScores);
      }
    }
    setIsSyncing(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Load assets from Valorant-API
  useEffect(() => {
    async function loadAssets() {
      try {
        // Competitive tiers
        const ranksRes = await fetch('https://valorant-api.com/v1/competitivetiers');
        const ranksJson = await ranksRes.json();
        const competitiveTiers = ranksJson.data?.[ranksJson.data.length - 1]?.tiers || [];
        const validRanks = competitiveTiers.filter((t: any) => t.tier > 2);
        setRanks(validRanks);

        // Player cards
        const cardsRes = await fetch('https://valorant-api.com/v1/playercards');
        const cardsJson = await cardsRes.json();
        setCards(cardsJson.data || []);
      } catch (err) {
        console.error('Failed to load asset choices for editing', err);
      }
    }
    loadAssets();
  }, []);

  // Sync canvas crosshair preview
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw green background for high contrast preview
        ctx.fillStyle = '#0F1215';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw subtle pattern grid
        ctx.strokeStyle = 'rgba(255,255,255,0.02)';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 16) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 16) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }

        drawCrosshairOnCanvas(ctx, crosshair, canvas.width / 2, canvas.height / 2);
      }
    }
  }, [crosshair, isEditing]);

  // Enter edit mode
  const handleStartEdit = () => {
    setEditName(profile.username);
    setEditTag(profile.tagline);
    setEditTitle(profile.title);
    setEditLevel(profile.accountLevel);
    setEditRankName(profile.rankName);
    setEditCardUuid(profile.cardUuid);
    setIsEditing(true);
  };

  // Save changes
  const handleSave = async () => {
    setIsEditing(false);
    
    const matchedCard = cards.find(c => c.uuid === editCardUuid) || cards[0];
    const matchedRank = ranks.find(r => r.tierName === editRankName) || ranks[ranks.length - 1];

    const updatedProfile: ProfileData = {
      username: editName.trim() || 'JETT',
      tagline: editTag.trim().startsWith('#') ? editTag.trim() : `#${editTag.trim()}`,
      title: editTitle.trim(),
      accountLevel: editLevel,
      cardUuid: editCardUuid || profile.cardUuid,
      cardWideArt: matchedCard?.wideArt || profile.cardWideArt,
      cardLargeArt: matchedCard?.largeArt || profile.cardLargeArt,
      rankName: editRankName,
      rankIcon: matchedRank?.largeIcon || profile.rankIcon
    };

    // Save to local storage
    saveLocalSetupData({ profile: updatedProfile });
    setProfile(updatedProfile);

    // Sync to cloud if user logged in
    if (user) {
      setIsSyncing(true);
      await syncLocalStorageToSupabase();
      setIsSyncing(false);
    }

    setNotification({ msg: 'Profile updated successfully!', type: 'success' });
    setTimeout(() => setNotification(null), 3000);
  };

  // Export card to image
  const handleExport = async () => {
    if (!exportAreaRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(exportAreaRef.current, {
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#0B0E11',
        scale: 2 // Make it high-res
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `valportal_${profile.username.toLowerCase()}_setup.png`;
      link.href = dataUrl;
      link.click();
      
      setNotification({ msg: 'Card exported successfully!', type: 'success' });
    } catch (err) {
      console.error('Export failed:', err);
      setNotification({ msg: 'Failed to export card image.', type: 'error' });
    } finally {
      setIsExporting(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // ─── Mode Render Styling ──────────────────────────────────────────────────

  const MODE_METRICS = {
    gridshot:   { label: 'Gridshot',   color: '#00F0FF', border: 'border-[#00F0FF]/20', bg: 'bg-[#00F0FF]/5' },
    microflick: { label: 'Microflick', color: '#FFB800', border: 'border-[#FFB800]/20', bg: 'bg-[#FFB800]/5' },
    tracking:   { label: 'Tracking',   color: '#FF4655', border: 'border-[#FF4655]/20', bg: 'bg-[#FF4655]/5' },
    reflex:     { label: 'Reflex',     color: '#00FF66', border: 'border-[#00FF66]/20', bg: 'bg-[#00FF66]/5' }
  };

  const getRankGlow = (rankName: string) => {
    const r = rankName.toUpperCase();
    if (r === 'RADIANT') return 'shadow-[0_0_20px_rgba(255,215,0,0.2)] border-[#FFD700]/30';
    if (r === 'IMMORTAL') return 'shadow-[0_0_20px_rgba(255,70,85,0.2)] border-[#FF4655]/30';
    return 'border-white/5';
  };

  // Show Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0B0E11] text-white flex flex-col items-center justify-center font-mono">
        <Loader2 size={32} className="animate-spin text-[#00FF66] mb-4" />
        <span className="text-xs uppercase tracking-widest text-gray-500 font-bold">Authenticating Agent...</span>
      </div>
    );
  }

  // Show Restricted Access screen for guest users
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0B0E11] text-white flex flex-col font-mono">
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
        
        {/* Header */}
        <header className="border-b border-white/5 bg-[#0F1215]/95 sticky top-0 z-50 px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBackToHome}
              className="p-1.5 border border-white/10 hover:border-[#FF4655] transition text-gray-400 hover:text-white cursor-pointer"
            >
              <ArrowLeft size={14} />
            </button>
            <div>
              <h1 className="font-rajdhani font-bold tracking-widest text-base sm:text-lg text-white leading-none flex items-center space-x-2">
                <User size={16} className="text-[#FF4655]" />
                <span>ACCESS RESTRICTED</span>
              </h1>
            </div>
          </div>
        </header>

        {/* Restricted content block */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-6">
          <div className="w-16 h-16 bg-[#FF4655]/10 border border-[#FF4655]/30 rounded-none flex items-center justify-center text-[#FF4655] shadow-2xl filter drop-shadow-[0_0_15px_rgba(255,70,85,0.3)] animate-pulse">
            <Lock size={24} />
          </div>
          
          <div className="space-y-2">
            <h2 className="font-rajdhani font-black text-2xl tracking-widest text-white uppercase">AUTHENTICATION REQUIRED</h2>
            <p className="text-xs text-gray-400 leading-relaxed font-mono">
              Access to setup profiles and training records is restricted to registered agents. Please sign in or register to set up your profile card, track aim stats, and sync settings across devices.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full pt-4">
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex-1 py-3 bg-gradient-to-r from-[#FF4655] to-[#FF6B78] hover:brightness-110 text-white font-mono font-bold text-xs uppercase tracking-widest transition cursor-pointer flex items-center justify-center space-x-2 rounded-none"
            >
              <Lock size={12} />
              <span>AUTHENTICATE</span>
            </button>
            <button
              onClick={onBackToHome}
              className="px-6 py-3 border border-white/10 text-gray-400 hover:text-white hover:border-white/30 font-mono font-bold text-xs uppercase tracking-widest transition cursor-pointer rounded-none"
            >
              RETURN
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E11] text-white flex flex-col font-mono">
      {/* Auth Modal falls */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {/* Header */}
      <header className="border-b border-white/5 bg-[#0F1215]/95 sticky top-0 z-50 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToHome}
            className="p-1.5 border border-white/10 hover:border-[#FF4655] transition text-gray-400 hover:text-white cursor-pointer"
          >
            <ArrowLeft size={14} />
          </button>
          <div>
            <h1 className="font-rajdhani font-bold tracking-widest text-base sm:text-lg text-white leading-none flex items-center space-x-2">
              <User size={16} className="text-[#00FF66]" />
              <span>{t('PROFILE')}</span>
            </h1>
            <p className="text-[9px] font-mono text-[#00FF66] tracking-widest uppercase hidden sm:block">Tactical setup ID & stats</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {isSyncing && (
            <div className="flex items-center space-x-1.5 text-xs text-gray-500">
              <Loader2 size={12} className="animate-spin text-[#00FF66]" />
              <span className="hidden sm:inline">Syncing...</span>
            </div>
          )}
          
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-3 py-1.5 border border-white/10 hover:border-[#00FF66] transition text-xs font-bold text-gray-300 hover:text-white flex items-center space-x-2 cursor-pointer bg-white/5 disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 size={12} className="animate-spin text-[#00FF66]" />
            ) : (
              <Download size={12} className="text-[#00FF66]" />
            )}
            <span>EXPORT SETUP CARD</span>
          </button>
        </div>
      </header>

      {/* Notifications */}
      {notification && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-2 text-xs border font-bold flex items-center space-x-2 animate-fade-in ${
          notification.type === 'success' ? 'bg-[#00FF66]/10 border-[#00FF66]/30 text-[#00FF66]' : 'bg-[#FF4655]/10 border-[#FF4655]/30 text-[#FF4655]'
        }`}>
          <Check size={12} />
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Main Profile Grid */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 overflow-y-auto">
        
        {/* Left Column: Player ID Card (4 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col space-y-4">
          
          {/* Visual Container target for html2canvas */}
          <div 
            ref={exportAreaRef}
            className={`w-full bg-[#0F1215] border p-6 flex flex-col space-y-6 relative overflow-hidden transition-all duration-300 ${getRankGlow(profile.rankName)}`}
          >
            {/* Background Corner Decos */}
            <div className="absolute top-0 left-0 w-8 h-[2px] bg-[#FF4655]" />
            <div className="absolute top-0 left-0 w-[2px] h-8 bg-[#FF4655]" />
            <div className="absolute bottom-0 right-0 w-8 h-[2px] bg-[#00FF66]" />
            <div className="absolute bottom-0 right-0 w-[2px] h-8 bg-[#00FF66]" />

            {/* Title Badge overlay */}
            <div className="absolute top-3 right-3 text-[7px] font-bold text-gray-500 tracking-widest uppercase">
              VALORANT TACTICAL ID //
            </div>

            {/* 1. Main player card vertical showcase */}
            <div className="relative aspect-[268/560] w-full bg-[#161A1E] border border-white/5 overflow-hidden flex items-end shadow-2xl">
              {profile.cardLargeArt ? (
                <img 
                  src={profile.cardLargeArt} 
                  alt="Player Card" 
                  className="absolute inset-0 w-full h-full object-cover select-none"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="absolute inset-0 bg-[#161A1E] flex items-center justify-center text-gray-700">No Image</div>
              )}

              {/* Tint Overlay bottom */}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/80 to-transparent" />

              {/* Card visual elements */}
              <div className="relative p-4 w-full flex flex-col space-y-1.5 text-center">
                <p className="text-[10px] font-bold tracking-widest text-[#FF4655] uppercase leading-none font-rajdhani">
                  {profile.title || 'UNLEASHED'}
                </p>
                <h2 className="text-2xl font-rajdhani font-black tracking-tight text-white leading-none flex items-center justify-center space-x-1">
                  <span>{profile.username}</span>
                  <span className="text-gray-500 text-xs font-mono font-normal">{profile.tagline}</span>
                </h2>
                
                {/* Level indicators */}
                <div className="flex items-center justify-center pt-2">
                  <div className="px-2.5 py-0.5 border border-white/20 bg-black/60 rounded-none text-[9px] font-bold tracking-widest text-gray-300">
                    LVL {profile.accountLevel}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Rank & Specs Summary */}
            <div className="grid grid-cols-12 gap-4 items-center bg-black/40 border border-white/5 p-4">
              <div className="col-span-4 flex justify-center">
                {profile.rankIcon ? (
                  <img 
                    src={profile.rankIcon} 
                    alt={profile.rankName}
                    className="w-14 h-14 object-contain filter drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center text-gray-600">No Rank</div>
                )}
              </div>
              <div className="col-span-8 space-y-1 leading-none">
                <span className="text-[8px] font-bold text-gray-500 tracking-wider uppercase block">Current Rank</span>
                <span className="text-base font-rajdhani font-black text-white block uppercase tracking-widest">
                  {profile.rankName}
                </span>
                <div className="flex items-center space-x-1.5 pt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66]" />
                  <span className="text-[8.5px] text-gray-400 uppercase tracking-widest">Setup Synchronized</span>
                </div>
              </div>
            </div>

            {/* Setup card footer watermark */}
            <div className="flex justify-between items-center text-[7.5px] font-mono text-gray-600 tracking-widest uppercase">
              <span>VALPORTAL UTILITY v1.2</span>
              <span>EST. 2026</span>
            </div>
          </div>

          {/* Edit Profile Button */}
          {!isEditing ? (
            <button
              onClick={handleStartEdit}
              className="w-full py-2.5 border border-white/10 hover:border-[#00F0FF] hover:bg-[#00F0FF]/5 text-gray-300 hover:text-white font-mono font-bold text-xs uppercase tracking-widest transition cursor-pointer flex items-center justify-center space-x-2"
            >
              <Edit3 size={13} />
              <span>EDIT SETUP PROFILE</span>
            </button>
          ) : (
            <div className="border border-[#00F0FF]/20 bg-[#0F1215] p-5 space-y-4">
              <div className="text-xs font-bold font-rajdhani tracking-widest text-[#00F0FF] uppercase border-b border-white/5 pb-1">Edit Setup Details</div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[8px] text-gray-400 block mb-0.5 uppercase tracking-wider">Username</label>
                  <input
                    type="text"
                    maxLength={16}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value.toUpperCase())}
                    className="w-full bg-[#161A1E] border border-white/5 px-2.5 py-1.5 text-xs text-white uppercase focus:border-[#00F0FF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[8px] text-gray-400 block mb-0.5 uppercase tracking-wider">Tagline</label>
                  <input
                    type="text"
                    maxLength={5}
                    value={editTag}
                    onChange={(e) => setEditTag(e.target.value.toUpperCase())}
                    className="w-full bg-[#161A1E] border border-white/5 px-2.5 py-1.5 text-xs text-white uppercase focus:border-[#00F0FF] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[8px] text-gray-400 block mb-0.5 uppercase tracking-wider">Title</label>
                  <input
                    type="text"
                    maxLength={20}
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value.toUpperCase())}
                    className="w-full bg-[#161A1E] border border-white/5 px-2.5 py-1.5 text-xs text-white uppercase focus:border-[#00F0FF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[8px] text-gray-400 block mb-0.5 uppercase tracking-wider">Level</label>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={editLevel}
                    onChange={(e) => setEditLevel(Math.min(999, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                    className="w-full bg-[#161A1E] border border-white/5 px-2.5 py-1.5 text-xs text-white focus:border-[#00F0FF] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[8px] text-gray-400 block mb-0.5 uppercase tracking-wider">Rank Selection</label>
                <select
                  value={editRankName}
                  onChange={(e) => setEditRankName(e.target.value)}
                  className="w-full bg-[#161A1E] border border-white/5 px-2.5 py-1.5 text-xs text-white focus:border-[#00F0FF] focus:outline-none"
                >
                  {ranks.map((r, idx) => (
                    <option key={idx} value={r.tierName}>{r.tierName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[8px] text-gray-400 block mb-0.5 uppercase tracking-wider">Player Card Selection</label>
                <select
                  value={editCardUuid}
                  onChange={(e) => setEditCardUuid(e.target.value)}
                  className="w-full bg-[#161A1E] border border-white/5 px-2.5 py-1.5 text-xs text-white focus:border-[#00F0FF] focus:outline-none"
                >
                  {cards.map((c, idx) => (
                    <option key={idx} value={c.uuid}>{c.displayName}</option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-2 pt-1.5">
                <button
                  onClick={handleSave}
                  className="flex-1 py-2 bg-gradient-to-r from-[#00FF66]/20 to-[#00FF66]/30 hover:from-[#00FF66]/30 hover:to-[#00FF66]/40 border border-[#00FF66]/30 text-white font-mono font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center space-x-2"
                >
                  <Save size={12} />
                  <span>Save changes</span>
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-2 border border-white/10 hover:border-white/20 text-gray-400 hover:text-white font-mono font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Setup Specifications & Stats (8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col space-y-6">

          {/* 1. Active Setup Block */}
          <div className="bg-[#0F1215] border border-white/5 p-6 relative space-y-5">
            {/* Top accent */}
            <div className="absolute top-0 left-0 w-8 h-[2px] bg-[#00F0FF]" />
            <div className="absolute top-0 left-0 w-[2px] h-8 bg-[#00F0FF]" />
            <h3 className="font-rajdhani font-black text-sm text-white tracking-widest uppercase text-[#00F0FF] flex items-center space-x-2">
              <Settings size={15} />
              <span>ACTIVE HARDWARE & CROSSHAIR SETUP //</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Sensitivity specs */}
              <div className="bg-[#161A1E] border border-white/5 p-4 flex flex-col justify-between space-y-4">
                <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest border-b border-white/5 pb-1">Sensitivity Specs</div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <span className="text-2xl font-bold font-mono text-white block">{settings.sens.toFixed(3)}</span>
                    <span className="text-[7px] text-gray-600 block uppercase tracking-wider mt-0.5">Sens</span>
                  </div>
                  <div className="text-center border-x border-white/5">
                    <span className="text-2xl font-bold font-mono text-[#FFD700] block">{settings.dpi}</span>
                    <span className="text-[7px] text-gray-600 block uppercase tracking-wider mt-0.5">DPI</span>
                  </div>
                  <div className="text-center">
                    <span className="text-2xl font-bold font-mono text-[#00F0FF] block">{settings.edpi}</span>
                    <span className="text-[7px] text-gray-600 block uppercase tracking-wider mt-0.5">eDPI</span>
                  </div>
                </div>

                <div className="text-[8px] text-gray-500 font-mono leading-tight">
                  Calibrated via *Sens Finder* / *Sens Converter*. High eDPI is good for quick entry duelists, low eDPI is optimized for clean sentinel microflicks.
                </div>
              </div>

              {/* Crosshair Specs */}
              <div className="bg-[#161A1E] border border-white/5 p-4 flex flex-row gap-4 items-center justify-between">
                <div className="flex-1 flex flex-col justify-between h-full space-y-2">
                  <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest border-b border-white/5 pb-1 leading-none">Crosshair Preview</div>
                  
                  <div className="space-y-1">
                    <span className="text-[8px] text-gray-400 block uppercase tracking-wider">Active Code</span>
                    <input 
                      type="text" 
                      readOnly 
                      value={crosshair}
                      className="w-full bg-black/40 border border-white/10 px-2 py-1 text-[9px] text-[#00FF66] font-mono cursor-text focus:outline-none select-all"
                    />
                  </div>

                  <span className="text-[7px] text-gray-600 block uppercase tracking-wider">Imported via Crosshair Builder</span>
                </div>

                {/* Live Canvas renderer */}
                <div className="w-20 h-20 bg-[#0F1215] border border-white/10 flex-shrink-0 flex items-center justify-center relative overflow-hidden">
                  <canvas 
                    ref={previewCanvasRef} 
                    width={80} 
                    height={80} 
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* 2. Aim Trainer Performance Dashboard */}
          <div className="bg-[#0F1215] border border-white/5 p-6 relative flex-1 flex flex-col justify-between">
            {/* Top accent */}
            <div className="absolute top-0 left-0 w-8 h-[2px] bg-[#FF4655]" />
            <div className="absolute top-0 left-0 w-[2px] h-8 bg-[#FF4655]" />
            <div>
              <h3 className="font-rajdhani font-black text-sm text-white tracking-widest uppercase text-[#FF4655] mb-5 flex items-center space-x-2">
                <Target size={15} />
                <span>AIM TRAINER PERFORMANCE DASHBOARD //</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(['gridshot', 'microflick', 'tracking', 'reflex'] as (keyof HighScoresData)[]).map((mode) => {
                  const data = aimHighScores[mode];
                  const cfg = MODE_METRICS[mode];
                  return (
                    <div 
                      key={mode}
                      className={`border p-4 relative flex flex-col justify-between space-y-3 transition duration-150 ${cfg.border} ${cfg.bg}`}
                    >
                      {/* Mode Label */}
                      <div className="flex justify-between items-center leading-none">
                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: cfg.color }}>
                          {cfg.label}
                        </span>
                        {data?.rank ? (
                          <span 
                            className="text-[9px] px-1.5 py-0.5 border border-white/10 bg-black/40 font-bold uppercase tracking-widest"
                            style={{ color: data.rank === 'Radiant' ? '#FFD700' : '#FF4655' }}
                          >
                            {data.rank}
                          </span>
                        ) : (
                          <span className="text-[9px] text-gray-600 font-bold uppercase tracking-wider">UNPLAYED</span>
                        )}
                      </div>

                      {/* Score Metrics */}
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <span className="text-xl font-bold font-mono text-white block">
                            {data?.score ?? '-'}
                          </span>
                          <span className="text-[7px] text-gray-500 uppercase tracking-widest block">High Score</span>
                        </div>
                        <div className="border-x border-white/5 px-2">
                          <span className="text-xl font-bold font-mono text-white block">
                            {data?.accuracy ? `${data.accuracy}%` : '-'}
                          </span>
                          <span className="text-[7px] text-gray-500 uppercase tracking-widest block">Accuracy</span>
                        </div>
                        <div className="px-2">
                          <span className="text-xl font-bold font-mono text-white block">
                            {data?.kps ?? '-'}
                          </span>
                          <span className="text-[7px] text-gray-500 uppercase tracking-widest block">KPS</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="text-[8px] text-gray-500 mt-6 leading-tight border-t border-white/5 pt-4">
              *Scores are updated automatically upon round completion in the Aim Trainer page. Track your metrics to increase flicking speed and target lock stability.*
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
