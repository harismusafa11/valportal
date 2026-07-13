import React from 'react';
import AdBanner from './AdBanner';
import { adsConfig } from '../../config/adsConfig';

export default function BottomBanner() {
  const config = adsConfig.zones.bottom;

  if (!adsConfig.enabled || !config || !config.enabled) {
    return null;
  }

  return (
    <div className="w-full flex items-center justify-center py-6 px-4 bg-[#0B0E11]/80 backdrop-blur-sm border-t border-white/5 z-30 select-none">
      <div className="flex flex-col items-center justify-center max-w-full overflow-hidden">
        <AdBanner config={config} />
      </div>
    </div>
  );
}
