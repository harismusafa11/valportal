import React, { useEffect, useRef, useState } from 'react';
import { AdZoneConfig } from '../../types/ads';

interface AdBannerProps {
  config: AdZoneConfig;
  className?: string;
  wrapperStyle?: React.CSSProperties;
}

export default function AdBanner({ config, className = '', wrapperStyle }: AdBannerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loadError, setLoadError] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!config.enabled || !config.key) return;

    const iframe = iframeRef.current;
    if (!iframe) return;

    const scriptHost = config.scriptHost || 'www.highperformanceformat.com';
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    // Create a sandboxed isolated wrapper to render Adsterra iframe scripts safely
    const iframeHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              overflow: hidden;
              display: flex;
              justify-content: center;
              align-items: center;
              background-color: transparent;
            }
          </style>
        </head>
        <body>
          <div id="container-${config.key}">
            <script type="text/javascript">
              var atOptions = {
                'key' : '${config.key}',
                'format' : 'iframe',
                'height' : ${config.height},
                'width' : ${config.width},
                'params' : {}
              };
            </script>
            <script type="text/javascript" src="//${scriptHost}/${config.key}/invoke.js"></script>
          </div>
        </body>
      </html>
    `;

    try {
      doc.open();
      doc.write(iframeHtml);
      doc.close();
    } catch (err) {
      console.warn('Ad iframe write operation failed:', err);
      setLoadError(true);
    }

    // Clean up to prevent memory leaks on unmount
    return () => {
      try {
        if (iframe) {
          iframe.src = 'about:blank';
        }
      } catch (err) {
        // Safe catch for iframe cross-origin unmount issues
      }
    };
  }, [config]);

  if (!config.enabled || !config.key || loadError) {
    return null;
  }

  // Calculate dynamic responsive scale factor to fit mobile viewports perfectly
  const availableWidth = viewportWidth - 32; // Allow 16px padding on left/right
  const scale = viewportWidth < config.width + 32 ? availableWidth / config.width : 1;
  const scaledWidth = config.width * scale;
  const scaledHeight = config.height * scale;

  return (
    <div 
      className={`relative select-none flex items-center justify-center overflow-hidden bg-[#0A0D10]/30 border border-white/5 rounded-lg transition-all duration-300 ${className}`}
      style={{
        width: `${scaledWidth}px`,
        height: `${scaledHeight}px`,
        ...wrapperStyle
      }}
    >
      {/* Background marker representing Ad banner region */}
      <span className="absolute text-[10px] uppercase tracking-widest text-[#8BA0B8]/20 font-mono z-0 pointer-events-none">
        Advertisement ({config.width}x{config.height})
      </span>

      <div
        style={{
          width: `${config.width}px`,
          height: `${config.height}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'absolute',
          top: '0',
          left: '0'
        }}
      >
        <iframe
          ref={iframeRef}
          title={`ad-zone-${config.key}`}
          width={config.width}
          height={config.height}
          frameBorder="0"
          scrolling="no"
          className="relative z-10 w-full h-full border-0"
          style={{ colorScheme: 'dark' }}
        />
      </div>
    </div>
  );
}
