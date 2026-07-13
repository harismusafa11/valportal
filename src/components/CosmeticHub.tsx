import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Search, Download, Award, ChevronDown, Check, Loader2, Sparkles } from 'lucide-react';
import html2canvas from 'html2canvas';
import UserNav from './UserNav';
import { useLanguage } from '../lib/LanguageContext';

interface PlayerCard {
  uuid: string;
  displayName: string;
  smallIcon: string;
  largeArt: string;
  wideArt: string;
}

interface PlayerTitle {
  uuid: string;
  displayName: string;
  titleText: string;
}

interface CompetitiveTier {
  tier: number;
  tierName: string;
  largeIcon: string;
}

interface ValorantAgent {
  uuid: string;
  displayName: string;
  displayIcon: string;
}

interface CosmeticHubProps {
  onBackToHome: () => void;
}

export default function CosmeticHub({ onBackToHome }: CosmeticHubProps) {
  const { language } = useLanguage();

  const localT = (key: string, replacements?: Record<string, string>) => {
    const dicts: Record<string, Record<string, string>> = {
      en: {
        TITLE: 'COSMETIC HUB',
        SUBTITLE: 'VALORANT ID CARD CREATOR',
        PORTAL_ACTIVE: 'CUSTOMIZATION PORTAL ACTIVE',
        LOADING_API: 'SYNCING ASSET DATA FROM VALORANT-API...',
        RETURN_HOME: 'Return to Home',
        VERTICAL_CARD: 'Vertical Player Card',
        HORIZONTAL_BANNER: 'Horizontal Lobby Banner',
        CREATOR_DASHBOARD: 'CREATOR DASHBOARD // ID CARD CUSTOMIZATION',
        AGENT_THEME: 'FEATURED AGENT THEME',
        SELECT_AGENT: 'Select Agent',
        SEARCH_AGENT: 'SEARCH AGENT...',
        NO_AGENTS: 'No agents match your search',
        IDENTITY_LABELS: 'IDENTITY LABELS',
        USERNAME: 'USERNAME',
        TAGLINE: 'TAGLINE',
        ACCOUNT_LEVEL: 'ACCOUNT LEVEL',
        SHOW_BADGE: 'SHOW LEVEL BADGE',
        TITLES_DB: 'PLAYER TITLES DATABASE',
        SELECT_TITLE: 'Select Player Title',
        NO_TITLE: 'NO PLAYER TITLE',
        RANKS_DB: 'COMPETITIVE RANKS DATABASE',
        SELECT_RANK: 'Select Competitive Rank',
        UNRANKED: 'UNRANKED / NO RANK',
        EXPORT_PORTAL: 'IMAGE EXPORT PORTAL',
        DOWNLOAD_CARD: 'GENERATE & DOWNLOAD ID',
        EXPORTING: 'EXPORTING IMAGE...',
        CARDS_ARCHIVE: 'CARDS ARCHIVE',
        EXPLORE_CARDS: 'Explore {count} player card background templates',
        SEARCH_CARD: 'Search Player Card',
        NO_CARDS: 'No cards match your search.',
        COSMETIC_OPTIONS: 'COSMETIC OPTIONS //',
        SELECT_CARD: 'Select Player Card',
        TYPE_CARD_NAME: 'Type card name...',
        SEARCH_TITLE: 'Search Player Title',
        TYPE_TITLE_NAME: 'Type title name...',
        NO_TITLES: 'Titles not found',
        SEARCH_AGENT_LABEL: 'Search Agent',
        SEARCH_AGENT_PLACEHOLDER: 'Search agent...',
        RANKS_LABEL: 'RANKS & BADGES //',
        NO_ICON: 'NO ICON',
        LIVE_PREVIEW: 'LIVE GENERATION PREVIEW //',
        CARD_PREVIEW: 'VALORANT PLAYER CARD PREVIEW',
        NO_AGENT: 'NO AGENT',
        SELECT_WIDE_CARD: 'SELECT WIDE CARD',
        SELECT_PLAYER_CARD: 'SELECT PLAYER CARD'
      },
      id: {
        TITLE: 'HUB KOSMETIK',
        SUBTITLE: 'PEMBUAT KARTU IDENTITAS VALORANT',
        PORTAL_ACTIVE: 'PORTAL KUSTOMISASI AKTIF',
        LOADING_API: 'MENYELARASKAN DATA ASET DARI VALORANT-API...',
        RETURN_HOME: 'Kembali ke Beranda',
        VERTICAL_CARD: 'Kartu Pemain Vertikal',
        HORIZONTAL_BANNER: 'Banner Lobi Horizontal',
        CREATOR_DASHBOARD: 'DASBOR PEMBUAT // KUSTOMISASI KARTU IDENTITAS',
        AGENT_THEME: 'TEMA AGEN PILIHAN',
        SELECT_AGENT: 'Pilih Agen',
        SEARCH_AGENT: 'CARI AGEN...',
        NO_AGENTS: 'Tidak ada agen yang cocok',
        IDENTITY_LABELS: 'LABEL IDENTITAS',
        USERNAME: 'NAMA PENGGUNA',
        TAGLINE: 'TAGLINE',
        ACCOUNT_LEVEL: 'LEVEL AKUN',
        SHOW_BADGE: 'TAMPILKAN BADGE LEVEL',
        TITLES_DB: 'DATABASE GELAR',
        SELECT_TITLE: 'Pilih Gelar Pemain',
        NO_TITLE: 'TANPA GELAR',
        RANKS_DB: 'DATABASE RANK',
        SELECT_RANK: 'Pilih Rank Kompetitif',
        UNRANKED: 'TANPA RANK / UNRANKED',
        EXPORT_PORTAL: 'PORTAL EKSPOR GAMBAR',
        DOWNLOAD_CARD: 'GENERATE & UNDUH ID',
        EXPORTING: 'MENGEKSPOR GAMBAR...',
        CARDS_ARCHIVE: 'ARSIP KARTU',
        EXPLORE_CARDS: 'Jelajahi {count} latar belakang kartu pemain',
        SEARCH_CARD: 'Pencarian Player Card',
        NO_CARDS: 'Tidak ada kartu yang cocok.',
        COSMETIC_OPTIONS: 'PILIHAN KOSMETIK //',
        SELECT_CARD: 'Pilih Kartu',
        TYPE_CARD_NAME: 'Ketik nama kartu...',
        SEARCH_TITLE: 'Pencarian Player Title',
        TYPE_TITLE_NAME: 'Ketik nama gelar...',
        NO_TITLES: 'Gelar tidak ditemukan',
        SEARCH_AGENT_LABEL: 'Pencarian Agent',
        SEARCH_AGENT_PLACEHOLDER: 'Cari agent...',
        RANKS_LABEL: 'PANGKAT & LENCANA //',
        NO_ICON: 'TANPA IKON',
        LIVE_PREVIEW: 'PRATINJAU GENERASI LANGSUNG //',
        CARD_PREVIEW: 'PRATINJAU KARTU PEMAIN VALORANT',
        NO_AGENT: 'TANPA AGEN',
        SELECT_WIDE_CARD: 'PILIH KARTU LEBAR',
        SELECT_PLAYER_CARD: 'PILIH KARTU PEMAIN'
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

  // Data states
  const [playerCards, setPlayerCards] = useState<PlayerCard[]>([]);
  const [playerTitles, setPlayerTitles] = useState<PlayerTitle[]>([]);
  const [ranks, setRanks] = useState<CompetitiveTier[]>([]);
  const [agents, setAgents] = useState<ValorantAgent[]>([]);

  // Layout mode & Agent states
  const [layoutMode, setLayoutMode] = useState<'vertical' | 'horizontal'>('vertical');
  const [selectedAgent, setSelectedAgent] = useState<ValorantAgent | null>(null);
  const [showAgentDropdown, setShowAgentDropdown] = useState<boolean>(false);
  const [agentSearch, setAgentSearch] = useState<string>('');
  
  // Loading & Error states
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Form states
  const [username, setUsername] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('valportal_user_profile');
      if (stored) return JSON.parse(stored).username || 'JETT';
    } catch (_) {}
    return 'JETT';
  });
  const [tagline, setTagline] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('valportal_user_profile');
      if (stored) return JSON.parse(stored).tagline || '#WIND';
    } catch (_) {}
    return '#WIND';
  });
  const [accountLevel, setAccountLevel] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('valportal_user_profile');
      if (stored) return JSON.parse(stored).accountLevel ?? 99;
    } catch (_) {}
    return 99;
  });
  const [showAccountLevel, setShowAccountLevel] = useState<boolean>(true);
  const [selectedCard, setSelectedCard] = useState<PlayerCard | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<PlayerTitle | null>(null);
  const [selectedRank, setSelectedRank] = useState<CompetitiveTier | null>(null);

  // Custom searchable dropdown visibility states
  const [showCardDropdown, setShowCardDropdown] = useState<boolean>(false);
  const [showTitleDropdown, setShowTitleDropdown] = useState<boolean>(false);
  const [cardSearch, setCardSearch] = useState<string>('');
  const [titleSearch, setTitleSearch] = useState<string>('');

  // Local notification state
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const cardRef = useRef<HTMLDivElement | null>(null);
  const cardDropdownRef = useRef<HTMLDivElement | null>(null);
  const titleDropdownRef = useRef<HTMLDivElement | null>(null);
  const agentDropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (cardDropdownRef.current && !cardDropdownRef.current.contains(e.target as Node)) {
        setShowCardDropdown(false);
      }
      if (titleDropdownRef.current && !titleDropdownRef.current.contains(e.target as Node)) {
        setShowTitleDropdown(false);
      }
      if (agentDropdownRef.current && !agentDropdownRef.current.contains(e.target as Node)) {
        setShowAgentDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Save custom player card state to localStorage for Unified Profile
  useEffect(() => {
    if (!selectedCard) return;
    try {
      const profileData = {
        username,
        tagline,
        title: selectedTitle?.displayName || '',
        accountLevel,
        cardUuid: selectedCard.uuid,
        cardWideArt: selectedCard.wideArt,
        cardLargeArt: selectedCard.largeArt,
        rankName: selectedRank?.tierName || 'Unrated',
        rankIcon: selectedRank?.largeIcon || ''
      };
      localStorage.setItem('valportal_user_profile', JSON.stringify(profileData));
    } catch (_) {}
  }, [username, tagline, selectedTitle, accountLevel, selectedCard, selectedRank]);

  // Fetch all assets from Valorant-API
  useEffect(() => {
    async function fetchAssets() {
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch Player Cards
        const cardsRes = await fetch('https://valorant-api.com/v1/playercards');
        if (!cardsRes.ok) throw new Error('Failed to fetch player cards');
        const cardsJson = await cardsRes.json();
        const validCards = (cardsJson.data || []).map((card: any) => ({
          uuid: card.uuid,
          displayName: card.displayName,
          smallIcon: card.smallIcon || '',
          largeArt: card.largeArt || '',
          wideArt: card.wideArt || ''
        }));

        // 2. Fetch Player Titles
        const titlesRes = await fetch('https://valorant-api.com/v1/playertitles');
        if (!titlesRes.ok) throw new Error('Failed to fetch player titles');
        const titlesJson = await titlesRes.json();
        const validTitles = (titlesJson.data || [])
          .filter((t: any) => t.titleText && t.titleText.trim() !== '')
          .map((t: any) => ({
            uuid: t.uuid,
            displayName: t.displayName,
            titleText: t.titleText
          }));

        // 3. Fetch Competitive Tiers
        const ranksRes = await fetch('https://valorant-api.com/v1/competitivetiers');
        if (!ranksRes.ok) throw new Error('Failed to fetch ranks');
        const ranksJson = await ranksRes.json();
        // Get the latest competitive tier list (usually the last in the array)
        const latestTiersGroup = ranksJson.data[ranksJson.data.length - 1];
        const validRanks = (latestTiersGroup.tiers || [])
          .filter((tier: any) => tier.tierName && !['Unused1', 'Unused2'].includes(tier.tierName))
          .map((tier: any) => ({
            tier: tier.tier,
            tierName: tier.tierName,
            largeIcon: tier.largeIcon || ''
          }));

        // 4. Fetch Playable Agents
        const agentsRes = await fetch('https://valorant-api.com/v1/agents?isPlayableCharacter=true');
        if (!agentsRes.ok) throw new Error('Failed to fetch agents');
        const agentsJson = await agentsRes.json();
        const validAgents = (agentsJson.data || []).map((agent: any) => ({
          uuid: agent.uuid,
          displayName: agent.displayName,
          displayIcon: agent.displayIcon || ''
        }));

        setPlayerCards(validCards);
        setPlayerTitles(validTitles);
        setRanks(validRanks);
        setAgents(validAgents);

        // Pre-fill selections
        let storedProfile: any = null;
        try {
          const stored = localStorage.getItem('valportal_user_profile');
          if (stored) storedProfile = JSON.parse(stored);
        } catch (_) {}

        if (validCards.length > 0) {
          const matchedCard = storedProfile?.cardUuid
            ? validCards.find((c: any) => c.uuid === storedProfile.cardUuid)
            : validCards.find((c: any) => c.displayName.toLowerCase().includes('jett'));
          setSelectedCard(matchedCard || validCards[0]);
        }
        if (validTitles.length > 0) {
          const matchedTitle = storedProfile?.title
            ? validTitles.find((t: any) => t.displayName === storedProfile.title)
            : validTitles.find((t: any) => t.displayName.toLowerCase() === 'radiant');
          setSelectedTitle(matchedTitle || validTitles[0]);
        }
        if (validRanks.length > 0) {
          const matchedRank = storedProfile?.rankName
            ? validRanks.find((r: any) => r.tierName === storedProfile.rankName)
            : validRanks.find((r: any) => r.tierName.toLowerCase() === 'radiant');
          setSelectedRank(matchedRank || validRanks[validRanks.length - 1]);
        }
        if (validAgents.length > 0) {
          const defaultAgent = validAgents.find((a: any) => a.displayName.toLowerCase() === 'jett') || validAgents[0];
          setSelectedAgent(defaultAgent);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching cosmetic assets', err);
        setError('Failed to fetch cosmetics from Valorant API. Please check your network connection.');
        setLoading(false);
      }
    }
    fetchAssets();
  }, []);

  // Filter cards, titles, and agents based on search inputs
  const filteredCards = playerCards.filter(card =>
    card.displayName.toLowerCase().includes(cardSearch.toLowerCase())
  );

  const filteredTitles = playerTitles.filter(title =>
    title.displayName.toLowerCase().includes(titleSearch.toLowerCase())
  );

  const filteredAgents = agents.filter(agent =>
    agent.displayName.toLowerCase().includes(agentSearch.toLowerCase())
  );

  // PNG Export Handler — draws card art + border PNG + text onto canvas (same as valocards)
  const handleExportPNG = async () => {
    if (isExporting) return;
    try {
      setIsExporting(true);
      showNotification('GENERATING IMAGE... PLEASE WAIT', 'info');

      const loadImg = (src: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });

      // Helper: stamp branded watermark on canvas
      const stampWatermark = async (ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number) => {
        const PAD = 8;
        const LOGO_H = 18;
        const TEXT = 'ValPortal.NET';
        ctx.font = 'bold 11px "Segoe UI", sans-serif';
        const textW = ctx.measureText(TEXT).width;
        const LOGO_W = LOGO_H; // square-ish logo
        const GAP = 5;
        const pillW = PAD + LOGO_W + GAP + textW + PAD;
        const pillH = 26;
        const pillX = canvasW - pillW - 8;
        const pillY = canvasH - pillH - 8;

        // Semi-transparent dark pill
        ctx.save();
        ctx.globalAlpha = 0.72;
        ctx.fillStyle = '#0A0E11';
        const r = 6;
        ctx.beginPath();
        ctx.moveTo(pillX + r, pillY);
        ctx.lineTo(pillX + pillW - r, pillY);
        ctx.arcTo(pillX + pillW, pillY, pillX + pillW, pillY + r, r);
        ctx.lineTo(pillX + pillW, pillY + pillH - r);
        ctx.arcTo(pillX + pillW, pillY + pillH, pillX + pillW - r, pillY + pillH, r);
        ctx.lineTo(pillX + r, pillY + pillH);
        ctx.arcTo(pillX, pillY + pillH, pillX, pillY + pillH - r, r);
        ctx.lineTo(pillX, pillY + r);
        ctx.arcTo(pillX, pillY, pillX + r, pillY, r);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Logo image
        try {
          const logoImg = await loadImg('/logo.webp');
          ctx.save();
          ctx.globalAlpha = 0.95;
          ctx.drawImage(logoImg, pillX + PAD, pillY + (pillH - LOGO_H) / 2, LOGO_W, LOGO_H);
          ctx.restore();
        } catch { /* skip logo if fails */ }

        // Brand text
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#FF4655';
        ctx.font = 'bold 11px "Segoe UI", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(TEXT, pillX + PAD + LOGO_W + GAP, pillY + pillH / 2 + 0.5);
        ctx.restore();
      };

      if (layoutMode === 'horizontal') {
        const CW = 600;
        const CH = 160;
        const S = 2;
        const canvas = document.createElement('canvas');
        canvas.width = CW * S;
        canvas.height = CH * S;
        const ctx = canvas.getContext('2d')!;
        ctx.scale(S, S);

        // 1. Fill dark background
        ctx.fillStyle = '#0D1117';
        ctx.fillRect(0, 0, CW, CH);

        // 2. Cyan left bar
        ctx.fillStyle = '#57DDC5';
        ctx.fillRect(0, 0, 12, 160);

        // 3. Draw Agent Background gradient
        const grad = ctx.createLinearGradient(12, 0, 140, 0);
        grad.addColorStop(0, 'rgba(87, 221, 197, 0.15)');
        grad.addColorStop(1, 'rgba(87, 221, 197, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(12, 0, 128, 128);

        // 4. Draw Agent Portrait (using displayIcon — same as strategy board)
        if (selectedAgent?.displayIcon) {
          try {
            const agentImg = await loadImg(selectedAgent.displayIcon);
            const rSizeW = 80;
            const rSizeH = 80;
            ctx.drawImage(agentImg, 12 + (128 - rSizeW) / 2, (128 - rSizeH) / 2, rSizeW, rSizeH);
          } catch { /* skip */ }
        }

        // 5. Draw Wide Card Art
        if (selectedCard?.wideArt) {
          try {
            const cardImg = await loadImg(selectedCard.wideArt);
            ctx.drawImage(cardImg, 140, 0, 460, 128);
          } catch { /* skip */ }
        }

        // 6. Draw Bottom Status Bar (Y=129)
        ctx.fillStyle = '#0F1820';
        ctx.fillRect(12, 129, CW - 12, 31);

        // Username
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '700 18px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(username, 22, 129 + 15.5);

        // Title
        ctx.fillStyle = '#888E93';
        ctx.font = '400 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText((selectedTitle?.titleText || '').toUpperCase(), CW / 2 + 6, 129 + 15.5);

        // Agent Name
        ctx.textAlign = 'right';
        ctx.font = '700 10px sans-serif';
        ctx.fillText((selectedAgent?.displayName || '').toUpperCase(), CW - 10, 129 + 15.5);

        // Watermark
        await stampWatermark(ctx, CW, CH);

        // Export
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `valobanner_${username.toLowerCase().replace(/\s+/g, '_')}.png`;
        link.href = url;
        link.click();
        showNotification('LOBBY BANNER DOWNLOADED SUCCESSFULLY!', 'success');
      } else {
        // Canvas matches the exact preview card size: 268x640 at 2x scale
        const CW = 268;
        const CH = 640;
        const S = 2;
        const canvas = document.createElement('canvas');
        canvas.width = CW * S;
        canvas.height = CH * S;
        const ctx = canvas.getContext('2d')!;
        ctx.scale(S, S);

        // 1. Dark background
        ctx.fillStyle = '#0D1117';
        ctx.fillRect(0, 0, CW, CH);

        // 2. Draw player card art (cover fill, clipped to fit border lines)
        if (selectedCard?.largeArt) {
          try {
            const cardImg = await loadImg(selectedCard.largeArt);
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(CW, 0);
            ctx.lineTo(CW, CH * 0.76);
            ctx.lineTo(CW / 2, CH * 0.94);
            ctx.lineTo(0, CH * 0.76);
            ctx.closePath();
            ctx.clip();

            const scale = Math.max(CW / cardImg.width, CH / cardImg.height);
            const dw = cardImg.width * scale;
            const dh = cardImg.height * scale;
            ctx.drawImage(cardImg, (CW - dw) / 2, (CH - dh) / 2, dw, dh);
            ctx.restore();
          } catch { /* skip */ }
        }

        // 3. Draw the card_border.png frame on top (exact valocards technique)
        try {
          const borderImg = await loadImg('/card_border.png');
          ctx.drawImage(borderImg, 0, 0, CW, CH);
        } catch { /* skip if border fails */ }

        // 4. Username text (valocards: bottom-[214px], font-medium text-[16px] text-black)
        ctx.fillStyle = '#000000';
        ctx.font = '600 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(username, CW / 2, CH - 214);

        // 5. Title text (valocards: bottom-[193px], font-normal text-center text-[11px] text-gray-100)
        ctx.fillStyle = '#f3f4f6';
        ctx.font = '400 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText((selectedTitle?.titleText || '').toUpperCase(), CW / 2, CH - 193);

        // 6. Rank icon at bottom center
        if (selectedRank?.largeIcon) {
          try {
            const rankImg = await loadImg(selectedRank.largeIcon);
            const rSize = 60;
            ctx.drawImage(rankImg, CW / 2 - rSize / 2, CH - rSize - 30, rSize, rSize);
          } catch { /* skip */ }
        }

        // 7. Level badge at top center (matching valocards hex badge position)
        if (showAccountLevel) {
          const badgeText = String(accountLevel);
          ctx.fillStyle = '#112326';
          ctx.strokeStyle = '#639D9E';
          ctx.lineWidth = 1;
          const bw = 44, bh = 20;
          const bx = CW / 2 - bw / 2, by = 8;
          ctx.beginPath();
          ctx.moveTo(bx + bw * 0.15, by);
          ctx.lineTo(bx + bw * 0.85, by);
          ctx.lineTo(bx + bw, by + bh * 0.3);
          ctx.lineTo(bx + bw, by + bh * 0.7);
          ctx.lineTo(bx + bw * 0.85, by + bh);
          ctx.lineTo(bx + bw * 0.15, by + bh);
          ctx.lineTo(bx, by + bh * 0.7);
          ctx.lineTo(bx, by + bh * 0.3);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '700 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(badgeText, CW / 2, by + bh / 2 + 1);
        }

        // Watermark
        await stampWatermark(ctx, CW, CH);

        // Export
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `valoid_${username.toLowerCase().replace(/\s+/g, '_')}.png`;
        link.href = url;
        link.click();
        showNotification('ID CARD DOWNLOADED SUCCESSFULLY!', 'success');
      }
    } catch (err) {
      console.error('Failed to export PNG', err);
      showNotification('FAILED TO DOWNLOAD IMAGE', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E11] text-white scanlines font-sans pb-16">
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
            <h1 className="font-rajdhani font-bold tracking-widest text-lg text-white leading-none">{localT('TITLE')}</h1>
            <p className="text-[9px] font-mono text-[#00F0FF] tracking-widest uppercase hidden sm:block">{localT('SUBTITLE')}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2 border border-[#00F0FF]/25 bg-[#00F0FF]/5 px-2.5 py-1 select-none font-mono">
            <span className="w-1.5 h-1.5 bg-[#00F0FF] rounded-full animate-pulse"></span>
            <span className="text-[9px] font-bold tracking-widest text-[#00F0FF] uppercase">{localT('PORTAL_ACTIVE')}</span>
          </div>
          <UserNav />
        </div>
      </header>

      {loading ? (
        <div className="max-w-7xl mx-auto px-6 py-20 text-center flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-8 h-8 text-[#00F0FF] animate-spin" />
          <p className="font-mono text-xs tracking-wider text-gray-500 uppercase">{localT('LOADING_API')}</p>
        </div>
      ) : error ? (
        <div className="max-w-xl mx-auto px-6 py-20 text-center space-y-4">
          <div className="text-[#FF4655] font-mono text-xs border border-[#FF4655]/20 bg-[#FF4655]/5 p-4 rounded-sm">
            {error}
          </div>
          <button 
            onClick={onBackToHome}
            className="px-4 py-2 border border-white/10 text-xs font-mono font-bold uppercase transition hover:border-[#FF4655] text-gray-400 hover:text-white"
          >
            {localT('RETURN_HOME')}
          </button>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            
            {/* PANEL KIRI: CONTROLS */}
            <div className="space-y-6 order-last lg:order-first">

              {/* LAYOUT SELECTOR */}
              <div className="flex border border-white/10 bg-[#0F1215] p-1.5 space-x-2 relative">
                <div className="absolute top-0 left-0 w-4 h-[2px] bg-[#00F0FF]" />
                <div className="absolute top-0 left-0 w-[2px] h-4 bg-[#00F0FF]" />
                <button
                  onClick={() => setLayoutMode('vertical')}
                  className={`flex-1 py-2 text-center text-xs font-rajdhani font-black tracking-wider uppercase transition rounded cursor-pointer ${
                    layoutMode === 'vertical'
                      ? 'bg-[#00F0FF] text-[#101823]'
                      : 'bg-[#161A1E] text-gray-400 hover:text-white'
                  }`}
                >
                  {localT('VERTICAL_CARD')}
                </button>
                <button
                  onClick={() => setLayoutMode('horizontal')}
                  className={`flex-1 py-2 text-center text-xs font-rajdhani font-black tracking-wider uppercase transition rounded cursor-pointer ${
                    layoutMode === 'horizontal'
                      ? 'bg-[#00F0FF] text-[#101823]'
                      : 'bg-[#161A1E] text-gray-400 hover:text-white'
                  }`}
                >
                  {localT('HORIZONTAL_BANNER')}
                </button>
              </div>
              
              {/* GROUP 1: BASIC IDENTITY */}
              <div className="border border-white/10 bg-[#0F1215] p-5 relative">
                <div className="absolute top-0 left-0 w-8 h-[2px] bg-[#00F0FF]" />
                <div className="absolute top-0 left-0 w-[2px] h-8 bg-[#00F0FF]" />
                <h3 className="font-rajdhani font-black text-sm text-white tracking-widest uppercase mb-4 text-[#00F0FF]">{localT('IDENTITY_LABELS')} //</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* IGN */}
                  <div className="space-y-1">
                    <label className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-widest block">{localT('USERNAME')} / IGN</label>
                    <input 
                      type="text"
                      maxLength={15}
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toUpperCase())}
                      className="w-full bg-[#161A1E] border border-white/5 px-3 py-2 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-[#00F0FF]/40 transition rounded uppercase"
                    />
                  </div>

                  {/* Tagline */}
                  <div className="space-y-1">
                    <label className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-widest block">{localT('TAGLINE')}</label>
                    <input 
                      type="text"
                      maxLength={5}
                      value={tagline}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (val && !val.startsWith('#')) val = '#' + val;
                        setTagline(val.toUpperCase());
                      }}
                      className="w-full bg-[#161A1E] border border-white/5 px-3 py-2 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-[#00F0FF]/40 transition rounded uppercase"
                    />
                  </div>

                  {/* Level */}
                  <div className="space-y-1">
                    <label className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-widest block">{localT('ACCOUNT_LEVEL')}</label>
                    <input 
                      type="number"
                      min={1}
                      max={999}
                      value={accountLevel}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (isNaN(val)) setAccountLevel(1);
                        else setAccountLevel(Math.min(999, Math.max(1, val)));
                      }}
                      className="w-full bg-[#161A1E] border border-white/5 px-3 py-2 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-[#00F0FF]/40 transition rounded"
                    />
                    <div className="flex items-center space-x-2 mt-2">
                      <input 
                        type="checkbox"
                        id="toggle-show-level"
                        checked={showAccountLevel}
                        onChange={(e) => setShowAccountLevel(e.target.checked)}
                        className="w-3.5 h-3.5 rounded bg-[#161A1E] border border-white/10 text-[#00F0FF] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#00F0FF]"
                      />
                      <label 
                        htmlFor="toggle-show-level" 
                        className="text-[9px] font-mono text-gray-400 tracking-wider uppercase cursor-pointer select-none"
                      >
                        {localT('SHOW_BADGE')}
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* GROUP 2: SEARCHABLE DROPDOWNS */}
              <div className="border border-white/10 bg-[#0F1215] p-5 relative space-y-5">
                <div className="absolute top-0 left-0 w-8 h-[2px] bg-[#00F0FF]" />
                <div className="absolute top-0 left-0 w-[2px] h-8 bg-[#00F0FF]" />
                <h3 className="font-rajdhani font-black text-sm text-white tracking-widest uppercase text-[#00F0FF]">{localT('COSMETIC_OPTIONS')}</h3>

                {/* Player Card Dropdown */}
                <div className="space-y-1.5" ref={cardDropdownRef}>
                  <label className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-widest block">{localT('SEARCH_CARD')}</label>
                  <div className="relative">
                    <button
                      onClick={() => setShowCardDropdown(!showCardDropdown)}
                      className="w-full flex items-center justify-between bg-[#161A1E] border border-white/5 px-3 py-2.5 text-xs text-left text-white focus:outline-none hover:border-white/10 transition rounded cursor-pointer"
                    >
                      <div className="flex items-center space-x-2.5">
                        {selectedCard?.smallIcon && (
                          <img 
                            src={selectedCard.smallIcon} 
                            alt={selectedCard.displayName} 
                            className="w-6 h-6 object-cover border border-white/10"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <span className="font-mono font-bold uppercase">{selectedCard?.displayName || localT('SELECT_CARD')}</span>
                      </div>
                      <ChevronDown size={14} className="text-gray-400" />
                    </button>

                    {showCardDropdown && (
                      <div className="absolute z-50 left-0 w-full mt-1 bg-[#161A1E] border border-white/10 shadow-2xl rounded-sm overflow-hidden font-mono text-xs">
                        {/* Search Input */}
                        <div className="flex items-center space-x-2 border-b border-white/5 px-3 py-2">
                          <Search size={12} className="text-gray-500" />
                          <input 
                            type="text"
                            placeholder={localT('TYPE_CARD_NAME')}
                            value={cardSearch}
                            onChange={(e) => setCardSearch(e.target.value)}
                            className="w-full bg-transparent border-0 text-xs text-white focus:outline-none placeholder-gray-600 uppercase"
                          />
                        </div>
                        {/* List */}
                        <div className="max-h-[220px] overflow-y-auto scrollbar-thin">
                          {filteredCards.length > 0 ? (
                            filteredCards.map(card => (
                              <button
                                key={card.uuid}
                                onClick={() => {
                                  setSelectedCard(card);
                                  setShowCardDropdown(false);
                                  setCardSearch('');
                                }}
                                className="w-full flex items-center justify-between px-3 py-2 border-b border-white/5 hover:bg-white/5 text-left text-gray-300 hover:text-white transition cursor-pointer"
                              >
                                <div className="flex items-center space-x-2.5">
                                  {card.smallIcon && (
                                    <img 
                                      src={card.smallIcon} 
                                      alt={card.displayName} 
                                      className="w-6 h-6 object-cover border border-white/5"
                                      referrerPolicy="no-referrer"
                                    />
                                  )}
                                  <span className="uppercase font-bold">{card.displayName}</span>
                                </div>
                                {selectedCard?.uuid === card.uuid && <Check size={12} className="text-[#00F0FF]" />}
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-4 text-center text-gray-600 text-[10px] uppercase">{localT('NO_CARDS')}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Player Title Dropdown */}
                <div className="space-y-1.5" ref={titleDropdownRef}>
                  <label className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-widest block">{localT('SEARCH_TITLE')}</label>
                  <div className="relative">
                    <button
                      onClick={() => setShowTitleDropdown(!showTitleDropdown)}
                      className="w-full flex items-center justify-between bg-[#161A1E] border border-white/5 px-3 py-2.5 text-xs text-left text-white focus:outline-none hover:border-white/10 transition rounded cursor-pointer"
                    >
                      <span className="font-mono font-bold uppercase text-[#ECE8E1]">{selectedTitle?.titleText || localT('NO_TITLE')}</span>
                      <ChevronDown size={14} className="text-gray-400" />
                    </button>

                    {showTitleDropdown && (
                      <div className="absolute z-50 left-0 w-full mt-1 bg-[#161A1E] border border-white/10 shadow-2xl rounded-sm overflow-hidden font-mono text-xs">
                        {/* Search Input */}
                        <div className="flex items-center space-x-2 border-b border-white/5 px-3 py-2">
                          <Search size={12} className="text-gray-500" />
                          <input 
                            type="text"
                            placeholder={localT('TYPE_TITLE_NAME')}
                            value={titleSearch}
                            onChange={(e) => setTitleSearch(e.target.value)}
                            className="w-full bg-transparent border-0 text-xs text-white focus:outline-none placeholder-gray-600 uppercase"
                          />
                        </div>
                        {/* List */}
                        <div className="max-h-[200px] overflow-y-auto scrollbar-thin">
                          {filteredTitles.length > 0 ? (
                            filteredTitles.map(title => (
                              <button
                                key={title.uuid}
                                onClick={() => {
                                  setSelectedTitle(title);
                                  setShowTitleDropdown(false);
                                  setTitleSearch('');
                                }}
                                className="w-full flex items-center justify-between px-3 py-2 border-b border-white/5 hover:bg-white/5 text-left text-gray-300 hover:text-white transition cursor-pointer"
                              >
                                <span className="uppercase font-bold text-[#ECE8E1]">{title.titleText}</span>
                                {selectedTitle?.uuid === title.uuid && <Check size={12} className="text-[#00F0FF]" />}
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-4 text-center text-gray-600 text-[10px] uppercase">{localT('NO_TITLES')}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {/* Agent Dropdown (visible in horizontal banner mode) */}
                {layoutMode === 'horizontal' && (
                  <div className="space-y-1.5" ref={agentDropdownRef}>
                    <label className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-widest block">{localT('SEARCH_AGENT_LABEL')}</label>
                    <div className="relative">
                      <button
                        onClick={() => setShowAgentDropdown(!showAgentDropdown)}
                        className="w-full flex items-center justify-between bg-[#161A1E] border border-white/5 px-3 py-2.5 text-xs text-left text-white focus:outline-none hover:border-white/10 transition rounded cursor-pointer"
                      >
                        <div className="flex items-center space-x-2.5">
                          {selectedAgent?.displayIcon && (
                            <img 
                              src={selectedAgent.displayIcon} 
                              alt={selectedAgent.displayName} 
                              crossOrigin="anonymous"
                              className="w-6 h-6 rounded-full bg-black/40 border border-white/15"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <span className="font-mono text-gray-300 font-bold uppercase">
                            {selectedAgent?.displayName || localT('SELECT_AGENT')}
                          </span>
                        </div>
                        <ChevronDown size={14} className="text-gray-500" />
                      </button>

                      {showAgentDropdown && (
                        <div className="absolute left-0 right-0 mt-1.5 bg-[#0F1215] border border-white/10 z-50 rounded shadow-2xl p-2.5 space-y-2">
                          <div className="relative flex items-center">
                            <Search className="absolute left-2.5 text-gray-500" size={12} />
                            <input 
                              type="text"
                              value={agentSearch}
                              onChange={(e) => setAgentSearch(e.target.value)}
                              placeholder={localT('SEARCH_AGENT_PLACEHOLDER')}
                              className="w-full bg-[#161A1E] border border-white/5 pl-8 pr-3 py-1.5 text-xs font-mono text-white placeholder-gray-600 focus:outline-none rounded focus:border-[#00F0FF]/30"
                            />
                          </div>

                          <div className="max-h-[180px] overflow-y-auto custom-scrollbar space-y-0.5">
                            {filteredAgents.length === 0 ? (
                              <div className="text-center text-[10px] text-gray-600 py-3 uppercase font-mono">{localT('NO_AGENTS')}</div>
                            ) : (
                              filteredAgents.map((agent) => (
                                <button
                                  key={agent.uuid}
                                  onClick={() => {
                                    setSelectedAgent(agent);
                                    setShowAgentDropdown(false);
                                    setAgentSearch('');
                                  }}
                                  className="w-full flex items-center justify-between hover:bg-white/5 px-2.5 py-1.5 rounded transition cursor-pointer text-left"
                                >
                                  <div className="flex items-center space-x-2.5">
                                    <img 
                                      src={agent.displayIcon} 
                                      alt={agent.displayName}
                                      crossOrigin="anonymous"
                                      className="w-6 h-6 rounded-full bg-black/40 border border-white/15"
                                      referrerPolicy="no-referrer"
                                    />
                                    <span className="text-[10px] font-mono font-bold text-gray-300 uppercase">
                                      {agent.displayName}
                                    </span>
                                  </div>
                                  {selectedAgent?.uuid === agent.uuid && (
                                    <Check size={11} className="text-[#00F0FF]" />
                                  )}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* GROUP 3: COMPETITIVE RANK GRID */}
              {layoutMode === 'vertical' && (
                <div className="border border-white/10 bg-[#0F1215] p-5 relative">
                  <div className="absolute top-0 left-0 w-8 h-[2px] bg-[#00F0FF]" />
                  <div className="absolute top-0 left-0 w-[2px] h-8 bg-[#00F0FF]" />
                  <h3 className="font-rajdhani font-black text-sm text-white tracking-widest uppercase mb-4 text-[#00F0FF]">{localT('RANKS_LABEL')}</h3>
                  
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                    {ranks.map((rank) => {
                      const isSelected = selectedRank?.tier === rank.tier;
                      return (
                        <button
                          key={rank.tier}
                          onClick={() => setSelectedRank(rank)}
                          className={`p-2 border bg-black/30 hover:bg-white/5 transition duration-150 flex flex-col items-center justify-center space-y-1.5 cursor-pointer group relative ${
                            isSelected ? 'border-[#00F0FF] bg-[#00F0FF]/5' : 'border-white/5'
                          }`}
                          title={rank.tierName}
                        >
                          {rank.largeIcon ? (
                            <img 
                              src={rank.largeIcon} 
                              alt={rank.tierName} 
                              className="w-10 h-10 object-contain group-hover:scale-110 transition duration-150"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-10 h-10 flex items-center justify-center text-[7px] text-gray-600 font-mono uppercase">{localT('NO_ICON')}</div>
                          )}
                          <span className="text-[6.5px] font-mono font-bold text-gray-500 uppercase text-center block leading-none select-none">
                            {rank.tierName}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* PANEL KANAN: LIVE PREVIEW AREA */}
            <div className="flex flex-col items-center justify-center space-y-6 order-first lg:order-last w-full overflow-x-auto pb-4">
              <div className="text-center">
                <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block mb-1">{localT('LIVE_PREVIEW')}</span>
                <span className="font-rajdhani text-xs font-semibold text-[#00F0FF] uppercase tracking-wide">{localT('CARD_PREVIEW')}</span>
              </div>

              {/* CARD PREVIEW — exact valocards technique (vertical vs horizontal layout previews) */}
              {layoutMode === 'horizontal' ? (
                /* HORIZONTAL LOBBY BANNER PREVIEW */
                <div 
                  ref={cardRef as any}
                  className="w-[600px] h-[160px] flex flex-row select-none shadow-2xl bg-[#0D1117] overflow-hidden" 
                  id="banner-preview"
                >
                  {/* Cyan left bar */}
                  <div className="w-[12px] h-[160px] bg-[#57DDC5] shrink-0" />

                  {/* Right side container */}
                  <div className="flex flex-col w-full h-full">
                    <div className="flex flex-row w-full h-[128px]">
                      {/* Agent Portrait (displayIcon — same as strategy board) */}
                      <div className="w-[128px] h-[128px] flex flex-col items-center justify-end bg-gradient-to-r from-[#57DDC5]/[0.15] to-transparent relative overflow-hidden shrink-0 border-r border-white/5">
                        {selectedAgent?.displayIcon ? (
                          <img
                            src={selectedAgent.displayIcon}
                            alt={selectedAgent.displayName}
                            crossOrigin="anonymous"
                            className="w-full h-full object-contain object-bottom select-none pointer-events-none"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full bg-[#161A1E]/30 flex items-center justify-center">
                            <span className="text-[7px] font-mono text-gray-600">{localT('NO_AGENT')}</span>
                          </div>
                        )}
                      </div>

                      {/* Wide Card Art Background */}
                      <div className="w-[460px] h-[128px] relative overflow-hidden bg-black shrink-0">
                        {selectedCard?.wideArt ? (
                          <img
                            src={selectedCard.wideArt}
                            alt="Banner Background"
                            crossOrigin="anonymous"
                            className="w-full h-full object-cover select-none pointer-events-none"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full bg-[#161A1E]/50 flex items-center justify-center">
                            <span className="text-[9px] font-mono text-gray-600 uppercase">{localT('SELECT_WIDE_CARD')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Status details bar */}
                    <div className="h-[31px] w-full mt-[1px] relative bg-[#0F1820] tracking-wide shrink-0">
                      <span className="absolute top-[3px] left-[10px] z-20 font-bold text-[18px] text-white opacity-95 leading-none block">
                        {username}
                      </span>
                      <h3 className="absolute top-[9px] left-1/2 -translate-x-1/2 z-20 font-normal text-[10px] text-[#888E93] uppercase tracking-widest whitespace-nowrap">
                        {selectedTitle?.titleText || ''}
                      </h3>
                      <h2 className="absolute top-[9px] right-[10px] z-20 font-bold text-[10px] text-[#888E93] uppercase tracking-widest leading-none">
                        {selectedAgent?.displayName || ''}
                      </h2>
                    </div>
                  </div>
                </div>
              ) : (
                /* VERTICAL PLAYER CARD PREVIEW */
                <div className="relative w-[268px] h-[640px] select-none shadow-2xl" id="card-preview">
                  {/* Layer 1: Player Card Art (background, cover fill) */}
                  {selectedCard?.largeArt ? (
                    <img
                      src={selectedCard.largeArt}
                      alt="Card Art"
                      crossOrigin="anonymous"
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{
                        clipPath: 'polygon(50% 94%, 100% 76%, 100% 0, 0 0, 0 76%)'
                      }}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[#161A1E] flex items-center justify-center">
                      <span className="text-[9px] font-mono text-gray-600 uppercase">{localT('SELECT_PLAYER_CARD')}</span>
                    </div>
                  )}

                  {/* Layer 2: card_border.png transparent overlay (provides the frame, V-shape, name/title boxes) */}
                  <img
                    ref={cardRef as any}
                    src="/card_border.png"
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none"
                  />

                  {/* Layer 3: Username text — valocards: bottom-[214px], font-medium text-[16px] text-black */}
                  <h2 className="absolute bottom-[214px] left-1/2 -translate-x-1/2 z-20 font-semibold text-[16px] text-black whitespace-nowrap">
                    {username}
                  </h2>

                  {/* Layer 4: Title text — valocards: bottom-[193px], font-normal text-center text-[11px] text-gray-100 */}
                  <h3 className="absolute bottom-[193px] w-full left-1/2 -translate-x-1/2 z-20 font-normal text-center text-[11px] text-gray-100">
                    {selectedTitle?.titleText || ''}
                  </h3>

                  {/* Layer 5: Rank emblem at bottom center */}
                  {selectedRank?.largeIcon && (
                    <div className="absolute bottom-[28px] left-1/2 -translate-x-1/2 z-20">
                      <img
                        src={selectedRank.largeIcon}
                        alt={selectedRank.tierName}
                        crossOrigin="anonymous"
                        className="w-[60px] h-[60px] object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  {/* Layer 6: Level badge at top center */}
                  {showAccountLevel && (
                    <div className="absolute top-[8px] left-1/2 -translate-x-1/2 z-20">
                      <div
                        className="bg-[#112326] border border-[#639D9E] px-3 py-0.5 text-white font-bold text-[11px] text-center min-w-[44px]"
                        style={{ clipPath: 'polygon(15% 0, 85% 0, 100% 30%, 100% 70%, 85% 100%, 15% 100%, 0 70%, 0 30%)' }}
                      >
                        {accountLevel}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* GENERATE BUTTON */}
              <button
                onClick={handleExportPNG}
                disabled={isExporting}
                className="w-[300px] py-3 bg-[#FF4655] hover:bg-[#FF4655]/90 disabled:bg-[#FF4655]/60 text-white font-rajdhani font-black tracking-widest text-xs uppercase transition-all duration-300 relative overflow-hidden group shadow-lg shadow-[#FF4655]/20 hover:shadow-[#FF4655]/40 flex items-center justify-center space-x-2 cursor-pointer rounded-sm"
              >
                {isExporting ? (
                  <>
                    <Loader2 size={13} className="animate-spin text-white" />
                    <span>{localT('EXPORTING')}</span>
                  </>
                ) : (
                  <>
                    <Download size={13} className="group-hover:translate-y-0.5 transition duration-150" />
                    <span>{localT('DOWNLOAD_CARD')}</span>
                  </>
                )}
                <div className="absolute top-0 right-0 w-[4px] h-full bg-white/20 skew-x-12 translate-x-10 group-hover:-translate-x-96 transition-all duration-1000" />
              </button>

            </div>

          </div>
        </div>
      )}

      {/* Floating Notification */}
      {notification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#0F1215]/95 border border-[#00F0FF]/30 px-4 py-3 shadow-2xl flex items-center space-x-3 backdrop-blur font-mono text-xs max-w-sm rounded">
          <span className={`w-2 h-2 rounded-full ${
            notification.type === 'success' ? 'bg-green-500' :
            notification.type === 'error' ? 'bg-[#FF4655]' : 'bg-[#00F0FF] animate-pulse'
          }`} />
          <span className="text-white uppercase font-bold tracking-wider">{notification.message}</span>
        </div>
      )}
    </div>
  );
}
