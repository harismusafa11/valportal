import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  Search,
  Video,
  Anchor,
  Layers,
  Film,
  Compass,
  Shield,
  Tag,
  Activity,
  Sparkles,
  Check,
  Loader2,
  ChevronRight,
  Maximize2,
  Volume2,
  Play
} from 'lucide-react';
import UserNav from './UserNav';
import { useLanguage } from '../lib/LanguageContext';

// Valorant Content Tier UUIDs to Colors
const TIER_COLORS: Record<string, string> = {
  'e07bf407-3047-4979-ad4c-fb8e973b55c6': '#005af0', // Select Edition (Blue)
  '5a72a4c4-de13-4928-945f-28495cd0c14c': '#00b464', // Deluxe Edition (Green)
  '0cebb8ab-9c3d-476b-94d3-02fe4d49b543': '#a000e1', // Premium Edition (Purple)
  '12683d76-41d7-4be6-a115-77885794e34e': '#f0b400', // Ultra Edition (Yellow/Gold)
  '07631e78-52c0-4279-ad4c-fb8e973b55c6': '#ff4655'  // Exclusive Edition (Red)
};

// YouTube video IDs for Flex Items
const FLEX_YOUTUBE_IDS: Record<string, string[]> = {
  'fc33f376-4a58-687c-6961-bd8a7e529346': ["72RrxmkU3uk","5l1tnqKkDQc","mLE67NxTmiE"],
  '80a11c6a-4d28-bfad-5594-2e9369b7787a': ["Xh5Mi5v1H-s","w2r_D3cv30w","wOs8zru1WSY"],
  '2c270c5a-4da2-b120-df90-ee89f6bfc55f': ["Zx6veCyoHmk","NklK2AkQm7w","JUpsOpuwOmU"],
  '833953fa-439e-b808-de05-7c895f7cd117': ["Z01kowYPAhI","Uz52nDtCPRg","V9Xx3G5fCmk"],
  'e4abaf07-4c46-73df-f67b-72b6932a5ff9': ["WhRCSJaavNs","UoaUZ8Pwg7A","4UqhAIad1ws"],
  '26d0a6cb-4f8c-04b8-fdb0-cc8b1adf8b59': ["zK87UG6hP_E","QRMzPCMYrsM","Eyz47gJVyCQ"],
  'cb4bf100-4590-c564-c805-67bcf98b7baa': ["IH9uVNODV00","YUIlQ0Jrxto","5Ale8nk59bQ"],
  '38dafc48-4668-6f70-1e8c-bf939841cf7e': ["fzXLKDBLJMo","5LJyFEmqRIw","K-54pM6vf7A"],
  'e2207345-4fc9-6967-f800-b18e9d87921a': ["Ax3JIWTzNww","TbKynY6Lhw4","IcuR7U3BSBU"],
  'aa283b9a-44dd-7c05-7017-28889664a848': ["BgKLsyU0seM","DSkU_ySBHdM","Xq3I3XH8jCE"],
  'af52b5a0-4a4c-03b2-c9d7-8187a08a2675': ["KhMdWH1aGdI","5Ale8nk59bQ","5LRZQws_he8"],
  '7f9b236f-40d5-1c22-88a0-d38ffd5c7b8f': ["YUIlQ0Jrxto","G_KEugwxS4A","4QeNV-Djj4I"],
  'd00237ba-487b-142c-64dd-4f91eef9aabf': ["QtdbzolQxZ8","m7_GdI1xwk0","A6xqn9Dmtlc"],
  'f3d05346-4ca8-0f25-6e8e-38bbe0d5bcf0': ["Z01kowYPAhI","ud4eGtDy6O8","ih1V0tV2vgQ"],
  'd3f8f048-4e9c-939d-7233-67892d8b925f': ["k9QqUZyUtgo","5Ale8nk59bQ","R-FZ27fTmGw"],
  'b7190518-4d57-eb8a-6155-1e94de739f74': ["DSkU_ySBHdM","bpxkMRwi4C8","5Ale8nk59bQ"],
  '361edf14-4ae3-3831-eeec-5ea715097341': ["SZA7Bs2gTB0","hvyPdLYICoE","6AoyAxtQhLE"],
  '903aafe1-4f32-d020-6150-51bf2f4888ad': ["6HpbEFmAXHw","f14-9B0FWCY","KKXqo9YWorM"],
  '1e55c382-4a00-0e7b-38f8-e8b148fb2e78': ["c4pBaRFCRYo","7-i9n3mc2NU","sbLdbIu_LMs"],
  'a348bfba-429d-8cf3-e671-1db93db5f793': ["YbaQIvlRKSg","Ua8EsrmbtAs","5Ale8nk59bQ"],
  'a99fca6c-4943-5dca-faf0-53990dddbaf6': ["SxSyahURii4","DttyaKI1-i4","YUIlQ0Jrxto"]
};

// Fallback tier colors by tier name matches
const getTierColorByName = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes('select')) return '#005af0';
  if (n.includes('deluxe')) return '#00b464';
  if (n.includes('premium')) return '#a000e1';
  if (n.includes('ultra')) return '#f0b400';
  if (n.includes('exclusive')) return '#ff4655';
  return '#4b5563'; // default gray
};

interface ArmoryHubProps {
  onBackToHome: () => void;
}

export default function ArmoryHub({ onBackToHome }: ArmoryHubProps) {
  const { language } = useLanguage();
  
  const localT = (key: string, replacements?: Record<string, string>) => {
    const dicts: Record<string, Record<string, string>> = {
      id: {
        COLLECTION: 'KOLEKSI',
        SUBTITLE: 'PANDUAN KOSMETIK & SKIN VALORANT',
        WEAPONS_SKINS: 'SENJATA & SKIN',
        GUN_BUDDIES: 'GUN BUDDIES',
        SPRAYS: 'SPRAY',
        FLEX_ITEMS: 'ITEM UNGGULAN',
        WEAPON_SECTIONS: 'BAGIAN SENJATA //',
        LOADING_CDN: 'MENGUNDUH ASET DEKORATIF DARI CDN...',
        RETURN_HOME: 'Kembali ke Beranda',
        ACTIVE_PREVIEW: 'PRATINJAU SENJATA AKTIF //',
        ATTACHED: 'TERPASANG',
        PLAY_ANIMATION: 'PUTAR VIDEO ANIMASI',
        STOP_VIDEO: 'HENTIKAN VIDEO',
        SELECT_CHROMA: 'PILIH GAYA CHROMA',
        SKINS_COLLECTION: 'KOLEKSI SKIN ({count} ITEM)',
        CLICK_SHOWCASE: 'KLIK KARTU UNTUK MENAMPILKAN',
        BUDDIES_ROSTER: 'DAFTAR GUN BUDDIES',
        EXPLORE_BUDDIES: 'Jelajahi {count} gantungan senjata unik',
        SEARCH_BUDDY: 'CARI BUDDY...',
        SPRAYS_CATALOG: 'KATALOG SPRAY',
        EXPLORE_SPRAYS: 'Jelajahi {count} spray game animasi dan statis',
        SEARCH_SPRAY: 'CARI SPRAY...',
        FLEX_GALLERY: 'GALERI ITEM UNGGULAN',
        EXPLORE_FLEX: 'Lihat skin eksklusif VCT Champions dan pisau melee',
        SEARCH_ITEM: 'CARI ITEM...',
        EQUIPPED: 'Terpasang!',
        EQUIP_ON_WEAPON: 'PASANG PADA SENJATA',
        PLAY_SHOWCASE: 'PUTAR VIDEO TAMPILAN',
        EQUIP_BUDDY: 'PASANG BUDDY PADA SENJATA INI //',
        CLOSE: 'TUTUP',
        ATTACHED_BADGE: '{buddyName} TERPASANG',
        CLOSE_VIDEO: 'CLOSE VIDEO',
        CLOSE_VIDEO_ID: 'TUTUP VIDEO',
        CHROMAS_HEADER: 'Chroma Tersedia (Varian Warna)',
        AVAILABLE_CHROMAS: 'Available Chromas (Color Variants)',
        NO_IMAGE: 'TIDAK ADA GAMBAR',
        SPRAY_TAG: 'Tag Spray Valorant',
        NO_BUDDIES: 'Tidak ada buddy yang cocok.',
        NO_SPRAYS: 'Tidak ada spray yang cocok.',
        NO_FLEX: 'Tidak ada item yang cocok.',
        FLEX_ITEMS_LIST: 'DAFTAR ITEM UNGGULAN',
        EXPLORE_FLEX_ITEMS: 'Jelajahi {count} ekspresi pemain interaktif',
        ACTIVE_FLEX_PREVIEW: 'PRATINJAU EKSPRESI AKTIF // TOTEM INTERAKTIF',
        DIAGNOSTIC_FEED: 'UMPAN DIAGNOSTIK ONLINE',
        SHOWCASE_VIDEOS: 'VIDEO TAMPILAN //',
        CLOSE_FEED: 'TUTUP UMPAN VIDEO'
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

  const [activeTab, setActiveTab] = useState<'weapons' | 'buddies' | 'sprays' | 'flex'>('weapons');

  // Data Cache States (sessionStorage fallback logic)
  const [weapons, setWeapons] = useState<any[]>([]);
  const [contentTiers, setContentTiers] = useState<any[]>([]);
  const [buddies, setBuddies] = useState<any[]>([]);
  const [sprays, setSprays] = useState<any[]>([]);
  const [flexItems, setFlexItems] = useState<any[]>([]);

  // Loading / Error
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search Queries
  const [buddySearch, setBuddySearch] = useState('');
  const [spraySearch, setSpraySearch] = useState('');
  const [flexSearch, setFlexSearch] = useState('');

  // Tab 1: Weapons states
  const [selectedWeapon, setSelectedWeapon] = useState<any | null>(null);
  const [selectedSkin, setSelectedSkin] = useState<any | null>(null);
  const [selectedChroma, setSelectedChroma] = useState<any | null>(null);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [attachedBuddy, setAttachedBuddy] = useState<any | null>(null);

  // Selected Flex Item
  const [selectedFlexItem, setSelectedFlexItem] = useState<any | null>(null);
  const [activeFlexVideoId, setActiveFlexVideoId] = useState<string | null>(null);

  // Hover states for animated sprays
  const [hoveredSprayId, setHoveredSprayId] = useState<string | null>(null);

  // Video Ref
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Load API data with Local Session Caching
  useEffect(() => {
    async function loadAllAssets() {
      try {
        setLoading(true);
        setError(null);

        // 1. Try to recover from sessionStorage
        const cachedWeapons = sessionStorage.getItem('v_armory_weapons');
        const cachedTiers = sessionStorage.getItem('v_armory_tiers');
        const cachedBuddies = sessionStorage.getItem('v_armory_buddies');
        const cachedSprays = sessionStorage.getItem('v_armory_sprays');
        const cachedFlex = sessionStorage.getItem('v_armory_flex');

        if (cachedWeapons && cachedTiers && cachedBuddies && cachedSprays && cachedFlex) {
          setWeapons(JSON.parse(cachedWeapons));
          setContentTiers(JSON.parse(cachedTiers));
          setBuddies(JSON.parse(cachedBuddies));
          setSprays(JSON.parse(cachedSprays));
          
          const parsedFlex = JSON.parse(cachedFlex);
          setFlexItems(parsedFlex);
          if (parsedFlex.length > 0) {
            setSelectedFlexItem(parsedFlex[0]);
            const ids = FLEX_YOUTUBE_IDS[parsedFlex[0].uuid] || [];
            if (ids.length > 0) {
              setActiveFlexVideoId(ids[0]);
            }
          }

          const parsedWeapons = JSON.parse(cachedWeapons);
          if (parsedWeapons.length > 0) {
            setSelectedWeapon(parsedWeapons[0]);
            // Find default skin
            const defaultSkin = parsedWeapons[0].skins.find((s: any) => s.displayName.toLowerCase().includes('standard')) || parsedWeapons[0].skins[0];
            setSelectedSkin(defaultSkin);
            if (defaultSkin?.chromas?.length > 0) {
              setSelectedChroma(defaultSkin.chromas[0]);
            }
          }
          setLoading(false);
          return;
        }

        // 2. Fetch all concurrently
        const [weaponsRes, tiersRes, buddiesRes, spraysRes, flexRes] = await Promise.all([
          fetch('https://valorant-api.com/v1/weapons'),
          fetch('https://valorant-api.com/v1/contenttiers'),
          fetch('https://valorant-api.com/v1/buddies'),
          fetch('https://valorant-api.com/v1/sprays'),
          fetch('https://valorant-api.com/v1/flex')
        ]);

        if (!weaponsRes.ok || !tiersRes.ok || !buddiesRes.ok || !spraysRes.ok || !flexRes.ok) {
          throw new Error('Failed to download visual assets from Valorant CDN servers.');
        }

        const [weaponsJson, tiersJson, buddiesJson, spraysJson, flexJson] = await Promise.all([
          weaponsRes.json(),
          tiersRes.json(),
          buddiesRes.json(),
          spraysRes.json(),
          flexRes.json()
        ]);

        const rawWeapons = weaponsJson.data || [];
        const rawTiers = tiersJson.data || [];
        const rawBuddies = buddiesJson.data || [];
        const rawSprays = spraysJson.data || [];
        const rawFlex = flexJson.data || [];

        // Save cache
        sessionStorage.setItem('v_armory_weapons', JSON.stringify(rawWeapons));
        sessionStorage.setItem('v_armory_tiers', JSON.stringify(rawTiers));
        sessionStorage.setItem('v_armory_buddies', JSON.stringify(rawBuddies));
        sessionStorage.setItem('v_armory_sprays', JSON.stringify(rawSprays));
        sessionStorage.setItem('v_armory_flex', JSON.stringify(rawFlex));

        setWeapons(rawWeapons);
        setContentTiers(rawTiers);
        setBuddies(rawBuddies);
        setSprays(rawSprays);
        setFlexItems(rawFlex);

        if (rawFlex.length > 0) {
          setSelectedFlexItem(rawFlex[0]);
          const ids = FLEX_YOUTUBE_IDS[rawFlex[0].uuid] || [];
          if (ids.length > 0) {
            setActiveFlexVideoId(ids[0]);
          }
        }

        if (rawWeapons.length > 0) {
          setSelectedWeapon(rawWeapons[0]);
          const defaultSkin = rawWeapons[0].skins.find((s: any) => s.displayName.toLowerCase().includes('standard')) || rawWeapons[0].skins[0];
          setSelectedSkin(defaultSkin);
          if (defaultSkin?.chromas?.length > 0) {
            setSelectedChroma(defaultSkin.chromas[0]);
          }
        }
        setLoading(false);
      } catch (err: any) {
        console.error('Armory API fetch failure:', err);
        setError(err.message || 'Failed to fetch CDN assets.');
        setLoading(false);
      }
    }

    loadAllAssets();
  }, []);

  // Map category names based on shopData
  const getWeaponCategory = (weapon: any) => {
    if (!weapon.shopData) {
      return weapon.displayName.toLowerCase() === 'melee' ? 'Melee' : 'Melee';
    }
    const cat = weapon.shopData.categoryText.toUpperCase();
    if (cat.includes('SMG')) return 'SMGs';
    if (cat.includes('RIFLE')) return 'Rifles';
    if (cat.includes('SNIPER')) return 'Snipers';
    if (cat.includes('SHOTGUN')) return 'Shotguns';
    if (cat.includes('HEAVY')) return 'Heavies';
    if (cat.includes('SIDEARM')) return 'Sidearms';
    return 'Other';
  };

  // Group weapons by categories
  const categorizedWeapons = useMemo(() => {
    const groups: Record<string, any[]> = {
      'Sidearms': [],
      'SMGs': [],
      'Shotguns': [],
      'Rifles': [],
      'Snipers': [],
      'Heavies': [],
      'Melee': []
    };

    weapons.forEach(w => {
      const cat = getWeaponCategory(w);
      if (groups[cat]) {
        groups[cat].push(w);
      } else {
        groups['Sidearms'].push(w); // fallback
      }
    });

    return groups;
  }, [weapons]);

  // Map content tier color dynamically
  const getSkinBorderColor = (skin: any) => {
    if (!skin.contentTierUuid) return '#3f3f46'; // standard zinc
    if (TIER_COLORS[skin.contentTierUuid]) return TIER_COLORS[skin.contentTierUuid];

    // Look up in loaded tiers
    const tier = contentTiers.find(t => t.uuid === skin.contentTierUuid);
    if (tier) {
      return getTierColorByName(tier.displayName);
    }
    return '#3f3f46';
  };

  // Find streamed video url from levels
  const getSkinStreamedVideo = (skin: any) => {
    if (!skin?.levels) return null;
    // Look for standard Level 4 or level with finisher
    const videoLevel = skin.levels.slice().reverse().find((lvl: any) => lvl.streamedVideo !== null);
    return videoLevel ? videoLevel.streamedVideo : null;
  };

  const activeVideo = useMemo(() => {
    return getSkinStreamedVideo(selectedSkin);
  }, [selectedSkin]);

  // Handle skin click
  const handleSelectSkin = (skin: any) => {
    setSelectedSkin(skin);
    setActiveVideoUrl(null);
    if (skin?.chromas?.length > 0) {
      setSelectedChroma(skin.chromas[0]);
    } else {
      setSelectedChroma(null);
    }
  };

  // Filtered Buddies
  const filteredBuddies = useMemo(() => {
    return buddies.filter(b =>
      b.displayName.toLowerCase().includes(buddySearch.toLowerCase())
    );
  }, [buddies, buddySearch]);

  // Filtered Sprays
  const filteredSprays = useMemo(() => {
    return sprays.filter(s =>
      s.displayName.toLowerCase().includes(spraySearch.toLowerCase())
    );
  }, [sprays, spraySearch]);
  // Filtered Flex Items
  const filteredFlexItems = useMemo(() => {
    return flexItems.filter(f =>
      f.displayName && f.displayName.toLowerCase().includes(flexSearch.toLowerCase())
    );
  }, [flexItems, flexSearch]);  // Attach Buddy premium simulator
  const handleAttachBuddy = (buddy: any) => {
    setAttachedBuddy(buddy);
    setActiveTab('weapons');
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
            <h1 className="font-rajdhani font-bold tracking-widest text-lg text-white leading-none">{localT('COLLECTION')}</h1>
            <p className="text-[9px] font-mono text-[#FF4655] tracking-widest uppercase hidden sm:block">{localT('SUBTITLE')}</p>
          </div>
        </div>

        {/* Dynamic Top Hub Tabs */}
        <div className="hidden md:flex items-center bg-[#12161A] border border-white/5 p-1 relative">
          {[
            { id: 'weapons', label: localT('WEAPONS_SKINS') },
            { id: 'buddies', label: localT('GUN_BUDDIES') },
            { id: 'sprays', label: localT('SPRAYS') },
            { id: 'flex', label: localT('FLEX_ITEMS') }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setActiveVideoUrl(null);
                }}
                className={`px-4 py-1.5 font-mono text-[10px] font-bold tracking-widest transition relative cursor-pointer ${isActive ? 'text-[#FF4655]' : 'text-gray-400 hover:text-white'
                  }`}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#FF4655]" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center space-x-3">
          <UserNav />
        </div>
      </header>

      {/* Mobile Top Hub Tabs */}
      <div className="md:hidden flex overflow-x-auto bg-[#12161A] border-b border-white/5 px-4 py-2 space-x-2 scrollbar-none">
        {[
          { id: 'weapons', label: localT('WEAPONS_SKINS') },
          { id: 'buddies', label: localT('GUN_BUDDIES') },
          { id: 'sprays', label: localT('SPRAYS') },
          { id: 'flex', label: localT('FLEX_ITEMS') }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setActiveVideoUrl(null);
              }}
              className={`px-3 py-1.5 font-mono text-[9px] font-bold tracking-widest whitespace-nowrap transition border ${isActive ? 'border-[#FF4655] text-[#FF4655]' : 'border-white/5 text-gray-400'
                }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* CONTENT REGION */}
      {loading ? (
        <div className="max-w-7xl mx-auto px-6 py-24 text-center flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-8 h-8 text-[#FF4655] animate-spin" />
          <p className="font-mono text-xs tracking-wider text-gray-500 uppercase">{localT('LOADING_CDN')}</p>
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
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">

          {/* TAB 1: WEAPONS & SKINS */}
          {activeTab === 'weapons' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">

              {/* Left Sidebar (Weapons navigation list) */}
              <aside className="lg:col-span-1 bg-[#12161A] border border-white/5 p-4 space-y-5 rounded-none">
                <div className="border-b border-white/5 pb-2.5">
                  <h3 className="font-rajdhani font-black text-xs text-white tracking-widest uppercase">{localT('WEAPON_SECTIONS')}</h3>
                </div>

                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 scrollbar-thin">
                  {(Object.entries(categorizedWeapons) as [string, any[]][]).map(([category, items]) => {
                    if (items.length === 0) return null;
                    return (
                      <div key={category} className="space-y-1.5">
                        <div className="text-[8px] font-mono font-bold text-gray-500 uppercase tracking-widest block pl-2">{category}</div>
                        <div className="space-y-0.5">
                          {items.map((wp) => {
                            const isSelected = selectedWeapon?.uuid === wp.uuid;
                            return (
                              <button
                                key={wp.uuid}
                                onClick={() => {
                                  setSelectedWeapon(wp);
                                  const def = wp.skins.find((s: any) => s.displayName.toLowerCase().includes('standard')) || wp.skins[0];
                                  handleSelectSkin(def);
                                }}
                                className={`w-full text-left px-3 py-1.5 text-xs font-mono tracking-wider flex items-center justify-between transition cursor-pointer border ${isSelected
                                    ? 'bg-[#FF4655]/5 border-[#FF4655] text-white font-bold'
                                    : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                                  }`}
                              >
                                <span>{wp.displayName.toUpperCase()}</span>
                                <ChevronRight size={10} className={isSelected ? 'text-[#FF4655]' : 'text-gray-600'} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </aside>

              {/* Right Panel (Interactive Showcase) */}
              <div className="lg:col-span-3 space-y-6">

                {/* 1. Live Preview Arena */}
                <div className="bg-[#12161A] border border-white/5 p-6 relative rounded-none flex flex-col items-center">

                  {/* Top Header Labels */}
                  <div className="w-full flex items-center justify-between border-b border-white/5 pb-3.5 mb-6">
                    <div>
                      <span className="text-[8px] font-mono text-[#FF4655] tracking-widest block uppercase font-bold">
                        {localT('ACTIVE_PREVIEW')} {selectedWeapon?.displayName}
                      </span>
                      <h2 className="font-rajdhani text-lg font-black uppercase text-white tracking-widest mt-0.5">
                        {selectedSkin?.displayName}
                      </h2>
                    </div>

                    {/* Attached buddy info badge */}
                    {attachedBuddy && (
                      <div className="flex items-center space-x-2 bg-[#00F0FF]/10 border border-[#00F0FF]/20 px-2.5 py-1">
                        <img
                          src={attachedBuddy.displayIcon}
                          alt={attachedBuddy.displayName}
                          className="w-4.5 h-4.5 object-contain"
                        />
                        <span className="text-[8px] font-mono text-[#00F0FF] font-bold uppercase tracking-widest">
                          {localT('ATTACHED_BADGE', { buddyName: attachedBuddy.displayName })}
                        </span>
                        <button
                          onClick={() => setAttachedBuddy(null)}
                          className="text-[8px] font-mono text-white/50 hover:text-white pl-1 cursor-pointer font-bold"
                          title="Remove buddy"
                        >
                          X
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Main Skin Render Screen */}
                  <div className="w-full h-64 md:h-80 flex items-center justify-center relative bg-black/10 border border-white/5 mb-6 select-none overflow-hidden group">
                    {activeVideoUrl ? (
                      <video
                        ref={videoRef}
                        src={activeVideoUrl}
                        controls
                        autoPlay
                        playsInline
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover max-h-full"
                      />
                    ) : (
                      <>
                        {/* Selected Chroma Gun Skin Image */}
                        <img
                          src={selectedChroma?.displayIcon || selectedSkin?.displayIcon}
                          alt={selectedSkin?.displayName}
                          className="max-w-[85%] max-h-[85%] object-contain drop-shadow-[0_10px_20px_rgba(255,255,255,0.05)] transition-all duration-300 transform group-hover:scale-105"
                          loading="lazy"
                        />

                        {/* Visual Gun Buddy Overlay inside simulator */}
                        {attachedBuddy && (
                          <div
                            className="absolute z-10 bottom-16 right-1/4 animate-bounce"
                            style={{ animationDuration: '3s' }}
                          >
                            <img
                              src={attachedBuddy.displayIcon}
                              alt="buddy overlay"
                              className="w-10 h-10 object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] filter brightness-110"
                            />
                            <div className="w-1.5 h-6 bg-zinc-700/80 mx-auto -mt-1 border-x border-black/30" />
                          </div>
                        )}
                      </>
                    )}

                    {/* Finisher Button */}
                    {activeVideo && !activeVideoUrl && (
                      <button
                        onClick={() => setActiveVideoUrl(activeVideo)}
                        className="absolute bottom-4 right-4 bg-[#FF4655] hover:bg-[#FF4655]/90 text-black px-3.5 py-1.5 text-[9px] font-mono font-bold tracking-widest uppercase flex items-center space-x-1.5 transition active:scale-95 cursor-pointer"
                      >
                        <Play size={10} className="fill-black" />
                        <span>{localT('PLAY_ANIMATION')}</span>
                      </button>
                    )}

                    {activeVideoUrl && (
                      <button
                        onClick={() => setActiveVideoUrl(null)}
                        className="absolute bottom-4 right-4 bg-black/80 hover:bg-black text-white border border-white/10 px-3.5 py-1.5 text-[9px] font-mono tracking-widest uppercase transition active:scale-95 cursor-pointer"
                      >
                        {localT('CLOSE')}
                      </button>
                    )}
                  </div>

                  {/* Chroma Options Selector */}
                  {selectedSkin?.chromas?.length > 1 && (
                    <div className="w-full space-y-2 border-t border-white/5 pt-4">
                      <div className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">{localT('AVAILABLE_CHROMAS')}</div>
                      <div className="flex flex-wrap gap-2.5">
                        {selectedSkin.chromas.map((chroma: any) => {
                          const isSel = selectedChroma?.uuid === chroma.uuid;
                          return (
                            <button
                              key={chroma.uuid}
                              onClick={() => {
                                setSelectedChroma(chroma);
                                setActiveVideoUrl(null);
                              }}
                              className={`px-3 py-1 text-[9px] font-mono border rounded-none uppercase transition cursor-pointer flex items-center space-x-1.5 ${isSel
                                  ? 'bg-[#FF4655] border-[#FF4655] text-black font-bold'
                                  : 'bg-transparent border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                                }`}
                            >
                              {chroma.swatch ? (
                                <img
                                  src={chroma.swatch}
                                  alt="color swatch"
                                  className="w-3.5 h-3.5 object-cover mr-1"
                                />
                              ) : (
                                <span className="w-2 h-2 rounded-full bg-zinc-500 mr-1" />
                              )}
                              <span>{chroma.displayName.replace(selectedSkin.displayName, '').replace('(', '').replace(')', '').trim() || 'DEFAULT'}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Corner bracket aesthetics */}
                  <div className="absolute top-2 right-2 w-2 h-2 border-t border-r border-zinc-700" />
                  <div className="absolute bottom-2 left-2 w-2 h-2 border-b border-l border-zinc-700" />
                </div>

                {/* 2. Skin Grid */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-[9px] font-mono text-gray-400 uppercase tracking-widest block font-bold">
                      {localT('SKINS_COLLECTION', { count: String(selectedWeapon?.skins?.length || 0) })}
                    </span>
                    <span className="text-[8px] font-mono text-gray-500 uppercase">{localT('CLICK_SHOWCASE')}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {selectedWeapon?.skins.map((skin: any) => {
                      const isSelected = selectedSkin?.uuid === skin.uuid;
                      const hasVideo = getSkinStreamedVideo(skin) !== null;
                      const borderColor = getSkinBorderColor(skin);

                      return (
                        <div
                          key={skin.uuid}
                          onClick={() => handleSelectSkin(skin)}
                          className={`relative bg-[#12161A] p-4 flex flex-col items-center justify-between cursor-pointer border group transition duration-150 ${isSelected
                              ? 'bg-white/5 border-white'
                              : 'border-white/5 hover:border-white/20'
                            }`}
                          style={{
                            borderTopColor: borderColor,
                            borderTopWidth: '3px'
                          }}
                        >
                          <div className="w-full aspect-[2/1] flex items-center justify-center mb-3">
                            <img
                              src={skin.displayIcon || skin.chromas?.[0]?.displayIcon}
                              alt={skin.displayName}
                              className="max-w-[90%] max-h-[90%] object-contain group-hover:scale-105 transition duration-150"
                              loading="lazy"
                            />
                          </div>

                          <div className="text-center w-full">
                            <div className="text-[9px] font-mono font-bold tracking-wider truncate uppercase text-[#ECE8E1]">
                              {skin.displayName.replace(selectedWeapon.displayName, '').trim() || 'STANDARD'}
                            </div>

                            {/* Indicators */}
                            <div className="flex items-center justify-center space-x-1.5 mt-1.5">
                              {hasVideo && (
                                <span className="bg-[#FF4655]/10 text-[#FF4655] border border-[#FF4655]/20 px-1 text-[6.5px] font-mono font-bold uppercase rounded-xs">
                                  VIDEO
                                </span>
                              )}
                              {skin.chromas?.length > 1 && (
                                <span className="bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/20 px-1 text-[6.5px] font-mono font-bold uppercase rounded-xs">
                                  {skin.chromas.length} C
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: GUN BUDDIES */}
          {activeTab === 'buddies' && (
            <div className="space-y-6">

              {/* Controls bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-6">
                <div>
                  <h2 className="font-rajdhani text-2xl font-black uppercase tracking-wider text-white">{localT('BUDDIES_ROSTER')}</h2>
                  <p className="font-mono text-[9px] text-gray-500 tracking-widest uppercase mt-0.5">{localT('EXPLORE_BUDDIES', { count: String(filteredBuddies.length) })}</p>
                </div>

                <div className="relative w-full sm:w-72">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 pointer-events-none">
                    <Search size={12} />
                  </span>
                  <input
                    type="text"
                    placeholder={localT('SEARCH_BUDDY')}
                    value={buddySearch}
                    onChange={(e) => setBuddySearch(e.target.value)}
                    className="w-full bg-[#12161A] text-white border border-white/5 focus:border-[#FF4655] focus:outline-none pl-8 pr-4 py-2 text-[10px] font-mono tracking-wider rounded-none uppercase placeholder:text-gray-600"
                  />
                </div>
              </div>

              {/* Grid buddies */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                {filteredBuddies.map((buddy) => (
                  <div
                    key={buddy.uuid}
                    className="bg-[#12161A] border border-white/5 p-4 flex flex-col items-center justify-between text-center relative group"
                  >
                    <div className="w-16 h-16 flex items-center justify-center mb-3">
                      <img
                        src={buddy.displayIcon}
                        alt={buddy.displayName}
                        className="max-w-full max-h-full object-contain group-hover:rotate-12 transition duration-200"
                        loading="lazy"
                      />
                    </div>

                    <div className="space-y-2.5 w-full">
                      <div className="text-[9px] font-mono font-bold tracking-wider truncate uppercase text-gray-300">
                        {buddy.displayName}
                      </div>

                      <button
                        onClick={() => handleAttachBuddy(buddy)}
                        className="w-full py-1 border border-white/5 hover:border-[#00F0FF] hover:bg-[#00F0FF]/5 text-[7.5px] font-mono tracking-widest uppercase text-gray-500 hover:text-white transition cursor-pointer"
                      >
                        {localT('EQUIP_ON_WEAPON')}
                      </button>
                    </div>
                  </div>
                ))}

                {filteredBuddies.length === 0 && (
                  <div className="col-span-full py-12 text-center text-gray-500 font-mono text-xs uppercase">{localT('NO_BUDDIES')}</div>
                )}
              </div>

            </div>
          )}

          {/* TAB 3: SPRAYS */}
          {activeTab === 'sprays' && (
            <div className="space-y-6">

              {/* Controls bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-6">
                <div>
                  <h2 className="font-rajdhani text-2xl font-black uppercase tracking-wider text-white">{localT('SPRAYS_CATALOG')}</h2>
                  <p className="font-mono text-[9px] text-gray-500 tracking-widest uppercase mt-0.5">{localT('EXPLORE_SPRAYS', { count: String(filteredSprays.length) })}</p>
                </div>

                <div className="relative w-full sm:w-72">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 pointer-events-none">
                    <Search size={12} />
                  </span>
                  <input
                    type="text"
                    placeholder={localT('SEARCH_SPRAY')}
                    value={spraySearch}
                    onChange={(e) => setSpraySearch(e.target.value)}
                    className="w-full bg-[#12161A] text-white border border-white/5 focus:border-[#FF4655] focus:outline-none pl-8 pr-4 py-2 text-[10px] font-mono tracking-wider rounded-none uppercase placeholder:text-gray-600"
                  />
                </div>
              </div>

              {/* Grid sprays */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                {filteredSprays.map((spray) => {
                  const isHovered = hoveredSprayId === spray.uuid;
                  // Use animation Gif or Png if available and hovered
                  const displayIcon = (isHovered && (spray.animationGif || spray.animationPng))
                    ? (spray.animationGif || spray.animationPng)
                    : (spray.displayIcon || spray.fullIcon);

                  const releaseInfo = spray.releasedDisplayName || null;

                  return (
                    <div
                      key={spray.uuid}
                      onMouseEnter={() => setHoveredSprayId(spray.uuid)}
                      onMouseLeave={() => setHoveredSprayId(null)}
                      className="bg-[#12161A] border border-white/5 p-4 flex flex-col items-center justify-between text-center relative group"
                    >
                      <div className="w-20 h-20 flex items-center justify-center mb-3 relative overflow-hidden bg-black/10 border border-white/5">
                        {displayIcon ? (
                          <img
                            src={displayIcon}
                            alt={spray.displayName}
                            className="max-w-[85%] max-h-[85%] object-contain group-hover:scale-105 transition duration-150"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-[7px] text-gray-600 font-mono">{localT('NO_IMAGE')}</span>
                        )}

                        {/* Animated banner label */}
                        {(spray.animationGif || spray.animationPng) && (
                          <span className="absolute top-1 left-1 bg-[#FF4655] text-black text-[5.5px] font-mono font-black uppercase px-1 rounded-xs tracking-wider">
                            ANIMATED
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 w-full text-center">
                        <div className="text-[9px] font-mono font-bold tracking-wider truncate uppercase text-[#ECE8E1]">
                          {spray.displayName}
                        </div>
                        {releaseInfo ? (
                          <div className="text-[6.5px] font-mono text-gray-500 uppercase tracking-widest truncate">
                            {releaseInfo}
                          </div>
                        ) : (
                          <div className="text-[6.5px] font-mono text-gray-600 uppercase tracking-widest truncate">
                            {localT('SPRAY_TAG')}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredSprays.length === 0 && (
                  <div className="col-span-full py-12 text-center text-gray-500 font-mono text-xs uppercase">{localT('NO_SPRAYS')}</div>
                )}
              </div>

            </div>
          )}
          {activeTab === 'flex' && (
            <div className="space-y-6">

              {/* 1. Live Preview Arena */}
              {selectedFlexItem && (
                <div className="bg-[#12161A] border border-white/5 p-6 relative rounded-none flex flex-col items-center">
                  
                  {/* Top Header Labels */}
                  <div className="w-full flex items-center justify-between border-b border-white/5 pb-3.5 mb-6">
                    <div>
                      <span className="text-[8px] font-mono text-[#FF4655] tracking-widest block uppercase font-bold">
                        {localT('ACTIVE_FLEX_PREVIEW')}
                      </span>
                      <h2 className="font-rajdhani text-lg font-black uppercase text-white tracking-widest mt-0.5 animate-pulse">
                        {selectedFlexItem.displayName}
                      </h2>
                    </div>

                    <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      <span className="text-[7.5px] font-mono text-emerald-400 font-bold uppercase tracking-widest">
                        {localT('DIAGNOSTIC_FEED')}
                      </span>
                    </div>
                  </div>

                  {/* Main Holo Showcase Screen */}
                  <div className="w-full h-64 md:h-80 flex items-center justify-center relative bg-black/20 border border-white/5 mb-6 select-none overflow-hidden group">
                    {activeFlexVideoId ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${activeFlexVideoId}?autoplay=1&rel=0`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full object-cover max-h-full border-none"
                      />
                    ) : (
                      <>
                        {/* Retro Grid / Scanning line visual effects */}
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
                        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-[#FF4655]/10 animate-scan pointer-events-none" />

                        {/* Hologram Circle projection ring */}
                        <div className="absolute w-52 h-52 border border-dashed border-[#00F0FF]/15 rounded-full animate-spin pointer-events-none" style={{ animationDuration: '20s' }} />
                        <div className="absolute w-44 h-44 border border-[#FF4655]/10 rounded-full animate-pulse pointer-events-none" />

                        {selectedFlexItem.displayIcon ? (
                          <img
                            src={selectedFlexItem.displayIcon}
                            alt={selectedFlexItem.displayName}
                            className="max-w-[50%] max-h-[50%] object-contain drop-shadow-[0_0_30px_rgba(0,240,255,0.25)] transition-all duration-300 transform group-hover:scale-110 rotate-y-3d"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-[9px] text-gray-500 font-mono">{localT('NO_IMAGE')}</span>
                        )}

                        {/* Overlay metadata */}
                        <div className="absolute bottom-3 left-4 text-left font-mono text-[7px] text-gray-500 space-y-0.5">
                          <div>UUID: {selectedFlexItem.uuid}</div>
                          <div className="truncate max-w-[300px]">PATH: {selectedFlexItem.assetPath}</div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* YouTube Video Selection Buttons */}
                  {FLEX_YOUTUBE_IDS[selectedFlexItem.uuid] && FLEX_YOUTUBE_IDS[selectedFlexItem.uuid].length > 0 && (
                    <div className="w-full space-y-2 border-t border-white/5 pt-4">
                      <div className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">{localT('SHOWCASE_VIDEOS')}</div>
                      <div className="flex flex-wrap gap-2.5">
                        {FLEX_YOUTUBE_IDS[selectedFlexItem.uuid].map((id, index) => (
                          <button
                            key={id}
                            onClick={() => setActiveFlexVideoId(id)}
                            className={`px-3 py-1.5 text-[9px] font-mono border rounded-none uppercase transition cursor-pointer flex items-center space-x-1.5 ${
                              activeFlexVideoId === id
                                ? 'bg-[#FF4655] border-[#FF4655] text-black font-bold'
                                : 'bg-transparent border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                            }`}
                          >
                            <Play size={10} className={activeFlexVideoId === id ? 'fill-black text-black' : 'text-gray-500'} />
                            <span>VIDEO {index + 1}</span>
                          </button>
                        ))}
                        {activeFlexVideoId && (
                          <button
                            onClick={() => setActiveFlexVideoId(null)}
                            className="px-3 py-1.5 text-[9px] font-mono border border-white/10 text-gray-400 hover:text-white hover:border-white/20 rounded-none uppercase transition cursor-pointer"
                          >
                            {localT('CLOSE_FEED')}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Corner bracket aesthetics */}
                  <div className="absolute top-2 right-2 w-2 h-2 border-t border-r border-zinc-700" />
                  <div className="absolute bottom-2 left-2 w-2 h-2 border-b border-l border-zinc-700" />
                </div>
              )}
              
              {/* Controls bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div>
                  <h2 className="font-rajdhani text-lg font-black uppercase tracking-wider text-white">{localT('FLEX_ITEMS_LIST')}</h2>
                  <p className="font-mono text-[9px] text-gray-500 tracking-widest uppercase mt-0.5">{localT('EXPLORE_FLEX_ITEMS', { count: String(filteredFlexItems.length) })}</p>
                </div>

                <div className="relative w-full sm:w-72">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 pointer-events-none">
                    <Search size={12} />
                  </span>
                  <input
                    type="text"
                    placeholder={localT('SEARCH_ITEM')}
                    value={flexSearch}
                    onChange={(e) => setFlexSearch(e.target.value)}
                    className="w-full bg-[#12161A] text-white border border-white/5 focus:border-[#FF4655] focus:outline-none pl-8 pr-4 py-2 text-[10px] font-mono tracking-wider rounded-none uppercase placeholder:text-gray-600"
                  />
                </div>
              </div>

              {/* Grid flex items */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                {filteredFlexItems.map((item) => {
                  const isSelected = selectedFlexItem?.uuid === item.uuid;
                  return (
                    <div
                      key={item.uuid}
                      onClick={() => { 
                        setSelectedFlexItem(item); 
                        const ids = FLEX_YOUTUBE_IDS[item.uuid] || [];
                        if (ids.length > 0) {
                          setActiveFlexVideoId(ids[0]);
                        } else {
                          setActiveFlexVideoId(null);
                        }
                      }}
                      className={`bg-[#12161A] border p-4 flex flex-col items-center justify-between text-center relative group cursor-pointer transition duration-150 ${
                        isSelected ? 'border-[#00F0FF] bg-white/5' : 'border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="w-16 h-16 flex items-center justify-center mb-3 relative overflow-hidden bg-black/10 border border-white/5">
                        {item.displayIcon ? (
                          <img 
                            src={item.displayIcon} 
                            alt={item.displayName} 
                            className="max-w-[85%] max-h-[85%] object-contain group-hover:scale-110 transition duration-150"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-[7px] text-gray-600 font-mono">{localT('NO_IMAGE')}</span>
                        )}
                      </div>

                      <div className="space-y-1 w-full text-center">
                        <div className="text-[9px] font-mono font-bold tracking-wider truncate uppercase text-[#ECE8E1]">
                          {item.displayName}
                        </div>
                        <div className="text-[6.5px] font-mono text-gray-500 uppercase tracking-widest truncate">
                          Interactive Expression
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredFlexItems.length === 0 && (
                  <div className="col-span-full py-12 text-center text-gray-500 font-mono text-xs uppercase">{localT('NO_FLEX')}</div>
                )}
              </div>

            </div>
          )}



        </div>
      )}

    </div>
  );
}
