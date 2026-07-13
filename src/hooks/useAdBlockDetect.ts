import { useState, useEffect, useCallback } from 'react';

export function useAdBlockDetect() {
  const [isBlocked, setIsBlocked] = useState(false);

  const checkAdBlock = useCallback(async (): Promise<boolean> => {
    // 1. DOM Decoy Element Check
    const decoy = document.createElement('div');
    // Common advertising CSS classes targeted by AdBlock lists
    decoy.className = 'adsbox ad-banner advertisement pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad text_ads text-ads';
    decoy.setAttribute('style', 'position: absolute; left: -9999px; top: -9999px; width: 1px; height: 1px; display: block !important;');
    document.body.appendChild(decoy);

    const computedStyle = window.getComputedStyle?.(decoy);
    const isElementBlocked =
      computedStyle?.display === 'none' ||
      computedStyle?.visibility === 'hidden' ||
      decoy.offsetParent === null ||
      decoy.offsetHeight === 0 ||
      decoy.offsetWidth === 0;

    document.body.removeChild(decoy);

    if (isElementBlocked) {
      setIsBlocked(true);
      return true;
    }

    // 2. Network Fetch Decoy Check (to detect uBlock Origin & Brave Shields connection block)
    const decoyUrls = [
      'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
      'https://www.highperformanceformat.com/invoke.js'
    ];

    for (const url of decoyUrls) {
      try {
        const response = await fetch(new Request(url, { method: 'HEAD', mode: 'no-cors', cache: 'no-store' }));
        // If opaque fetch succeeded, request was not blocked
        if (response.type === 'opaque' || response.status > 0) {
          // Ad network is reachable
        }
      } catch (err) {
        // Fetch failed due to extension interception/connection blocking
        setIsBlocked(true);
        return true;
      }
    }

    setIsBlocked(false);
    return false;
  }, []);

  useEffect(() => {
    // Delay initial check slightly to ensure adblock scripts are fully initialized
    const timer = setTimeout(() => {
      checkAdBlock();
    }, 1500);

    return () => clearTimeout(timer);
  }, [checkAdBlock]);

  return { isBlocked, checkAdBlock };
}
