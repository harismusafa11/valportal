/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ValorantMap, SavedTactic } from './types';
import Home from './components/Home';
import PlannerBoard from './components/PlannerBoard';
import Gallery from './components/Gallery';
import CosmeticHub from './components/CosmeticHub';
import CrosshairBuilder from './components/CrosshairBuilder';
import ArmoryHub from './components/ArmoryHub';
import SensConverter from './components/SensConverter';
import SensFinder from './components/SensFinder';
import TierListMaker from './components/TierListMaker';
import DraftSimulator from './components/DraftSimulator';
import AimTrainer from './components/AimTrainer';
import UserProfile from './components/UserProfile';
import AdminPanel from './components/AdminPanel';
import { downloadCloudSetupToLocal } from './lib/profileSync';

import { LanguageProvider } from './lib/LanguageContext';
import LayoutAds from './components/ads/LayoutAds';
import BottomBanner from './components/ads/BottomBanner';
import { adsConfig } from './config/adsConfig';

type PageState = 'home' | 'planner' | 'gallery' | 'cosmetichub' | 'crosshair' | 'armory' | 'sens' | 'sensfinder' | 'tierlist' | 'draft' | 'aimtrainer' | 'profile' | 'admin';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageState>('home');
  const [selectedMap, setSelectedMap] = useState<ValorantMap | null>(null);
  const [activeTactic, setActiveTactic] = useState<SavedTactic | null>(null);
  const [savedTactics, setSavedTactics] = useState<SavedTactic[]>([]);

  // Load saved tactics & download setup from cloud on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('valportal_tactics');
      if (stored) {
        setSavedTactics(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to load tactics from local storage', err);
    }

    downloadCloudSetupToLocal().catch(err => {
      console.warn('Failed to download cloud setup on mount:', err);
    });

    const handleNavigate = (e: Event) => {
      const page = (e as CustomEvent).detail;
      if (page) setCurrentPage(page);
    };
    window.addEventListener('valportal_navigate', handleNavigate);
    return () => window.removeEventListener('valportal_navigate', handleNavigate);
  }, []);

  // Map chosen -> Initialize new planner session
  const handleSelectMap = (map: ValorantMap) => {
    setSelectedMap(map);
    setActiveTactic(null); // Clear loaded tactic to start fresh
    setCurrentPage('planner');
  };

  // Saved Tactic loaded -> Transition to planner with preset state
  const handleSelectSavedTactic = (tactic: SavedTactic) => {
    const mapMetadata: ValorantMap = {
      uuid: tactic.mapUuid,
      displayName: tactic.mapName,
      coordinates: tactic.mapCoordinates,
      displayIcon: tactic.mapDisplayIcon,
      splash: tactic.mapSplash,
      listViewIcon: null
    };

    setSelectedMap(mapMetadata);
    setActiveTactic(tactic);
    setCurrentPage('planner');
  };

  // Add or Update saved tactic inside local state and storage
  const handleSaveTactic = (newTactic: SavedTactic) => {
    const exists = savedTactics.some(t => t.id === newTactic.id);
    let updated: SavedTactic[];

    if (exists) {
      updated = savedTactics.map(t => t.id === newTactic.id ? newTactic : t);
    } else {
      updated = [newTactic, ...savedTactics];
    }

    setSavedTactics(updated);
    localStorage.setItem('valportal_tactics', JSON.stringify(updated));

    // Smooth transition to tactics list page upon successful save
    setCurrentPage('gallery');
  };

  // Delete a saved strategy
  const handleDeleteTactic = (id: string) => {
    const updated = savedTactics.filter(t => t.id !== id);
    setSavedTactics(updated);
    localStorage.setItem('valportal_tactics', JSON.stringify(updated));
  };

  const isPageExcluded = adsConfig.enabled && adsConfig.excludedPages.some(page => {
    const cleanPage = page.toLowerCase();
    return (
      currentPage.toLowerCase() === cleanPage ||
      (typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes(cleanPage))
    );
  });

  return (
    <LanguageProvider>
      <div className="bg-[#0B0E11] text-white min-h-screen flex flex-col justify-between">
        <div className="flex-grow">
          {currentPage === 'home' && (
            <Home
              onSelectMap={handleSelectMap}
              onNavigateToGallery={() => setCurrentPage('gallery')}
              onNavigateToCosmeticHub={() => setCurrentPage('cosmetichub')}
              onNavigateToCrosshair={() => setCurrentPage('crosshair')}
              onNavigateToArmory={() => setCurrentPage('armory')}
              onNavigateToSens={() => setCurrentPage('sens')}
              onNavigateToSensFinder={() => setCurrentPage('sensfinder')}
              onNavigateToTierList={() => setCurrentPage('tierlist')}
              onNavigateToDraft={() => setCurrentPage('draft')}
              onNavigateToAimTrainer={() => setCurrentPage('aimtrainer')}
              onNavigateToProfile={() => setCurrentPage('profile')}
              savedTactics={savedTactics}
            />
          )}

          {currentPage === 'planner' && selectedMap && (
            <PlannerBoard
              map={selectedMap}
              initialTactic={activeTactic}
              onBackToHome={() => {
                setCurrentPage('home');
                setSelectedMap(null);
                setActiveTactic(null);
              }}
              onSave={handleSaveTactic}
            />
          )}

          {currentPage === 'gallery' && (
            <Gallery
              savedTactics={savedTactics}
              onSelectTactic={handleSelectSavedTactic}
              onDeleteTactic={handleDeleteTactic}
              onBackToHome={() => setCurrentPage('home')}
            />
          )}

          {currentPage === 'cosmetichub' && (
            <CosmeticHub
              onBackToHome={() => setCurrentPage('home')}
            />
          )}

          {currentPage === 'crosshair' && (
            <CrosshairBuilder
              onBackToHome={() => setCurrentPage('home')}
            />
          )}

          {currentPage === 'armory' && (
            <ArmoryHub
              onBackToHome={() => setCurrentPage('home')}
            />
          )}

          {currentPage === 'sens' && (
            <SensConverter
              onBackToHome={() => setCurrentPage('home')}
            />
          )}

          {currentPage === 'sensfinder' && (
            <SensFinder
              onBackToHome={() => setCurrentPage('home')}
            />
          )}

          {currentPage === 'tierlist' && (
            <TierListMaker
              onBackToHome={() => setCurrentPage('home')}
            />
          )}

          {currentPage === 'draft' && (
            <DraftSimulator
              onBackToHome={() => setCurrentPage('home')}
            />
          )}

          {currentPage === 'aimtrainer' && (
            <AimTrainer
              onBackToHome={() => setCurrentPage('home')}
            />
          )}

          {currentPage === 'profile' && (
            <UserProfile
              onBackToHome={() => setCurrentPage('home')}
            />
          )}

          {currentPage === 'admin' && (
            <AdminPanel
              onBackToHome={() => setCurrentPage('home')}
            />
          )}
        </div>

        {/* Dynamic Responsive Leaderboard Ad Banner */}
        {!isPageExcluded && <BottomBanner />}

        {/* Global Floating Layout Side Banners & Blocker Alert */}
        <LayoutAds currentPage={currentPage} />
      </div>
    </LanguageProvider>
  );
}
