export interface AdZoneConfig {
  key: string;
  width: number;
  height: number;
  enabled: boolean;
  scriptHost?: string; // Default: 'www.highperformanceformat.com'
}

export interface AdsSystemConfig {
  enabled: boolean;
  showAdBlockModal: boolean;
  zones: {
    left: AdZoneConfig;
    right: AdZoneConfig;
    bottom: AdZoneConfig;
    top?: AdZoneConfig;
    [customZone: string]: AdZoneConfig | undefined;
  };
  excludedPages: string[];
}
