/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ValorantMap, SavedTactic } from '../types';
import { Search, MapPin, Play, Award, ClipboardList, Layers, ChevronRight, Target, Shield, ChevronDown, Activity, Clock, Plus, Zap, Menu, X, User } from 'lucide-react';
import UserNav from './UserNav';
import { useLanguage } from '../lib/LanguageContext';
import LanguageSelector from './LanguageSelector';

interface HomeProps {
  onSelectMap: (map: ValorantMap) => void;
  onNavigateToGallery: () => void;
  onNavigateToCosmeticHub: () => void;
  onNavigateToCrosshair: () => void;
  onNavigateToArmory: () => void;
  onNavigateToSens: () => void;
  onNavigateToSensFinder: () => void;
  onNavigateToTierList: () => void;
  onNavigateToDraft: () => void;
  onNavigateToAimTrainer: () => void;
  onNavigateToProfile: () => void;
  savedTactics: SavedTactic[];
}

export default function Home({
  onSelectMap,
  onNavigateToGallery,
  onNavigateToCosmeticHub,
  onNavigateToCrosshair,
  onNavigateToArmory,
  onNavigateToSens,
  onNavigateToSensFinder,
  onNavigateToTierList,
  onNavigateToDraft,
  onNavigateToAimTrainer,
  onNavigateToProfile,
  savedTactics
}: HomeProps) {
  const { t } = useLanguage();
  const [maps, setMaps] = useState<ValorantMap[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'active' | 'custom'>('all');
  const [isToolDropdownOpen, setIsToolDropdownOpen] = useState(false);
  const [isAimDropdownOpen, setIsAimDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Valorant-API maps endpoint
  useEffect(() => {
    async function fetchMaps() {
      try {
        setLoading(true);
        const res = await fetch('https://valorant-api.com/v1/maps');
        if (!res.ok) throw new Error('Network response was not ok');
        const json = await res.json();

        // Filter out training range and maps without displayIcon (minimap layout)
        const playableMaps = json.data.filter((m: any) =>
          m.displayIcon !== null &&
          m.displayName.toLowerCase() !== 'the range' &&
          m.displayName.toLowerCase() !== 'pitt'
        );

        // Map to our clean type
        const MAP_SVG_URLS: Record<string, string> = {
          abyss: 'https://resources.strats.gg/images/a1cfbd37-78bb-4db3-b21a-8cff2b97bcc1.svg',
          ascent: 'https://resources.strats.gg/images/3f3c6eb7-160c-4183-b41d-84e1dc7ce61b.svg',
          bind: 'https://s3-us-east-2.amazonaws.com/strats-gg/images/5bae4d50-d938-44c4-982d-be4e96bd46dc.svg',
          breeze: 'https://resources.strats.gg/images/8ed37e0d-1347-4be6-8b95-bca8d26a7529.svg',
          corrode: 'https://resources.strats.gg/images/cfc62a9d-a99f-4dff-8660-8f98623b7c36.svg',
          fracture: 'https://s3-us-east-2.amazonaws.com/strats-gg/images/02cbd304-39ea-4a69-981a-ef637792f940.svg',
          haven: 'https://resources.strats.gg/images/faa88fff-e48c-4ed9-8717-ec74efcf41df.svg',
          icebox: 'https://resources.strats.gg/images/64950889-db94-464d-bda5-55a5b5303642.svg',
          lotus: 'https://resources.strats.gg/images/1611d847-964a-476a-b215-f73130103e13.svg',
          pearl: 'https://resources.strats.gg/images/22c22ed2-6af8-4787-8c12-f780959be1c8.svg',
          split: 'https://s3-us-east-2.amazonaws.com/strats-gg/images/0d76f194-54ad-41ce-930b-dfc46982792f.svg',
          summit: 'https://resources.strats.gg/images/f7e1eed5-c208-4a14-bbf6-92138ae8e7c8.svg',
          sunset: 'https://resources.strats.gg/images/9d92143f-4f74-4e66-b4a1-b64b5806d837.svg'
        };

        const mappedMaps: ValorantMap[] = playableMaps.map((m: any) => {
          const mapNameLower = m.displayName.toLowerCase();
          const customSvgUrl = MAP_SVG_URLS[mapNameLower] || `https://raw.githubusercontent.com/zhongrenfei1-hub/valoplant-tactic-board/main/assets/maps/${m.displayName}_displayIcon.png` || m.displayIcon;
          return {
            uuid: m.uuid,
            displayName: m.displayName,
            coordinates: m.coordinates || '0°00\'N 0°00\'E',
            displayIcon: customSvgUrl,
            splash: m.splash || m.displayIcon,
            listViewIcon: m.listViewIcon
          };
        });

        const customMapsFallback: ValorantMap[] = [
          {
            uuid: 'custom_corrode',
            displayName: 'Corrode',
            coordinates: '42°00\'N 87°37\'W',
            displayIcon: 'https://resources.strats.gg/images/cfc62a9d-a99f-4dff-8660-8f98623b7c36.svg',
            splash: 'https://resources.strats.gg/images/cfc62a9d-a99f-4dff-8660-8f98623b7c36.svg',
            listViewIcon: null
          },
          {
            uuid: 'custom_summit',
            displayName: 'Summit',
            coordinates: '39°44\'N 104°59\'W',
            displayIcon: 'https://resources.strats.gg/images/f7e1eed5-c208-4a14-bbf6-92138ae8e7c8.svg',
            splash: 'https://resources.strats.gg/images/f7e1eed5-c208-4a14-bbf6-92138ae8e7c8.svg',
            listViewIcon: null
          }
        ];

        let mergedMaps = [...mappedMaps];
        customMapsFallback.forEach(cm => {
          if (!mergedMaps.some(m => m.displayName.toLowerCase() === cm.displayName.toLowerCase())) {
            mergedMaps.push(cm);
          }
        });

        setMaps(mergedMaps);
        setLoading(false);
      } catch (err) {
        console.error('Error loading maps', err);
        setError('Failed to download tactical maps from Valorant API. Please check your network connection.');
        setLoading(false);
      }
    }
    fetchMaps();
  }, []);

  // Filtered maps
  const filteredMaps = maps.filter(map => {
    const matchesSearch = map.displayName.toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedCategory === 'all') return matchesSearch;
    // Active pool maps (commonly played maps)
    const activePool = ['Ascent', 'Bind', 'Haven', 'Split', 'Icebox', 'Lotus', 'Sunset', 'Abyss', 'Pearl'];
    if (selectedCategory === 'active') {
      return matchesSearch && activePool.includes(map.displayName);
    }
    // Custom/Other maps (Breeze, Fracture, Pearl, etc. if not in main active)
    if (selectedCategory === 'custom') {
      return matchesSearch && !activePool.includes(map.displayName);
    }
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#0B0E11] text-white scanlines font-sans pb-16">

      {/* HEADER BAR */}
      <header className="border-b border-white/5 bg-[#0F1215]/95 sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img src="/logo.webp" alt="ValPortal Logo" className="w-8 h-8 object-contain" />
          <div>
            <span className="font-rajdhani font-bold tracking-widest text-lg text-white leading-none block">ValPortal</span>
            <p className="text-[9px] font-mono text-[#FF4655] tracking-widest uppercase">{t('TACTICAL_ANALYST_PLATFORM')}</p>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden xl:flex items-center space-x-2.5" aria-label="Desktop Navigation Links">
          {/* Dropdown 1: AIM & SETTINGS */}
          <div className="relative">
            <button
              onClick={() => setIsAimDropdownOpen(!isAimDropdownOpen)}
              className={`px-4 py-1.5 border text-[11px] font-mono font-bold tracking-widest transition duration-150 uppercase bg-[#161A1E] flex items-center space-x-2 cursor-pointer ${
                isAimDropdownOpen ? 'border-[#00F0FF] text-white' : 'border-white/10 text-gray-300 hover:text-white hover:border-[#00F0FF]'
              }`}
            >
              <Activity size={11} className="text-[#00F0FF]" />
              <span>{t('AIM_SETTINGS')}</span>
              <ChevronDown size={10} className={`transition-transform duration-200 ${isAimDropdownOpen ? 'rotate-180 text-[#00F0FF]' : 'text-gray-500'}`} />
            </button>

            {isAimDropdownOpen && (
              <>
                {/* Backdrop click outside closer */}
                <div 
                  className="fixed inset-0 z-40 cursor-default" 
                  onClick={() => setIsAimDropdownOpen(false)} 
                />
                
                {/* Dropdown panel */}
                <div className="absolute right-0 mt-2 w-52 bg-[#0F1215] border border-white/10 shadow-2xl z-50 rounded-none animate-fade-in p-1 space-y-0.5">
                  <button
                    onClick={() => {
                      onNavigateToCrosshair();
                      setIsAimDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-[10px] font-mono font-bold text-gray-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5 transition flex items-center space-x-2.5 cursor-pointer uppercase tracking-wider"
                  >
                    <Target size={12} className="text-[#00FF00]" />
                    <span>{t('CROSSHAIR_BUILDER')}</span>
                  </button>

                  <button
                    onClick={() => {
                      onNavigateToSens();
                      setIsAimDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-[10px] font-mono font-bold text-gray-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5 transition flex items-center space-x-2.5 cursor-pointer uppercase tracking-wider"
                  >
                    <Activity size={12} className="text-[#00F0FF]" />
                    <span>{t('SENS_CONVERTER')}</span>
                  </button>

                  <button
                    onClick={() => {
                      onNavigateToSensFinder();
                      setIsAimDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-[10px] font-mono font-bold text-gray-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5 transition flex items-center space-x-2.5 cursor-pointer uppercase tracking-wider"
                  >
                    <Target size={12} className="text-[#FF4655]" />
                    <span>{t('SENS_FINDER')}</span>
                  </button>

                  <button
                    onClick={() => {
                      onNavigateToAimTrainer();
                      setIsAimDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-[10px] font-mono font-bold text-gray-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5 transition flex items-center space-x-2.5 cursor-pointer uppercase tracking-wider"
                  >
                    <Zap size={12} className="text-[#FFD700]" />
                    <span>{t('AIM_TRAINER')}</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Dropdown 2: VALORANT TOOLS */}
          <div className="relative">
            <button
              onClick={() => setIsToolDropdownOpen(!isToolDropdownOpen)}
              className={`px-4 py-1.5 border text-[11px] font-mono font-bold tracking-widest transition duration-150 uppercase bg-[#161A1E] flex items-center space-x-2 cursor-pointer ${
                isToolDropdownOpen ? 'border-[#00F0FF] text-white' : 'border-white/10 text-gray-300 hover:text-white hover:border-[#00F0FF]'
              }`}
            >
              <Target size={11} className="text-[#00F0FF]" />
              <span>{t('TOOL_VALORANT')}</span>
              <ChevronDown size={10} className={`transition-transform duration-200 ${isToolDropdownOpen ? 'rotate-180 text-[#00F0FF]' : 'text-gray-500'}`} />
            </button>

            {isToolDropdownOpen && (
              <>
                {/* Backdrop click outside closer */}
                <div 
                  className="fixed inset-0 z-40 cursor-default" 
                  onClick={() => setIsToolDropdownOpen(false)} 
                />
                
                {/* Dropdown panel */}
                <div className="absolute right-0 mt-2 w-52 bg-[#0F1215] border border-white/10 shadow-2xl z-50 rounded-none animate-fade-in p-1 space-y-0.5">
                  <button
                    onClick={() => {
                      onNavigateToCosmeticHub();
                      setIsToolDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-[10px] font-mono font-bold text-gray-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5 transition flex items-center space-x-2.5 cursor-pointer uppercase tracking-wider"
                  >
                    <Award size={12} className="text-[#00F0FF]" />
                    <span>PLAYER CARDS GENERATOR</span>
                  </button>

                  <button
                    onClick={() => {
                      onNavigateToTierList();
                      setIsToolDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-[10px] font-mono font-bold text-gray-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5 transition flex items-center space-x-2.5 cursor-pointer uppercase tracking-wider"
                  >
                    <Plus size={12} className="text-[#00FF00]" />
                    <span>{t('TACTICAL_TIER_LIST')}</span>
                  </button>

                  <button
                    onClick={() => {
                      onNavigateToDraft();
                      setIsToolDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-[10px] font-mono font-bold text-gray-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5 transition flex items-center space-x-2.5 cursor-pointer uppercase tracking-wider"
                  >
                    <Zap size={12} className="text-[#00F0FF]" />
                    <span>{t('DRAFT_SIMULATOR')}</span>
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            onClick={onNavigateToArmory}
            className="px-4 py-1.5 border border-white/10 hover:border-[#FF4655] text-[11px] font-mono font-bold tracking-widest transition duration-150 uppercase bg-[#161A1E] text-gray-300 hover:text-white flex items-center space-x-2 cursor-pointer"
          >
            <Shield size={11} className="text-[#FF4655]" />
            <span>{t('ARMORY_HUB')}</span>
          </button>

          <button
            onClick={onNavigateToGallery}
            className="px-4 py-1.5 border border-white/10 hover:border-[#FF2E2E] text-[11px] font-mono font-bold tracking-widest transition duration-150 uppercase bg-[#161A1E] text-gray-300 hover:text-white flex items-center space-x-2 cursor-pointer"
          >
            <Layers size={11} className="text-[#FF2E2E]" />
            <span>STRATEGY HUB ({savedTactics.length})</span>
          </button>

          <button
            onClick={onNavigateToProfile}
            className="px-4 py-1.5 border border-white/10 hover:border-[#00FF66] text-[11px] font-mono font-bold tracking-widest transition duration-150 uppercase bg-[#161A1E] text-gray-300 hover:text-white flex items-center space-x-2 cursor-pointer"
          >
            <User size={11} className="text-[#00FF66]" />
            <span>{t('PROFILE')}</span>
          </button>

          <a
            href="https://discord.gg/uqWBbaXeb"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 border border-white/10 hover:border-[#5865F2] hover:bg-[#5865F2]/10 transition cursor-pointer text-gray-400 hover:text-white flex items-center justify-center rounded-xs"
            title="Join ValPortal Discord"
          >
            <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 127.14 96.36">
              <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36c2.72-3.71,5.12-7.68,7.18-11.85a68.34,68.34,0,0,1-11.27-5.46c.95-.7,1.88-1.42,2.77-2.18a74.37,74.37,0,0,0,73,0c.89.76,1.82,1.48,2.77,2.18a68.34,68.34,0,0,1-11.27,5.46c2.06,4.17,4.46,8.14,7.18,11.85a105.73,105.73,0,0,0,31-18.83C129,54.65,122.84,31.58,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z"/>
            </svg>
          </a>

          <LanguageSelector />
          <UserNav />
        </nav>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle mobile menu"
          className="xl:hidden p-2 text-gray-400 hover:text-white transition duration-150 cursor-pointer"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <nav className="xl:hidden bg-[#0F1215]/98 border-b border-white/5 px-6 py-6 space-y-5 animate-fade-in relative z-50" aria-label="Mobile Navigation">
          <div className="flex flex-col space-y-3">
            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest border-b border-white/5 pb-1">Menu</span>
            
            <button
              onClick={() => {
                onNavigateToArmory();
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 border border-white/10 bg-[#161A1E] text-xs font-mono font-bold text-gray-300 hover:text-white flex items-center space-x-2 cursor-pointer"
            >
              <Shield size={13} className="text-[#FF4655]" />
              <span>{t('ARMORY_HUB')}</span>
            </button>

            <button
              onClick={() => {
                onNavigateToGallery();
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 border border-white/10 bg-[#161A1E] text-xs font-mono font-bold text-gray-300 hover:text-white flex items-center space-x-2 cursor-pointer"
            >
              <Layers size={13} className="text-[#FF2E2E]" />
              <span>STRATEGY HUB ({savedTactics.length})</span>
            </button>

            <button
              onClick={() => {
                onNavigateToProfile();
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 border border-white/10 bg-[#161A1E] text-xs font-mono font-bold text-gray-300 hover:text-white flex items-center space-x-2 cursor-pointer"
            >
              <User size={13} className="text-[#00FF66]" />
              <span>{t('PROFILE')}</span>
            </button>
          </div>

          <div className="flex flex-col space-y-2">
            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest border-b border-white/5 pb-1">{t('AIM_SETTINGS')}</span>
            
            <div className="grid grid-cols-1 gap-2 pt-1">
              <button
                onClick={() => {
                  onNavigateToCrosshair();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-[10px] font-mono font-bold text-gray-400 hover:text-white bg-white/5 border border-transparent hover:border-white/5 transition flex items-center space-x-2.5 cursor-pointer uppercase tracking-wider"
              >
                <Target size={12} className="text-[#00FF00]" />
                <span>{t('CROSSHAIR_BUILDER')}</span>
              </button>

              <button
                onClick={() => {
                  onNavigateToSens();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-[10px] font-mono font-bold text-gray-400 hover:text-white bg-white/5 border border-transparent hover:border-white/5 transition flex items-center space-x-2.5 cursor-pointer uppercase tracking-wider"
              >
                <Activity size={12} className="text-[#00F0FF]" />
                <span>{t('SENS_CONVERTER')}</span>
              </button>

              <button
                onClick={() => {
                  onNavigateToSensFinder();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-[10px] font-mono font-bold text-gray-400 hover:text-white bg-white/5 border border-transparent hover:border-white/5 transition flex items-center space-x-2.5 cursor-pointer uppercase tracking-wider"
              >
                <Target size={12} className="text-[#FF4655]" />
                <span>{t('SENS_FINDER')}</span>
              </button>

              <button
                onClick={() => {
                  onNavigateToAimTrainer();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-[10px] font-mono font-bold text-gray-400 hover:text-white bg-white/5 border border-transparent hover:border-white/5 transition flex items-center space-x-2.5 cursor-pointer uppercase tracking-wider"
              >
                <Zap size={12} className="text-[#FFD700]" />
                <span>{t('AIM_TRAINER')}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest border-b border-white/5 pb-1">{t('TOOL_VALORANT')}</span>
            
            <div className="grid grid-cols-1 gap-2 pt-1">
              <button
                onClick={() => {
                  onNavigateToCosmeticHub();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-[10px] font-mono font-bold text-gray-400 hover:text-white bg-white/5 border border-transparent hover:border-white/5 transition flex items-center space-x-2.5 cursor-pointer uppercase tracking-wider"
              >
                <Award size={12} className="text-[#00F0FF]" />
                <span>PLAYER CARDS GENERATOR</span>
              </button>

              <button
                onClick={() => {
                  onNavigateToTierList();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-[10px] font-mono font-bold text-gray-400 hover:text-white bg-white/5 border border-transparent hover:border-white/5 transition flex items-center space-x-2.5 cursor-pointer uppercase tracking-wider"
              >
                <Plus size={12} className="text-[#00FF00]" />
                <span>{t('TACTICAL_TIER_LIST')}</span>
              </button>

              <button
                onClick={() => {
                  onNavigateToDraft();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-[10px] font-mono font-bold text-gray-400 hover:text-white bg-white/5 border border-transparent hover:border-white/5 transition flex items-center space-x-2.5 cursor-pointer uppercase tracking-wider"
              >
                <Zap size={12} className="text-[#00F0FF]" />
                <span>{t('DRAFT_SIMULATOR')}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/5 pt-4">
            <div className="flex items-center space-x-3">
              <a
                href="https://discord.gg/3d7RAhkGmj"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 border border-white/10 hover:border-[#5865F2] hover:bg-[#5865F2]/10 transition cursor-pointer text-gray-400 hover:text-white flex items-center justify-center rounded-xs"
                title="Join ValPortal Discord"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 127.14 96.36">
                  <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36c2.72-3.71,5.12-7.68,7.18-11.85a68.34,68.34,0,0,1-11.27-5.46c.95-.7,1.88-1.42,2.77-2.18a74.37,74.37,0,0,0,73,0c.89.76,1.82,1.48,2.77,2.18a68.34,68.34,0,0,1-11.27,5.46c2.06,4.17,4.46,8.14,7.18,11.85a105.73,105.73,0,0,0,31-18.83C129,54.65,122.84,31.58,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z"/>
                </svg>
              </a>
              <LanguageSelector />
            </div>
            <UserNav />
          </div>
        </nav>
      )}

      <main id="main-content" className="flex-grow">
        {/* HERO SECTION */}
        <section className="max-w-7xl mx-auto px-6 mt-10 md:mt-14 mb-10 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="max-w-2xl">
          <div className="inline-flex items-center space-x-2 border border-[#FF4655]/20 bg-[#FF4655]/5 px-2.5 py-1 mb-4 rounded-sm">
            <span className="w-1.5 h-1.5 bg-[#FF4655] animate-pulse"></span>
            <span className="text-[10px] font-mono font-bold tracking-widest text-[#FF4655] uppercase">TACTICAL PORTAL ACTIVE</span>
          </div>
          <h1 className="font-rajdhani text-4xl md:text-6xl font-black tracking-tight leading-none text-white uppercase select-none">
            STRATEGIZE TO <span className="text-[#FF4655]">DOMINATE</span>
          </h1>
          <p className="mt-4 text-sm md:text-base text-gray-400 font-sans max-w-lg leading-relaxed">
            Create high-level tactical overlays, map smoke positions, coordinate entry pathways, and drag agent abilities dynamically with precision. Perfect for teams and professional tournament planners.
          </p>
        </div>

        {/* TACTIC QUICK STATS */}
        <div className="w-full md:w-80 bg-[#0F1215] border border-white/5 p-4 flex flex-col justify-between font-mono rounded-none">
          <div className="border-b border-white/5 pb-2 mb-3">
            <span className="text-[9px] text-[#FF4655] tracking-widest uppercase font-bold">TACTICAL METRICS //</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#161A1E] p-3 border border-white/5 text-center">
              <span className="text-2xl font-bold font-rajdhani text-white">{savedTactics.length}</span>
              <p className="text-[9px] text-gray-500 uppercase mt-1">Saved Tactics</p>
            </div>
            <div className="bg-[#161A1E] p-3 border border-white/5 text-center">
              <span className="text-2xl font-bold font-rajdhani text-[#00F0FF]">{maps.length || '--'}</span>
              <p className="text-[9px] text-gray-500 uppercase mt-1">Available Maps</p>
            </div>
          </div>
          <button
            onClick={onNavigateToGallery}
            className="w-full mt-4 py-2 bg-transparent border border-white/10 hover:border-[#FF4655] hover:bg-[#FF4655]/5 text-[11px] font-bold text-center tracking-widest transition duration-150 uppercase text-gray-300 hover:text-white flex items-center justify-center space-x-2 cursor-pointer"
          >
            <span>LAUNCH SAVED BOARD</span>
            <ChevronRight size={12} className="text-[#FF4655]" />
          </button>
        </div>
      </section>

      {/* SEARCH AND FILTER BAR */}
      <div className="max-w-7xl mx-auto px-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-4 gap-4">

          {/* Tabs filter */}
          <div className="flex space-x-1.5 overflow-x-auto">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-1.5 text-xs font-mono font-bold tracking-widest uppercase transition-all duration-150 border rounded-none ${selectedCategory === 'all' ? 'bg-[#FF4655] text-black border-[#FF4655]' : 'bg-[#161A1E] text-gray-400 border-white/5 hover:text-white hover:border-white/10'}`}
            >
              ALL MAPS
            </button>
            <button
              onClick={() => setSelectedCategory('active')}
              className={`px-4 py-1.5 text-xs font-mono font-bold tracking-widest uppercase transition-all duration-150 border rounded-none ${selectedCategory === 'active' ? 'bg-[#FF4655] text-black border-[#FF4655]' : 'bg-[#161A1E] text-gray-400 border-white/5 hover:text-white hover:border-white/10'}`}
            >
              ACTIVE POOL
            </button>
            <button
              onClick={() => setSelectedCategory('custom')}
              className={`px-4 py-1.5 text-xs font-mono font-bold tracking-widest uppercase transition-all duration-150 border rounded-none ${selectedCategory === 'custom' ? 'bg-[#FF4655] text-black border-[#FF4655]' : 'bg-[#161A1E] text-gray-400 border-white/5 hover:text-white hover:border-white/10'}`}
            >
              RESERVED POOL
            </button>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 pointer-events-none">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="SEARCH MAPS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#161A1E] text-white border border-white/5 focus:border-[#FF4655] focus:outline-none pl-9 pr-4 py-2 text-xs font-mono tracking-wider rounded-none"
            />
          </div>

        </div>
      </div>

      {/* MAP GALLERY GRID */}
      <section className="max-w-7xl mx-auto px-6" aria-label="Map Selection Gallery">
        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-block w-8 h-8 border-2 border-t-transparent border-[#FF4655] rounded-full animate-spin"></div>
            <p className="mt-4 font-mono text-xs text-gray-400 uppercase tracking-widest">LOADING MAP DATABASE...</p>
          </div>
        ) : error ? (
          <div className="py-12 bg-red-500/10 border border-red-500/20 p-6 text-center rounded-none max-w-2xl mx-auto">
            <p className="text-red-400 text-sm font-mono">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-1.5 bg-[#FF4655] text-black font-mono text-xs font-bold tracking-widest hover:bg-[#FF4655]/95 transition duration-150 rounded-none val-miter-btn"
            >
              RELOAD SYSTEMS
            </button>
          </div>
        ) : filteredMaps.length === 0 ? (
          <div className="py-24 text-center border border-dashed border-white/5">
            <p className="font-mono text-xs text-gray-500 uppercase tracking-widest">NO MAPS MATCHING SEARCH</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMaps.map((map) => {
              // Extract fictional coordinates coordinates
              const fakeLoc = map.coordinates !== '0°00\'N 0°00\'E' ? map.coordinates : `LOC // ${Math.floor(Math.random() * 90)}.231 N - ${Math.floor(Math.random() * 180)}.110 E`;

              return (
                <div
                  key={map.uuid}
                  onClick={() => onSelectMap(map)}
                  className="group relative h-80 bg-[#0F1215] border border-white/5 hover:border-[#FF4655] cursor-pointer overflow-hidden transition-all duration-300 flex flex-col justify-end p-4 crosshair-hover shadow-lg rounded-none select-none"
                >
                  {/* Background map image with monochrome overlay filter */}
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-all duration-500 opacity-30 grayscale contrast-125 brightness-75 group-hover:opacity-65 group-hover:grayscale-0 group-hover:scale-105"
                    style={{ backgroundImage: `url(${map.splash})` }}
                  />

                  {/* Outer absolute gradient border */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E11] via-[#0B0E11]/40 to-transparent pointer-events-none z-10" />

                  {/* Fictional tech line details */}
                  <div className="absolute top-4 left-4 z-20 pointer-events-none opacity-40 group-hover:opacity-100 transition duration-300 font-mono text-[9px] text-gray-400">
                    <div className="flex items-center space-x-1">
                      <MapPin size={10} className="text-[#FF4655]" />
                      <span>{fakeLoc}</span>
                    </div>
                  </div>

                  {/* Corner brackets */}
                  <div className="absolute top-2 right-2 w-2 h-2 border-t border-r border-white/10 group-hover:border-[#FF4655] transition duration-300 pointer-events-none" />
                  <div className="absolute bottom-2 left-2 w-2 h-2 border-b border-l border-white/10 group-hover:border-[#FF4655] transition duration-300 pointer-events-none" />

                  {/* Map Text info overlay */}
                  <div className="relative z-20 mt-auto">
                    <span className="text-[10px] font-mono text-[#FF4655] tracking-widest font-bold uppercase block mb-1">TACTICAL MAP READY</span>
                    <h2 className="font-rajdhani text-4xl font-black tracking-tighter text-white uppercase leading-none group-hover:text-[#FF4655] transition duration-150">
                      {map.displayName}
                    </h2>

                    {/* Expand icon label on hover */}
                    <div className="h-0 opacity-0 group-hover:h-8 group-hover:opacity-100 group-hover:mt-3 overflow-hidden transition-all duration-300 flex items-center justify-between border-t border-white/10 pt-2 font-mono text-[9px] text-gray-400">
                      <span>INITIALIZE STRATEGY BOARD</span>
                      <Play size={8} className="fill-[#FF4655] stroke-none animate-pulse text-[#FF4655]" />
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>

    {/* DISCORD COMMUNITY CTA */}
    <section className="max-w-7xl mx-auto px-6 mt-16" aria-label="Discord Community Invite">
      <div className="relative bg-gradient-to-r from-[#0F1215] to-[#12161E] border border-white/5 p-8 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden rounded-none shadow-2xl">
        {/* Subtle grid background / decorative lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#5865F2]/5 blur-3xl rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6 text-center md:text-left">
          <div className="w-16 h-16 shrink-0 bg-[#5865F2]/10 border border-[#5865F2]/30 flex items-center justify-center text-[#5865F2] filter drop-shadow-[0_0_15px_rgba(88,101,242,0.25)] animate-pulse">
            <svg className="w-8 h-8 fill-current" viewBox="0 0 127.14 96.36">
              <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36c2.72-3.71,5.12-7.68,7.18-11.85a68.34,68.34,0,0,1-11.27-5.46c.95-.7,1.88-1.42,2.77-2.18a74.37,74.37,0,0,0,73,0c.89.76,1.82,1.48,2.77,2.18a68.34,68.34,0,0,1-11.27,5.46c2.06,4.17,4.46,8.14,7.18,11.85a105.73,105.73,0,0,0,31-18.83C129,54.65,122.84,31.58,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z"/>
            </svg>
          </div>
          
          <div className="space-y-1.5">
            <h3 className="font-rajdhani font-black text-xl tracking-widest text-white uppercase">JOIN THE VALPORTAL INTEL HUB</h3>
            <p className="text-xs text-gray-400 font-mono max-w-xl leading-relaxed">
              Connect with tacticians, share lineup codes, and collaborate on tactical map strategies inside our official Discord server community node.
            </p>
          </div>
        </div>

        <div className="relative z-10 w-full md:w-auto text-center shrink-0">
          <a
            href="https://discord.gg/3d7RAhkGmj"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block w-full md:w-auto px-8 py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-mono font-bold text-xs tracking-widest uppercase transition duration-150 rounded-none shadow-[0_0_15px_rgba(88,101,242,0.3)] hover:shadow-[0_0_20px_rgba(88,101,242,0.5)] border border-[#5865F2] hover:border-[#4752C4] cursor-pointer"
          >
            LAUNCH DISCORD
          </a>
        </div>
      </div>
    </section>

      {/* FOOTER */}
      <footer className="max-w-7xl mx-auto px-6 mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-[10px] text-gray-600">
        <div>
          VALPORTAL ENGINE © {new Date().getFullYear()}
        </div>
        <div className="flex space-x-4">
          <span className="hover:text-white transition duration-150 cursor-help">TACTICAL SYSTEMS</span>
          <span>•</span>
          <span className="hover:text-white transition duration-150 cursor-help">RELEASE PLATFORM v1.4</span>
        </div>
      </footer>

    </div>
  );
}
