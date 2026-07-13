import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  DragDropContext, 
  Droppable, 
  Draggable, 
  DropResult 
} from '@hello-pangea/dnd';

const DragDropContextComponent = DragDropContext as any;
const DroppableComponent = Droppable as any;
const DraggableComponent = Draggable as any;


// html2canvas removed — using manual Canvas 2D API for PNG export
import { 
  ArrowLeft, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Plus, 
  Download, 
  RotateCcw, 
  Save, 
  Sparkles,
  Info,
  CheckCircle2,
  Settings,
  AlertTriangle
} from 'lucide-react';

import { useLanguage } from '../lib/LanguageContext';

interface TierListMakerProps {
  onBackToHome: () => void;
}

interface TierRow {
  id: string;
  name: string;
  color: string;
  itemIds: string[];
}

interface TierListState {
  rows: { [rowId: string]: TierRow };
  rowOrder: string[];
  unranked: string[];
}

interface ValorantAsset {
  uuid: string;
  displayName: string;
  displayIcon: string;
}

const DEFAULT_ROWS: { [key: string]: TierRow } = {
  'row-S': { id: 'row-S', name: 'S', color: '#FF7F7F', itemIds: [] },
  'row-A': { id: 'row-A', name: 'A', color: '#FFBF7F', itemIds: [] },
  'row-B': { id: 'row-B', name: 'B', color: '#FFDF7F', itemIds: [] },
  'row-C': { id: 'row-C', name: 'C', color: '#FFFF7F', itemIds: [] },
  'row-D': { id: 'row-D', name: 'D', color: '#BFFF7F', itemIds: [] },
  'row-F': { id: 'row-F', name: 'F', color: '#7FFF7F', itemIds: [] }
};

const DEFAULT_ROW_ORDER = ['row-S', 'row-A', 'row-B', 'row-C', 'row-D', 'row-F'];

const getCorsUrl = (url: string) => {
  if (!url) return '';
  return `${url}?cors=valportal`;
};

const COLOR_PALETTE = [
  '#FF7F7F', // Light Red
  '#FFBF7F', // Light Orange
  '#FFDF7F', // Light Yellow
  '#FFFF7F', // Yellow-Green
  '#BFFF7F', // Light Green
  '#7FFF7F', // Green
  '#7FFFFF', // Cyan
  '#7FBEFF', // Blue
  '#C77FFF', // Purple
  '#FF7FFF', // Pink
  '#3F4E5A', // Tactical Grey
  '#FFFFFF'  // White
];

export default function TierListMaker({ onBackToHome }: TierListMakerProps) {
  const { language } = useLanguage();

  const localT = (key: string, replacements?: Record<string, string>) => {
    const dicts: Record<string, Record<string, string>> = {
      en: {
        TITLE: 'TACTICAL TIER LIST',
        SUBTITLE: 'TACTICAL TIER LIST MAKER',
        LOAD_CDN: 'LOADING COMPONENT ASSETS...',
        RETURN_HOME: 'Back to Home',
        ACTIVE_BUILDER: 'STATUS: PRESET BOARD ACTIVE',
        AGENT_CATEGORY: 'agents',
        WEAPON_CATEGORY: 'weapons',
        MAP_CATEGORY: 'maps',
        RESET_TIER: 'RESET BOARD',
        EXPORT_TIER: 'DOWNLOAD PNG',
        UNRANKED: 'UNRANKED ITEMS',
        UNRANKED_POOL: 'UNRANKED ASSETS POOL //',
        REMAINING: 'Remaining: {count} Items',
        ALL_PLACED: 'All assets have been placed onto the board.'
      },
      id: {
        TITLE: 'PERINGKAT TAKTIS',
        SUBTITLE: 'PEMBUAT TIER LIST TAKTIS',
        LOAD_CDN: 'MENGUNDUH DEKORASI CDN...',
        RETURN_HOME: 'Kembali ke Beranda',
        ACTIVE_BUILDER: 'STATUS: PRESET BOARD AKTIF',
        AGENT_CATEGORY: 'DAFTAR AGEN',
        WEAPON_CATEGORY: 'DAFTAR SENJATA',
        MAP_CATEGORY: 'DAFTAR MAP',
        RESET_TIER: 'RESET SEMUA',
        EXPORT_TIER: 'EKSPOR GAMBAR',
        UNRANKED: 'ITEM BELUM TERNILAI (DRAG ASET KE DALAM TIER ROW)',
        UNRANKED_POOL: 'KOLOM ASSET BELUM TERNILAI //',
        REMAINING: 'Tersisa: {count} Item',
        ALL_PLACED: 'Semua asset telah diletakkan di papan.'
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

  const [category, setCategory] = useState<'agents' | 'weapons' | 'maps'>('agents');
  
  // Board state
  const [rows, setRows] = useState<{ [rowId: string]: TierRow }>({});
  const [rowOrder, setRowOrder] = useState<string[]>([]);
  const [unranked, setUnranked] = useState<string[]>([]);
  
  // Assets map to look up details quickly
  const [assets, setAssets] = useState<ValorantAsset[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saveFeedback, setSaveFeedback] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  } | null>(null);

  // Editing state for row label texts
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  // Active color picker state
  const [colorPickerRowId, setColorPickerRowId] = useState<string | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);

  // Load state and assets when category changes
  useEffect(() => {
    async function loadCategoryData() {
      setLoading(true);
      try {
        let endpoint = '';
        if (category === 'agents') {
          endpoint = 'https://valorant-api.com/v1/agents?isPlayableCharacter=true';
        } else if (category === 'weapons') {
          endpoint = 'https://valorant-api.com/v1/weapons';
        } else {
          endpoint = 'https://valorant-api.com/v1/maps';
        }

        const res = await fetch(endpoint);
        const json = await res.json();
        let fetchedAssets: ValorantAsset[] = [];

        if (category === 'agents') {
          fetchedAssets = json.data.map((a: any) => ({
            uuid: a.uuid,
            displayName: a.displayName,
            displayIcon: a.displayIcon
          }));
        } else if (category === 'weapons') {
          fetchedAssets = json.data.map((w: any) => ({
            uuid: w.uuid,
            displayName: w.displayName,
            displayIcon: w.displayIcon
          }));
        } else {
          const seenNames = new Set<string>();
          let hasSkirmish = false;
          fetchedAssets = [];
          
          for (const m of json.data) {
            if (!m.listViewIcon && !m.displayIcon) continue;
            
            let name = m.displayName;
            
            // Limit to only the first Skirmish map
            if (name.toLowerCase().startsWith('skirmish')) {
              if (hasSkirmish) continue;
              hasSkirmish = true;
              name = 'Skirmish';
            }
            
            // Skip general duplicates (like duplicates of The Range or others)
            if (seenNames.has(name)) continue;
            
            seenNames.add(name);
            fetchedAssets.push({
              uuid: m.uuid,
              displayName: name,
              displayIcon: m.listViewIcon || m.displayIcon
            });
          }
        }

        setAssets(fetchedAssets);

        // Attempt to load saved board from localStorage
        const saved = localStorage.getItem(`valotier_${category}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          
          // Verify saved unranked contains valid active assets, plus any new ones not in the save
          const savedItemIds = new Set<string>();
          Object.values(parsed.rows).forEach((r: any) => {
            r.itemIds.forEach((id: string) => savedItemIds.add(id));
          });
          parsed.unranked.forEach((id: string) => savedItemIds.add(id));

          // Find missing assets (e.g. newly added by Valorant-API) and add to unranked
          const missingIds: string[] = [];
          fetchedAssets.forEach(asset => {
            if (!savedItemIds.has(asset.uuid)) {
              missingIds.push(asset.uuid);
            }
          });

          setRows(parsed.rows);
          setRowOrder(parsed.rowOrder);
          setUnranked([...parsed.unranked, ...missingIds]);
        } else {
          // Initialize fresh default board
          const initializedRows: { [key: string]: TierRow } = {};
          DEFAULT_ROW_ORDER.forEach(id => {
            initializedRows[id] = { ...DEFAULT_ROWS[id], itemIds: [] };
          });

          setRows(initializedRows);
          setRowOrder(DEFAULT_ROW_ORDER);
          setUnranked(fetchedAssets.map(a => a.uuid));
        }

      } catch (err) {
        console.error("Failed to load category assets", err);
      } finally {
        setLoading(false);
      }
    }

    loadCategoryData();
  }, [category]);

  // Lookup helper for asset details
  const assetMap = useMemo(() => {
    const map: { [uuid: string]: ValorantAsset } = {};
    assets.forEach(a => {
      map[a.uuid] = a;
    });
    return map;
  }, [assets]);

  // Drag and Drop handler
  const handleDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;

    // 1. Dragged within same list
    if (source.droppableId === destination.droppableId) {
      if (source.index === destination.index) return;

      if (source.droppableId === 'unranked') {
        const nextUnranked = [...unranked];
        const [moved] = nextUnranked.splice(source.index, 1);
        nextUnranked.splice(destination.index, 0, moved);
        setUnranked(nextUnranked);
      } else {
        const rowId = source.droppableId;
        const currentRow = rows[rowId];
        const nextItemIds = [...currentRow.itemIds];
        const [moved] = nextItemIds.splice(source.index, 1);
        nextItemIds.splice(destination.index, 0, moved);

        setRows({
          ...rows,
          [rowId]: { ...currentRow, itemIds: nextItemIds }
        });
      }
      return;
    }

    // 2. Dragged from one list to another
    let sourceItems = source.droppableId === 'unranked' ? [...unranked] : [...rows[source.droppableId].itemIds];
    let destItems = destination.droppableId === 'unranked' ? [...unranked] : [...rows[destination.droppableId].itemIds];

    const [moved] = sourceItems.splice(source.index, 1);
    destItems.splice(destination.index, 0, moved);

    if (source.droppableId === 'unranked') {
      setUnranked(sourceItems);
      setRows({
        ...rows,
        [destination.droppableId]: { ...rows[destination.droppableId], itemIds: destItems }
      });
    } else if (destination.droppableId === 'unranked') {
      setUnranked(destItems);
      setRows({
        ...rows,
        [source.droppableId]: { ...rows[source.droppableId], itemIds: sourceItems }
      });
    } else {
      setRows({
        ...rows,
        [source.droppableId]: { ...rows[source.droppableId], itemIds: sourceItems },
        [destination.droppableId]: { ...rows[destination.droppableId], itemIds: destItems }
      });
    }
  };

  // Save progress manually
  const handleSaveProgress = () => {
    localStorage.setItem(`valotier_${category}`, JSON.stringify({ rows, rowOrder, unranked }));
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2000);
  };

  // Reset board back to empty unranked pool
  const handleResetBoard = () => {
    const resetRows: { [key: string]: TierRow } = {};
    rowOrder.forEach(id => {
      resetRows[id] = { 
        ...rows[id], 
        name: rows[id]?.name || DEFAULT_ROWS[id]?.name || 'NEW',
        color: rows[id]?.color || DEFAULT_ROWS[id]?.color || '#FFFFFF',
        itemIds: [] 
      };
    });
    setRows(resetRows);
    setUnranked(assets.map(a => a.uuid));
  };

  // Label text editor activation
  const handleStartEditing = (rowId: string, currentText: string) => {
    setEditingRowId(rowId);
    setEditingText(currentText);
  };

  // Label text editor save
  const handleSaveText = (rowId: string) => {
    if (editingText.trim()) {
      setRows({
        ...rows,
        [rowId]: { ...rows[rowId], name: editingText.trim() }
      });
    }
    setEditingRowId(null);
  };

  // Row Order adjustments (Up / Down)
  const handleMoveRow = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === rowOrder.length - 1) return;

    const nextOrder = [...rowOrder];
    const swapWithIndex = direction === 'up' ? index - 1 : index + 1;
    
    const temp = nextOrder[index];
    nextOrder[index] = nextOrder[swapWithIndex];
    nextOrder[swapWithIndex] = temp;

    setRowOrder(nextOrder);
  };

  // Add new row (Above / Below)
  const handleAddRow = (index: number, position: 'above' | 'below') => {
    const newId = `row-custom-${Date.now()}`;
    const newRow: TierRow = {
      id: newId,
      name: 'NEW',
      color: '#FFFFFF',
      itemIds: []
    };

    setRows({
      ...rows,
      [newId]: newRow
    });

    const nextOrder = [...rowOrder];
    const insertAt = position === 'above' ? index : index + 1;
    nextOrder.splice(insertAt, 0, newId);
    setRowOrder(nextOrder);
  };

  // Delete row (dumping items back to unranked)
  const handleDeleteRow = (rowId: string) => {
    const dumpedItems = rows[rowId].itemIds;
    const nextRows = { ...rows };
    delete nextRows[rowId];

    setRows(nextRows);
    setRowOrder(rowOrder.filter(id => id !== rowId));
    setUnranked([...unranked, ...dumpedItems]);
  };

  // Helper: fetch a remote image as an HTMLImageElement via blob (bypasses CORS taint)
  const loadImageAsBlob = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      if (!url) {
        reject(new Error('No URL'));
        return;
      }
      fetch(url, { mode: 'cors' })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.blob();
        })
        .then(blob => {
          const objectUrl = URL.createObjectURL(blob);
          const img = new Image();
          img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(img);
          };
          img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error(`Failed to load: ${url}`));
          };
          img.src = objectUrl;
        })
        .catch(reject);
    });
  };

  // Export board as PNG via manual Canvas 2D API (no html2canvas dependency)
  const handleDownloadPNG = async () => {
    setExporting(true);

    try {
      const SCALE = 2;
      const LABEL_W = 120;
      const ITEM_SIZE = category === 'weapons' ? 96 : category === 'maps' ? 128 : 64;
      const ITEM_H = 64;
      const ROW_PAD = 8;
      const BOARD_PAD = 16;
      const GAP = 6;
      const BG_COLOR = '#0B0E11';
      const ROW_BG = '#12161A';
      const ITEM_BG = '#161A1E';

      // Collect all image URLs we need to load
      const imageUrlSet = new Set<string>();
      for (const rowId of rowOrder) {
        const row = rows[rowId];
        if (!row) continue;
        for (const itemId of row.itemIds) {
          const asset = assetMap[itemId];
          if (asset?.displayIcon) imageUrlSet.add(asset.displayIcon);
        }
      }

      // Preload all images as blobs (bypasses CORS completely)
      const imageCache: Map<string, HTMLImageElement> = new Map();
      const loadPromises = Array.from(imageUrlSet).map(async (url) => {
        try {
          const img = await loadImageAsBlob(url);
          imageCache.set(url, img);
        } catch {
          // Skip failed images silently
        }
      });
      await Promise.all(loadPromises);

      // Calculate canvas dimensions
      const maxItemsPerRow = Math.max(
        ...rowOrder.map(rid => rows[rid]?.itemIds?.length || 0),
        1
      );
      const contentWidth = LABEL_W + ROW_PAD * 2 + maxItemsPerRow * (ITEM_SIZE + GAP) + GAP;
      const canvasW = Math.max(contentWidth + BOARD_PAD * 2, 800);
      const rowH = ITEM_H + ROW_PAD * 2;
      const titleH = 48;
      const canvasH = titleH + BOARD_PAD * 2 + rowOrder.length * (rowH + GAP) + 50; // 50 for watermark row

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = canvasW * SCALE;
      canvas.height = canvasH * SCALE;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(SCALE, SCALE);

      // Background
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, canvasW, canvasH);

      // Title
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 18px "Rajdhani", "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        `VALORANT ${category.toUpperCase()} TIER LIST`,
        BOARD_PAD,
        titleH / 2
      );

      // Draw each row
      let cursorY = titleH;

      for (const rowId of rowOrder) {
        const row = rows[rowId];
        if (!row) continue;

        const rowX = BOARD_PAD;
        const rowY = cursorY;

        // Row background
        ctx.fillStyle = ROW_BG;
        ctx.fillRect(rowX, rowY, canvasW - BOARD_PAD * 2, rowH);

        // Label background
        ctx.fillStyle = row.color;
        ctx.fillRect(rowX, rowY, LABEL_W, rowH);

        // Label text
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 20px "Rajdhani", "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(row.name, rowX + LABEL_W / 2, rowY + rowH / 2);

        // Draw items
        let itemX = rowX + LABEL_W + ROW_PAD;
        for (const itemId of row.itemIds) {
          const asset = assetMap[itemId];
          if (!asset) continue;

          // Item background
          ctx.fillStyle = ITEM_BG;
          ctx.fillRect(itemX, rowY + ROW_PAD, ITEM_SIZE, ITEM_H);

          // Draw image
          const img = imageCache.get(asset.displayIcon);
          if (img) {
            try {
              if (category === 'maps') {
                // Maps: cover the entire item box
                const imgAspect = img.naturalWidth / img.naturalHeight;
                const boxAspect = ITEM_SIZE / ITEM_H;
                let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
                if (imgAspect > boxAspect) {
                  sw = img.naturalHeight * boxAspect;
                  sx = (img.naturalWidth - sw) / 2;
                } else {
                  sh = img.naturalWidth / boxAspect;
                  sy = (img.naturalHeight - sh) / 2;
                }
                ctx.drawImage(img, sx, sy, sw, sh, itemX, rowY + ROW_PAD, ITEM_SIZE, ITEM_H);
              } else if (category === 'weapons') {
                // Weapons: contain within box
                const imgAspect = img.naturalWidth / img.naturalHeight;
                const padW = 6;
                const availW = ITEM_SIZE - padW * 2;
                const availH = 40;
                let drawW = availW;
                let drawH = availW / imgAspect;
                if (drawH > availH) {
                  drawH = availH;
                  drawW = availH * imgAspect;
                }
                const dx = itemX + (ITEM_SIZE - drawW) / 2;
                const dy = rowY + ROW_PAD + (ITEM_H - drawH) / 2;
                ctx.drawImage(img, dx, dy, drawW, drawH);
              } else {
                // Agents: centered icon
                const iconSize = 48;
                const dx = itemX + (ITEM_SIZE - iconSize) / 2;
                const dy = rowY + ROW_PAD + (ITEM_H - iconSize) / 2;
                ctx.drawImage(img, dx, dy, iconSize, iconSize);
              }
            } catch {
              // Skip draw errors
            }
          }

          // Item name below (small text)
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '8px "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(
            asset.displayName.length > 12 ? asset.displayName.slice(0, 11) + '…' : asset.displayName,
            itemX + ITEM_SIZE / 2,
            rowY + ROW_PAD + ITEM_H - 2
          );

          itemX += ITEM_SIZE + GAP;
        }

        cursorY += rowH + GAP;
      }

      // ── Branded Watermark ──────────────────────────────────────────
      const loadLogoImg = (src: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });

      const WM_TEXT = 'ValPortal.NET';
      const WM_LOGO_H = 18;
      const WM_LOGO_W = 18;
      const WM_PAD = 8;
      const WM_GAP = 5;
      const WM_H = 28;

      // Measure text width
      ctx.font = 'bold 11px "Segoe UI", sans-serif';
      const wmTextW = ctx.measureText(WM_TEXT).width;
      const wmPillW = WM_PAD + WM_LOGO_W + WM_GAP + wmTextW + WM_PAD;
      const wmPillX = canvasW - wmPillW - BOARD_PAD;
      const wmPillY = canvasH - WM_H - 10;

      // Dark pill background
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = '#12161A';
      const wR = 6;
      ctx.beginPath();
      ctx.moveTo(wmPillX + wR, wmPillY);
      ctx.lineTo(wmPillX + wmPillW - wR, wmPillY);
      ctx.arcTo(wmPillX + wmPillW, wmPillY, wmPillX + wmPillW, wmPillY + wR, wR);
      ctx.lineTo(wmPillX + wmPillW, wmPillY + WM_H - wR);
      ctx.arcTo(wmPillX + wmPillW, wmPillY + WM_H, wmPillX + wmPillW - wR, wmPillY + WM_H, wR);
      ctx.lineTo(wmPillX + wR, wmPillY + WM_H);
      ctx.arcTo(wmPillX, wmPillY + WM_H, wmPillX, wmPillY + WM_H - wR, wR);
      ctx.lineTo(wmPillX, wmPillY + wR);
      ctx.arcTo(wmPillX, wmPillY, wmPillX + wR, wmPillY, wR);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Logo
      try {
        const logoImg = await loadLogoImg('/logo.webp');
        ctx.save();
        ctx.globalAlpha = 0.95;
        ctx.drawImage(logoImg, wmPillX + WM_PAD, wmPillY + (WM_H - WM_LOGO_H) / 2, WM_LOGO_W, WM_LOGO_H);
        ctx.restore();
      } catch { /* skip logo if fails */ }

      // Text
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#FF4655';
      ctx.font = 'bold 11px "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(WM_TEXT, wmPillX + WM_PAD + WM_LOGO_W + WM_GAP, wmPillY + WM_H / 2 + 0.5);
      ctx.restore();
      // ─────────────────────────────────────────────────────────────────

      // Download
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `valportal_tierlist_${category}_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (err) {
      console.error('Tier list export failed:', err);
      setAlertDialog({
        isOpen: true,
        title: 'EXPORT FAILED',
        message: 'Failed to export tier list. Please try again.'
      });
    } finally {
      setExporting(false);
    }
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
            <span className="font-rajdhani font-bold tracking-widest text-lg text-white leading-none block">VALPORTAL</span>
            <h1 className="text-[9px] font-mono text-[#FF4655] tracking-widest uppercase hidden sm:block font-bold">{localT('SUBTITLE')}</h1>
          </div>
        </div>

        {/* UTILITY GLOBAL BUTTONS */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleResetBoard}
            className="px-3 py-1.5 border border-white/15 hover:border-[#FF4655] bg-[#161A1E] text-gray-300 hover:text-white font-mono text-[9px] font-bold tracking-widest uppercase transition flex items-center space-x-1.5 cursor-pointer"
          >
            <RotateCcw size={11} />
            <span className="hidden md:inline">{localT('RESET_TIER')}</span>
          </button>

          <button
            onClick={handleSaveProgress}
            className={`px-3 py-1.5 border font-mono text-[9px] font-bold tracking-widest uppercase transition flex items-center space-x-1.5 cursor-pointer ${
              saveFeedback 
                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' 
                : 'border-white/15 hover:border-[#00F0FF] bg-[#161A1E] text-gray-300 hover:text-white'
            }`}
          >
            {saveFeedback ? <CheckCircle2 size={11} /> : <Save size={11} />}
            <span className="hidden md:inline">{saveFeedback ? 'SAVED!' : 'SAVE PROGRESS'}</span>
          </button>

          <button
            onClick={handleDownloadPNG}
            disabled={exporting}
            className="px-4 py-1.5 bg-[#FF4655] hover:bg-[#FF4655]/90 disabled:bg-[#FF4655]/60 text-white font-rajdhani font-black tracking-widest text-xs uppercase transition duration-150 flex items-center space-x-2 cursor-pointer shadow-lg shadow-[#FF4655]/10 hover:shadow-[#FF4655]/20"
          >
            <Download size={12} />
            <span className="hidden md:inline">{exporting ? 'EXPORTING...' : 'DOWNLOAD PNG'}</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-6 mt-8">

        {/* Category Selector Controls */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-8">
          <div className="flex space-x-2">
            {(['agents', 'weapons', 'maps'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => {
                  // Save progress of current category before switching
                  localStorage.setItem(`valotier_${category}`, JSON.stringify({ rows, rowOrder, unranked }));
                  setCategory(cat);
                }}
                className={`px-4 py-2 border text-[11px] font-mono font-bold tracking-widest uppercase transition cursor-pointer ${
                  category === cat
                    ? 'border-[#FF4655] bg-[#FF4655]/5 text-[#FF4655]'
                    : 'border-white/5 bg-[#12161A] text-gray-400 hover:text-white hover:border-white/20'
                }`}
              >
                {cat === 'agents' ? localT('AGENT_CATEGORY') : cat === 'weapons' ? localT('WEAPON_CATEGORY') : localT('MAP_CATEGORY')}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center space-x-2 text-[10px] font-mono text-gray-500 uppercase">
            <Info size={12} className="text-[#00F0FF]" />
            <span>Click labels to edit text. Drag and drop items to categorize.</span>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-t-[#FF4655] border-white/10 rounded-full animate-spin mx-auto" />
            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block">
              {localT('LOAD_CDN')}
            </span>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Drag and Drop context wrapper */}
            <DragDropContextComponent onDragEnd={handleDragEnd}>
              
              {/* THE BOARD (Ranked Rows) */}
              <div 
                ref={boardRef} 
                className="bg-[#0B0E11] border border-white/5 p-4 space-y-2 relative overflow-hidden"
              >
                {rowOrder.map((rowId, index) => {
                  const row = rows[rowId];
                  if (!row) return null;

                  return (
                    <div key={row.id} className="flex items-stretch border border-white/5 bg-[#12161A]">
                      
                      {/* Label side card */}
                      <div 
                        onClick={() => handleStartEditing(row.id, row.name)}
                        className="w-24 md:w-32 min-h-[85px] flex items-center justify-center p-3 select-none text-black font-rajdhani font-black text-xl uppercase tracking-widest text-center cursor-pointer relative transition hover:brightness-105 shrink-0"
                        style={{ backgroundColor: row.color }}
                      >
                        {editingRowId === row.id ? (
                          <input
                            type="text"
                            value={editingText}
                            autoFocus
                            onChange={(e) => setEditingText(e.target.value)}
                            onBlur={() => handleSaveText(row.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveText(row.id);
                              if (e.key === 'Escape') setEditingRowId(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full bg-black/20 text-black text-center focus:outline-none border-b border-black font-bold uppercase font-rajdhani text-lg"
                          />
                        ) : (
                          <span className="line-clamp-2 leading-none">{row.name}</span>
                        )}

                        {/* Settings indicator dots on hover */}
                        <div className="absolute top-1 left-1 opacity-0 hover:opacity-100 transition">
                          <Settings size={9} className="text-black/40" />
                        </div>
                      </div>

                      {/* Dropzone container block */}
                      <DroppableComponent droppableId={row.id} direction="horizontal">
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`flex-1 flex items-center space-x-2 px-4 overflow-x-auto min-w-0 transition duration-150 ${
                              snapshot.isDraggingOver ? 'bg-white/5' : 'bg-black/10'
                            }`}
                          >
                            {row.itemIds.map((itemId, idx) => {
                              const item = assetMap[itemId];
                              if (!item) return null;

                              return (
                                <DraggableComponent key={item.uuid} draggableId={item.uuid} index={idx}>
                                  {(draggableProvided, draggableSnapshot) => (
                                    <div
                                      ref={draggableProvided.innerRef}
                                      {...draggableProvided.draggableProps}
                                      {...draggableProvided.dragHandleProps}
                                      className={`h-16 flex items-center justify-center bg-[#161A1E] border hover:border-white/20 select-none group transition shrink-0 rounded-xs relative ${
                                        category === 'weapons' ? 'w-24 px-1.5' : category === 'maps' ? 'w-32' : 'w-16 aspect-square'
                                      } ${
                                        draggableSnapshot.isDragging ? 'border-[#FF4655] shadow-lg shadow-[#FF4655]/10' : 'border-white/5'
                                      }`}
                                      title={item.displayName}
                                    >
                                      {/* CrossOrigin required for html2canvas export rendering */}
                                      <img 
                                        src={getCorsUrl(item.displayIcon)} 
                                        alt={item.displayName} 
                                        crossOrigin="anonymous"
                                        referrerPolicy="no-referrer"
                                        className={`select-none pointer-events-none ${
                                          category === 'weapons' 
                                            ? 'w-full h-10 object-contain' 
                                            : category === 'maps' 
                                              ? 'w-full h-full object-cover rounded-xs' 
                                              : 'w-12 h-12 object-contain'
                                        }`}
                                      />
                                      
                                      {/* Hover overlay with display name */}
                                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition flex items-center justify-center p-1 rounded-xs select-none pointer-events-none">
                                        <span className="text-[8px] font-mono font-bold text-white uppercase tracking-widest text-center leading-tight">
                                          {item.displayName}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </DraggableComponent>
                              );
                            })}
                            {provided.placeholder}
                          </div>
                        )}
                      </DroppableComponent>

                      {/* Row management controls */}
                      <div className="flex flex-col items-center justify-center px-2 py-1.5 border-l border-white/5 space-y-1 bg-black/20 shrink-0 select-none">
                        
                        {/* Move Up */}
                        <button
                          type="button"
                          onClick={() => handleMoveRow(index, 'up')}
                          disabled={index === 0}
                          className="p-1 hover:bg-white/5 hover:text-white text-gray-500 disabled:opacity-20 cursor-pointer rounded-xs transition"
                          title="Move Row Up"
                        >
                          <ChevronUp size={12} />
                        </button>

                        {/* Color Selector Trigger */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setColorPickerRowId(colorPickerRowId === row.id ? null : row.id)}
                            className="w-3.5 h-3.5 border border-white/20 cursor-pointer hover:scale-105 transition"
                            style={{ backgroundColor: row.color }}
                            title="Choose Color"
                          />

                          {colorPickerRowId === row.id && (
                            <>
                              {/* Color picker backdrop click outside handler */}
                              <div 
                                className="fixed inset-0 z-40 cursor-default" 
                                onClick={() => setColorPickerRowId(null)} 
                              />
                              <div className="absolute right-0 mt-1.5 grid grid-cols-4 gap-1 p-1.5 bg-[#0F1215] border border-white/10 shadow-2xl z-50 w-24">
                                {COLOR_PALETTE.map(c => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => {
                                      setRows({
                                        ...rows,
                                        [row.id]: { ...row, color: c }
                                      });
                                      setColorPickerRowId(null);
                                    }}
                                    className="w-4 h-4 border border-transparent hover:border-white transition cursor-pointer"
                                    style={{ backgroundColor: c }}
                                  />
                                ))}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Row insertions & Deletion options popover */}
                        <div className="flex space-x-0.5">
                          <button
                            type="button"
                            onClick={() => handleAddRow(index, 'above')}
                            className="p-0.5 hover:bg-white/5 hover:text-[#00F0FF] text-gray-500 cursor-pointer transition rounded-xs"
                            title="Add Row Above"
                          >
                            <Plus size={10} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(row.id)}
                            className="p-0.5 hover:bg-white/5 hover:text-[#FF4655] text-gray-500 cursor-pointer transition rounded-xs"
                            title="Delete Row"
                          >
                            <Trash2 size={10} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddRow(index, 'below')}
                            className="p-0.5 hover:bg-white/5 hover:text-[#00F0FF] text-gray-500 cursor-pointer transition rounded-xs"
                            title="Add Row Below"
                          >
                            <Plus size={10} className="rotate-180" />
                          </button>
                        </div>

                        {/* Move Down */}
                        <button
                          type="button"
                          onClick={() => handleMoveRow(index, 'down')}
                          disabled={index === rowOrder.length - 1}
                          className="p-1 hover:bg-white/5 hover:text-white text-gray-500 disabled:opacity-20 cursor-pointer rounded-xs transition"
                          title="Move Row Down"
                        >
                          <ChevronDown size={12} />
                        </button>

                      </div>

                    </div>
                  );
                })}
              </div>

              {/* UNRANKED POOL PANEL */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono text-[#00F0FF] tracking-widest uppercase font-bold">
                    {localT('UNRANKED_POOL')}
                  </span>
                  <span className="text-[8.5px] font-mono text-gray-600 uppercase">
                    {localT('REMAINING', { count: String(unranked.length) })}
                  </span>
                </div>

                <DroppableComponent droppableId="unranked" direction="horizontal">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[120px] p-4 bg-black/10 border border-dashed border-zinc-800 flex items-center space-x-2.5 overflow-x-auto transition duration-150 ${
                        snapshot.isDraggingOver ? 'bg-white/5 border-zinc-700' : ''
                      }`}
                    >
                      {unranked.map((itemId, idx) => {
                        const item = assetMap[itemId];
                        if (!item) return null;

                        return (
                          <DraggableComponent key={item.uuid} draggableId={item.uuid} index={idx}>
                            {(draggableProvided, draggableSnapshot) => (
                              <div
                                ref={draggableProvided.innerRef}
                                {...draggableProvided.draggableProps}
                                {...draggableProvided.dragHandleProps}
                                className={`h-16 flex items-center justify-center bg-[#161A1E] border hover:border-white/20 select-none group transition shrink-0 rounded-xs relative ${
                                  category === 'weapons' ? 'w-24 px-1.5' : category === 'maps' ? 'w-48' : 'w-16 aspect-square'
                                } ${
                                  draggableSnapshot.isDragging ? 'border-[#FF4655] shadow-lg shadow-[#FF4655]/10' : 'border-white/5'
                                }`}
                                title={item.displayName}
                              >
                                {/* CrossOrigin required for html2canvas export rendering */}
                                <img 
                                  src={getCorsUrl(item.displayIcon)} 
                                  alt={item.displayName} 
                                  crossOrigin="anonymous"
                                  referrerPolicy="no-referrer"
                                  className={`select-none pointer-events-none ${
                                    category === 'weapons' 
                                      ? 'w-full h-10 object-contain' 
                                      : category === 'maps' 
                                        ? 'w-full h-full object-cover rounded-xs' 
                                        : 'w-12 h-12 object-contain'
                                  }`}
                                />
                                
                                {/* Hover overlay with display name */}
                                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition flex items-center justify-center p-1 rounded-xs select-none pointer-events-none">
                                  <span className="text-[8px] font-mono font-bold text-white uppercase tracking-widest text-center leading-tight">
                                    {item.displayName}
                                  </span>
                                </div>
                              </div>
                            )}
                          </DraggableComponent>
                        );
                      })}
                      {provided.placeholder}
                      {unranked.length === 0 && (
                        <div className="w-full text-center py-6 text-zinc-600 font-mono text-[10px] uppercase select-none">
                          {localT('ALL_PLACED')}
                        </div>
                      )}
                    </div>
                  )}
                </DroppableComponent>
              </div>

            </DragDropContextComponent>

          </div>
        )}

      </main>

      {/* Custom Alert Modal */}
      {alertDialog && alertDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-[#0F1215] border-t-2 border-[#FF4655] border-x border-b border-zinc-800 p-6 shadow-2xl relative">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-[#FF4655]/10 p-2 border border-[#FF4655]/30">
                <AlertTriangle className="text-[#FF4655]" size={20} />
              </div>
              <h3 className="font-rajdhani font-bold text-base uppercase tracking-widest text-white">
                {alertDialog.title}
              </h3>
            </div>
            
            <p className="text-[11px] font-mono text-gray-300 leading-relaxed uppercase tracking-wider mb-6">
              {alertDialog.message}
            </p>
            
            <div className="flex items-center justify-end">
              <button
                onClick={() => setAlertDialog(null)}
                className="px-4 py-2 bg-[#FF4655] text-white hover:bg-[#ff5865] font-mono text-[9px] tracking-widest uppercase font-bold transition-all duration-150 cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
