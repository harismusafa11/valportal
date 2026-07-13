import { AdsSystemConfig } from '../types/ads';

export const adsConfig: AdsSystemConfig = {
  // Master switch to enable/disable all ads sitewide
  enabled: true,

  // Enable/disable AdBlock warning modal
  showAdBlockModal: false,

  // Excluded page paths or page state names where ads MUST NOT be displayed
  excludedPages: [
    'planner',          // Virtual Page State for Strategy
    'gallery',          // Virtual Page State for Lineups
    'aimtrainer',       // Virtual Page State for Aim Trainer
    '/strategy',        // Raw URL path for Strategy
    '/lineup',          // Raw URL path for Lineups
    '/aim-trainer'      // Raw URL path for Aim Trainer
  ],

  // Individual Advertisement Zones Configuration
  zones: {
    // Left Skyscraper Banner (Desktop)
    left: {
      key: 'ad_left_zone_key_placeholder', // Replaced with actual Adsterra zone key later
      width: 160,
      height: 600,
      enabled: true,
      scriptHost: 'www.highperformanceformat.com'
    },

    // Right Skyscraper Banner (Desktop)
    right: {
      key: 'ad_right_zone_key_placeholder', // Replaced with actual Adsterra zone key later
      width: 160,
      height: 600,
      enabled: true,
      scriptHost: 'www.highperformanceformat.com'
    },

    // Bottom Leaderboard Banner (Tablet & Mobile/Desktop)
    bottom: {
      key: 'ad_bottom_zone_key_placeholder', // Replaced with actual Adsterra zone key later
      width: 728, // Standard leaderboard
      height: 90,
      enabled: true,
      scriptHost: 'www.highperformanceformat.com'
    },

    // Top Leaderboard Banner (Future proofing/Optional)
    top: {
      key: 'ad_top_zone_key_placeholder',
      width: 728,
      height: 90,
      enabled: false,
      scriptHost: 'www.highperformanceformat.com'
    }
  }
};
