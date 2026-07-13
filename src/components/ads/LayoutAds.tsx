import React from 'react';
import LeftBanner from './LeftBanner';
import RightBanner from './RightBanner';
import AdBlockModal from './AdBlockModal';
import { adsConfig } from '../../config/adsConfig';
import { useAdBlockDetect } from '../../hooks/useAdBlockDetect';

interface LayoutAdsProps {
  currentPage: string;
}

export default function LayoutAds({ currentPage }: LayoutAdsProps) {
  const { isBlocked, checkAdBlock } = useAdBlockDetect();

  if (!adsConfig.enabled) {
    return null;
  }

  // Detect route or page state exclusions
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const isPageExcluded = adsConfig.excludedPages.some(page => {
    const cleanPage = page.toLowerCase();
    return (
      currentPage.toLowerCase() === cleanPage ||
      currentPath.toLowerCase() === cleanPage ||
      currentPath.toLowerCase().includes(cleanPage)
    );
  });

  if (isPageExcluded) {
    return null;
  }

  return (
    <>
      {/* Fixed side advertisements (Skyscrapers) */}
      <LeftBanner />
      <RightBanner />

      {/* AdBlock Dialog warning when active blocker is detected */}
      {adsConfig.showAdBlockModal && isBlocked && (
        <AdBlockModal onRefresh={() => checkAdBlock()} />
      )}
    </>
  );
}
