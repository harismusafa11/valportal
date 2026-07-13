import React from 'react';
import AdBanner from './AdBanner';
import { adsConfig } from '../../config/adsConfig';

export default function RightBanner() {
  const config = adsConfig.zones.right;

  if (!adsConfig.enabled || !config || !config.enabled) {
    return null;
  }

  return (
    <div 
      className="fixed right-4 top-1/2 -translate-y-1/2 z-40 hidden xl:flex flex-col items-center justify-center pointer-events-auto"
      style={{
        // Maintain layout gap so it does not cover screen content
        width: `${config.width}px`,
        height: `${config.height}px`
      }}
    >
      <AdBanner config={config} />
    </div>
  );
}
