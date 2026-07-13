/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ValorantMap, 
  ValorantAgent, 
  Ability, 
  SavedTactic, 
  TacticSlide, 
  TacticalObject, 
  DrawingTool,
  Point,
  Lineup,
  AgentObject,
  AbilityObject,
  ArrowObject
} from '../types';
import TacticalCanvas from './TacticalCanvas';
import { LINEUPS_DATABASE } from '../data/lineups';
import abilityIconsData from '../data/ability_icons.json';
import { 
  ArrowLeft, 
  Undo2, 
  Redo2, 
  RotateCcw, 
  Download, 
  Save, 
  MousePointer, 
  PenTool, 
  ArrowUpRight, 
  Circle, 
  Type, 
  Eraser, 
  Plus, 
  ChevronRight, 
  X, 
  BookOpen, 
  Check, 
  Crosshair,
  Video,
  Info,
  Bookmark,
  Search,
  AlertTriangle,
  Anchor,
  Target,
  Star,
  MapPin,
  Flag,
  Grid
} from 'lucide-react';

const matchesMapName = (lineupMap: string, activeMapName: string): boolean => {
  const lMap = lineupMap.toLowerCase();
  const aMap = activeMapName.toLowerCase();
  if (lMap === aMap) return true;
  if (aMap === 'abyss' && lMap === 'corrode') return true;
  if (aMap === 'corrode' && lMap === 'abyss') return true;
  return false;
};

interface PlannerBoardProps {
  map: ValorantMap;
  initialTactic?: SavedTactic | null;
  onBackToHome: () => void;
  onSave: (tactic: SavedTactic) => void;
}

export default function PlannerBoard({ map, initialTactic, onBackToHome, onSave }: PlannerBoardProps) {
  // Strategy details state
  const [activeMap, setActiveMap] = useState<ValorantMap>(map);
  const [mapsList, setMapsList] = useState<ValorantMap[]>([]);
  const [favoriteLineupIds, setFavoriteLineupIds] = useState<string[]>([]);
  const [bookmarkedOnly, setBookmarkedOnly] = useState<boolean>(false);
 
  // User uploaded lineups state
  const [userLineups, setUserLineups] = useState<Lineup[]>(() => {
    try {
      const stored = localStorage.getItem('valportal_user_lineups');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });
 
  const combinedLineups = [...LINEUPS_DATABASE, ...userLineups];
 
  // Upload Lineup Form States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [uploadLineupName, setUploadLineupName] = useState('');
  const [uploadAgentName, setUploadAgentName] = useState('');
  const [uploadAbilityName, setUploadAbilityName] = useState('');
  const [uploadType, setUploadType] = useState<'smoke' | 'flash' | 'molly' | 'recon' | 'setup'>('smoke');
  const [uploadSite, setUploadSite] = useState<'attack' | 'defense'>('attack');
  const [uploadDifficulty, setUploadDifficulty] = useState<'easy' | 'medium' | 'pro'>('easy');
  const [uploadYoutubeId, setUploadYoutubeId] = useState('');
  const [uploadAgentPos, setUploadAgentPos] = useState<{ x: number, y: number } | null>(null);
  const [uploadAbilityPos, setUploadAbilityPos] = useState<{ x: number, y: number } | null>(null);
  
  // Placement coordinate helper state
  const [activePlacementCoordType, setActivePlacementCoordType] = useState<'none' | 'agent' | 'ability'>('none');
 
  const handleSaveUploadLineup = () => {
    if (!uploadLineupName.trim()) {
      showNotification('LINEUP NAME IS REQUIRED', 'error');
      return;
    }
    if (!uploadAgentPos) {
      showNotification('AGENT THROWER POSITION IS REQUIRED', 'error');
      return;
    }
    if (!uploadAbilityPos) {
      showNotification('ABILITY LANDING POSITION IS REQUIRED', 'error');
      return;
    }
 
    // Get selected agent object to retrieve details
    const selectedAgentObj = agents.find(a => a.displayName === uploadAgentName) || agents[0];
    if (!selectedAgentObj) {
      showNotification('COULD NOT RESOLVE SELECTED AGENT', 'error');
      return;
    }
 
    // Parse youtube ID if full URL was provided
    let ytId = uploadYoutubeId.trim();
    if (ytId.includes('youtube.com') || ytId.includes('youtu.be')) {
      try {
        const urlObj = new URL(ytId);
        if (ytId.includes('youtu.be')) {
          ytId = urlObj.pathname.substring(1);
        } else {
          ytId = urlObj.searchParams.get('v') || '';
        }
      } catch (e) {}
    }
 
    const newLineup: Lineup = {
      id: `user_lineup_${Date.now()}`,
      name: uploadLineupName.trim(),
      agent: {
        id: Number(selectedAgentObj.uuid.substring(0, 5).replace(/[^0-9]/g, '')) || Date.now(),
        name: selectedAgentObj.displayName.toLowerCase(),
        displayName: selectedAgentObj.displayName
      },
      ability: {
        id: Date.now() + 1,
        displayName: uploadAbilityName || selectedAgentObj.abilities[0]?.displayName || 'Ability'
      },
      type: uploadType,
      site: uploadSite,
      map: activeMap.displayName.toLowerCase(),
      agent_position_norm: uploadAgentPos,
      ability_position_norm: uploadAbilityPos,
      level: uploadDifficulty,
      ...(ytId ? {
        video: {
          youtube_id: ytId,
          timestamp_sec: 0,
          title: uploadLineupName.trim()
        }
      } : {})
    };
 
    const updatedUserLineups = [...userLineups, newLineup];
    setUserLineups(updatedUserLineups);
    localStorage.setItem('valportal_user_lineups', JSON.stringify(updatedUserLineups));
 
    showNotification('CUSTOM LINEUP SAVED SUCCESSFULLY!', 'success');
    
    // Reset Form
    setUploadLineupName('');
    setUploadAgentPos(null);
    setUploadAbilityPos(null);
    setUploadYoutubeId('');
    setShowUploadModal(false);
  };

  const toggleFavoriteLineup = (lineupId: string) => {
    setFavoriteLineupIds(prev => {
      const isAlreadyFav = prev.includes(lineupId);
      const updated = isAlreadyFav 
        ? prev.filter(id => id !== lineupId) 
        : [...prev, lineupId];
      localStorage.setItem('valportal_favorites', JSON.stringify(updated));
      return updated;
    });
  };

  // Sync activeMap when prop changes
  useEffect(() => {
    setActiveMap(map);
  }, [map]);

  const [tacticId, setTacticId] = useState<string>(initialTactic?.id || `tac_${Date.now()}`);
  const [tacticName, setTacticName] = useState<string>(initialTactic?.name || `TACTIC // ${map.displayName.toUpperCase()} SETUP`);
  const [notes, setNotes] = useState<string>(initialTactic?.notes || '');
  
  // Slide/Phase state
  const [slides, setSlides] = useState<TacticSlide[]>(
    initialTactic?.slides || [
      { id: `slide_${Date.now()}_1`, name: 'SETUP PHASE', objects: [] }
    ]
  );
  const [activeSlideIdx, setActiveSlideIdx] = useState<number>(0);

  // Undo/Redo stacks for changes to the active slide's objects
  const [undoStack, setUndoStack] = useState<TacticalObject[][]>([]);
  const [redoStack, setRedoStack] = useState<TacticalObject[][]>([]);

  // Toolbar state
  const [activeTool, setActiveTool] = useState<DrawingTool>('select');
  const [activeColor, setActiveColor] = useState<string>('#FF4655'); // Valorant Red
  const [attackerDefenderMode, setAttackerDefenderMode] = useState<'attacker' | 'defender'>('attacker');

  // Agent selector state
  const [agents, setAgents] = useState<ValorantAgent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState<boolean>(true);
  const [weapons, setWeapons] = useState<any[]>([]);
 
  // Fetch weapons data from Valorant-API
  useEffect(() => {
    async function fetchWeapons() {
      try {
        const res = await fetch('https://valorant-api.com/v1/weapons');
        if (res.ok) {
          const json = await res.json();
          setWeapons(json.data || []);
        }
      } catch (err) {
        console.error('Failed to load weapons', err);
      }
    }
    fetchWeapons();
  }, []);
  const [selectedAgent, setSelectedAgent] = useState<ValorantAgent | null>(null);
  const [activeRoleFilter, setActiveRoleFilter] = useState<string>('All');

  // Export & Alert HUD overlay states
  const [exporting, setExporting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Lineup states
  const [activeSidebarTab, setActiveSidebarTab] = useState<'roster' | 'lineups'>('roster');
  const [activeVideo, setActiveVideo] = useState<{ youtubeId: string; start: number; title: string } | null>(null);
  const [lineupSearchQuery, setLineupSearchQuery] = useState<string>('');
  const [lineupTypeFilter, setLineupTypeFilter] = useState<'all' | 'smoke' | 'flash' | 'molly' | 'recon' | 'setup'>('all');
  const [lineupSiteFilter, setLineupSiteFilter] = useState<'all' | 'a' | 'b' | 'c' | 'mid'>('all');
  const [lineupAgentFilter, setLineupAgentFilter] = useState<string>('all');
  const [lineupAbilityFilter, setLineupAbilityFilter] = useState<string>('all');
  const [lineupDifficultyFilter, setLineupDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'pro'>('all');
  const [showLineupsOverlay, setShowLineupsOverlay] = useState<boolean>(true);
  const [selectedLineup, setSelectedLineup] = useState<Lineup | null>(null);
  const [hoveredLineup, setHoveredLineup] = useState<Lineup | null>(null);
  const [lineupLimit, setLineupLimit] = useState<number>(30);

  // Draggable Tactical Video HUD panel state
  const [panelPos, setPanelPos] = useState<Point>({ x: 20, y: 80 });
  const [isDraggingPanel, setIsDraggingPanel] = useState<boolean>(false);
  const [dragStartPanel, setDragStartPanel] = useState<Point>({ x: 0, y: 0 });
  const [showStampsMenu, setShowStampsMenu] = useState<boolean>(false);

  const handlePanelMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.panel-drag-handle')) {
      setIsDraggingPanel(true);
      setDragStartPanel({
        x: e.clientX - panelPos.x,
        y: e.clientY - panelPos.y
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingPanel) return;
      setPanelPos({
        x: e.clientX - dragStartPanel.x,
        y: e.clientY - dragStartPanel.y
      });
    };

    const handleMouseUp = () => {
      setIsDraggingPanel(false);
    };

    if (isDraggingPanel) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPanel, dragStartPanel]);

  // Reset display limit when filter criteria changes
  useEffect(() => {
    setLineupLimit(30);
  }, [lineupSearchQuery, lineupTypeFilter, attackerDefenderMode, lineupSiteFilter, lineupAgentFilter, lineupAbilityFilter, lineupDifficultyFilter, activeMap]);

  // Reset agent and ability filters, selected & hovered lineups when activeMap changes
  useEffect(() => {
    setLineupAgentFilter('all');
    setLineupAbilityFilter('all');
    setSelectedLineup(null);
    setHoveredLineup(null);
  }, [activeMap]);

  // Load bookmarks and fetch maps list on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('valportal_favorites');
      if (stored) {
        setFavoriteLineupIds(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to load favorites', err);
    }

    async function fetchMaps() {
      try {
        const res = await fetch('https://valorant-api.com/v1/maps');
        if (!res.ok) throw new Error('Failed to load maps');
        const json = await res.json();
        const playableMaps = json.data.filter((m: any) => 
          m.displayIcon !== null && 
          m.displayName.toLowerCase() !== 'the range' &&
          m.displayName.toLowerCase() !== 'pitt'
        );
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
        const mappedMaps = playableMaps.map((m: any) => {
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

        const customMapsFallback = [
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

        setMapsList(mergedMaps);
      } catch (err) {
        console.error('Failed to fetch maps switcher', err);
      }
    }
    fetchMaps();
  }, []);

  // Fetch agents data from Valorant-API
  useEffect(() => {
    async function fetchAgents() {
      try {
        setLoadingAgents(true);
        const res = await fetch('https://valorant-api.com/v1/agents?isPlayableCharacter=true');
        if (!res.ok) throw new Error('Failed to load agents');
        const json = await res.json();
        
        // Helper to slugify ability display name
        const slugify = (text: string) => {
          return text.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
        };

        const abilityIcons: Record<string, Record<string, { icon: string; name: string }>> = abilityIconsData as any;

        // Map agents and filter duplicate/invalid records (sometimes Sova has multiple records in API)
        const uniqueAgentsMap = new Map<string, any>();
        json.data.forEach((ag: any) => {
          uniqueAgentsMap.set(ag.displayName, ag);
        });

        let mappedAgents: ValorantAgent[] = Array.from(uniqueAgentsMap.values()).map((ag: any) => {
          const agentName = ag.displayName;
          const customAgentAbilities = abilityIcons[agentName];

          const updatedAbilities = ag.abilities
            .filter((ab: any) => ab.displayIcon !== null) // Only include actionable abilities
            .map((ab: any) => {
              let icon = ab.displayIcon;
              if (customAgentAbilities) {
                const slug = slugify(ab.displayName);
                const customAb = customAgentAbilities[slug] || Object.values(customAgentAbilities).find((c: any) => c.name.toLowerCase() === ab.displayName.toLowerCase());
                if (customAb && customAb.icon) {
                  icon = customAb.icon;
                }
              }
              return {
                slot: ab.slot,
                displayName: ab.displayName,
                description: ab.description,
                displayIcon: icon
              };
            });

          return {
            uuid: ag.uuid,
            displayName: ag.displayName,
            description: ag.description,
            developerName: ag.developerName,
            role: ag.role ? {
              uuid: ag.role.uuid,
              displayName: ag.role.displayName,
              description: ag.role.description,
              displayIcon: ag.role.displayIcon
            } : null,
            displayIcon: ag.displayIcon,
            abilities: updatedAbilities
          };
        });

        // Now, find custom agents from ability_icons.json that are missing from official list
        const slotsOrder = ['Grenade', 'Ability1', 'Ability2', 'Ultimate']; // C, Q, E, X
        Object.entries(abilityIcons).forEach(([agentName, abilitiesMap]) => {
          const alreadyExists = mappedAgents.some(a => a.displayName.toLowerCase() === agentName.toLowerCase());
          if (!alreadyExists) {
            // Determine role
            let roleName = 'Initiator';
            if (agentName === 'Veto') {
              roleName = 'Sentinel';
            } else if (agentName === 'Waylay') {
              roleName = 'Initiator';
            } else if (agentName === 'Tejo') {
              roleName = 'Initiator';
            }

            // Create abilities list
            const customAbilities = Object.entries(abilitiesMap).map(([abilitySlug, data]: [string, any], idx) => {
              const slot = slotsOrder[idx % slotsOrder.length];
              return {
                slot,
                displayName: data.name,
                description: `${data.name} (Custom Ability)`,
                displayIcon: data.icon
              };
            });

            const customAgent: ValorantAgent = {
              uuid: `custom_${agentName.toLowerCase()}`,
              displayName: agentName,
              description: `${agentName} (Custom Agent)`,
              developerName: agentName,
              role: {
                uuid: `role_custom_${agentName.toLowerCase()}`,
                displayName: roleName,
                description: `${roleName} Role`,
                displayIcon: ''
              },
              displayIcon: '', // Text fallback will be used
              abilities: customAbilities
            };

            mappedAgents.push(customAgent);
          }
        });

        // Sort alphabetically
        mappedAgents.sort((a, b) => a.displayName.localeCompare(b.displayName));

        setAgents(mappedAgents);
        if (mappedAgents.length > 0) {
          setSelectedAgent(mappedAgents[0]); // Select first by default
        }
        setLoadingAgents(false);
      } catch (err) {
        console.error('Error fetching agents', err);
        setLoadingAgents(false);
        showNotification('Error loading Agent rosters. Abilities dragging disabled.', 'error');
      }
    }
    fetchAgents();
  }, []);

  // Show floating alert HUD
  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Push previous state to undo stack
  const addUndoState = () => {
    const currentObjects = (slides[activeSlideIdx] || slides[0] || { objects: [] }).objects;
    setUndoStack(prev => [...prev, [...currentObjects]]);
    setRedoStack([]); // Clear redo stack on new action
  };

  // Handle slide object updates
  const handleObjectsChange = (newObjects: TacticalObject[]) => {
    setSlides(prevSlides => 
      prevSlides.map((slide, idx) => 
        idx === activeSlideIdx ? { ...slide, objects: newObjects } : slide
      )
    );
  };

  // Undo action
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const currentObjects = (slides[activeSlideIdx] || slides[0] || { objects: [] }).objects;
    const previousObjects = undoStack[undoStack.length - 1];

    setRedoStack(prev => [...prev, [...currentObjects]]);
    setUndoStack(prev => prev.slice(0, prev.length - 1));

    handleObjectsChange(previousObjects);
    showNotification('UNDO ACTION APPLIED', 'info');
  };

  // Redo action
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const currentObjects = (slides[activeSlideIdx] || slides[0] || { objects: [] }).objects;
    const nextObjects = redoStack[redoStack.length - 1];

    setUndoStack(prev => [...prev, [...currentObjects]]);
    setRedoStack(prev => prev.slice(0, prev.length - 1));

    handleObjectsChange(nextObjects);
    showNotification('REDO ACTION APPLIED', 'info');
  };

  // Clear current active slide's objects
  const handleClearSlide = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'CLEAR CURRENT PHASE',
      message: 'Are you sure you want to clear all drawings and placed agents on this phase?',
      onConfirm: () => {
        addUndoState();
        handleObjectsChange([]);
        showNotification('PHASE CLEARED', 'info');
        setConfirmDialog(null);
      }
    });
  };

  // Add a new slide/phase
  const handleAddSlide = () => {
    const newSlideId = `slide_${Date.now()}`;
    const newSlideNumber = slides.length + 1;
    const newSlide: TacticSlide = {
      id: newSlideId,
      name: `PHASE ${newSlideNumber}: EXECUTE`,
      objects: []
    };

    setSlides([...slides, newSlide]);
    setActiveSlideIdx(slides.length);
    setUndoStack([]);
    setRedoStack([]);
    showNotification(`ADDED PHASE ${newSlideNumber}`, 'success');
  };

  // Remove a slide/phase
  const handleRemoveSlide = (idxToRemove: number) => {
    if (slides.length === 1) {
      showNotification('Cannot delete the last remaining phase', 'error');
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: 'DELETE PHASE',
      message: `Delete "${slides[idxToRemove].name}"? This action cannot be undone.`,
      onConfirm: () => {
        const updatedSlides = slides.filter((_, idx) => idx !== idxToRemove);
        setSlides(updatedSlides);
        
        // Reset active index if needed
        if (activeSlideIdx >= updatedSlides.length) {
          setActiveSlideIdx(updatedSlides.length - 1);
        } else if (activeSlideIdx === idxToRemove) {
          setActiveSlideIdx(Math.max(0, idxToRemove - 1));
        }
        
        setUndoStack([]);
        setRedoStack([]);
        showNotification('PHASE DELETED', 'info');
        setConfirmDialog(null);
      }
    });
  };

  // Apply pre-set lineup coordinates directly on active canvas map
  const applyLineupToBoard = (lineup: Lineup) => {
    // Find the agent in our loaded roster
    const matchedAgent = agents.find(a => a.displayName.toLowerCase() === lineup.agent.displayName.toLowerCase());
    
    const agentUuid = matchedAgent?.uuid || `agent_${lineup.agent.id}`;
    const agentName = matchedAgent?.displayName || lineup.agent.displayName;
    const agentIcon = matchedAgent?.displayIcon || `https://media.valorant-api.com/agents/${agentUuid}/displayicon.png`;
    
    // Find matching ability
    const matchedAbility = matchedAgent?.abilities.find(
      ab => ab.displayName.toLowerCase() === lineup.ability.displayName.toLowerCase()
    );
    
    const abilitySlot = matchedAbility?.slot || 'Grenade';
    const abilityName = matchedAbility?.displayName || lineup.ability.displayName;
    const abilityIcon = matchedAbility?.displayIcon || '';

    // Calculate actual SVG coordinates based on normalized ratios
    const agentCoords = {
      x: 50 + lineup.agent_position_norm.x * 900,
      y: 50 + lineup.agent_position_norm.y * 900
    };
    const abilityCoords = {
      x: 50 + lineup.ability_position_norm.x * 900,
      y: 50 + lineup.ability_position_norm.y * 900
    };

    addUndoState();

    const agentObj: AgentObject = {
      id: `lineup_agent_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type: 'agent',
      agentId: agentUuid,
      agentName: agentName,
      iconUrl: agentIcon,
      position: agentCoords,
      size: 40,
      color: lineup.site === 'attack' ? '#FF4655' : '#00F0FF',
      roleColor: lineup.site === 'attack' ? '#FF4655' : '#00F0FF'
    };

    const abilityObj: AbilityObject = {
      id: `lineup_ability_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type: 'ability',
      agentId: agentUuid,
      agentName: agentName,
      abilityName: abilityName,
      abilitySlot: abilitySlot,
      iconUrl: abilityIcon,
      position: abilityCoords,
      size: 30,
      color: '#FFFFFF'
    };

    const arrowObj: ArrowObject = {
      id: `lineup_traj_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type: 'arrow',
      color: lineup.type === 'molly' ? '#FF4655' : lineup.type === 'recon' ? '#00F0FF' : '#EAB308',
      start: agentCoords,
      end: {
        x: agentCoords.x + (abilityCoords.x - agentCoords.x) * 0.94,
        y: agentCoords.y + (abilityCoords.y - agentCoords.y) * 0.94
      },
      strokeWidth: 3
    };

    // Push details to active notes
    const videoUrlPart = lineup.video ? `\n- Ref: https://youtube.com/watch?v=${lineup.video.youtube_id}&t=${lineup.video.timestamp_sec}s` : '';
    const newLineupNotes = `[LINEUP APPLIED] ${lineup.name.toUpperCase()}\n- Trajectory: (${lineup.agent_position_norm.x}, ${lineup.agent_position_norm.y}) to (${lineup.ability_position_norm.x}, ${lineup.ability_position_norm.y})${videoUrlPart}\n\n${notes}`;
    setNotes(newLineupNotes);

    setActiveTool('select');

    const currentSlide = slides[activeSlideIdx] || slides[0] || { objects: [] };
    handleObjectsChange([...currentSlide.objects, agentObj, abilityObj, arrowObj]);
    
    showNotification(`APPLIED: ${lineup.name.toUpperCase()}`, 'success');
  };

  // Save tactic to LocalStorage
  const handleSaveTactic = () => {
    const tactic: SavedTactic = {
      id: tacticId,
      name: tacticName.trim() || `TACTIC // ${map.displayName.toUpperCase()}`,
      mapUuid: map.uuid,
      mapName: map.displayName,
      mapSplash: map.splash,
      mapCoordinates: map.coordinates,
      mapDisplayIcon: map.displayIcon,
      slides,
      notes,
      createdAt: initialTactic?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(tactic);
    showNotification('TACTIC SAVED TO STRATEGY HUB', 'success');
  };

  // Export layout to PNG image using HTML5 Canvas
  const handleExportPNG = async () => {
    try {
      setExporting(true);
      showNotification('COMPILING TACTICAL CANVAS...', 'info');

      // Create a canvas elements
      const canvas = document.createElement('canvas');
      canvas.width = 1000;
      canvas.height = 1000;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context not available');

      // Draw background dark slate base
      ctx.fillStyle = '#0F1215';
      ctx.fillRect(0, 0, 1000, 1000);

      // Async loading image helper
      const loadImage = (url: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous'; // critical for CORS images
          img.onload = () => resolve(img);
          img.onerror = () => {
            // Return dummy image if download fails to prevent complete export failure
            const fallbackImg = new Image();
            resolve(fallbackImg);
          };
          img.src = url;
        });
      };

      // 1. Draw Map Top-Down Layout
      const mapUrl = map.displayIcon || map.splash;
      const mapImg = await loadImage(mapUrl);
      if (mapImg.width > 0) {
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.drawImage(mapImg, 50, 50, 900, 900);
        ctx.restore();
      }

      // Draw thin technical borders
      ctx.strokeStyle = 'rgba(255, 70, 85, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(49, 49, 902, 902);

      // 2. Draw placed Objects & Lines from Slide
      const currentSlide = slides[activeSlideIdx] || slides[0] || { objects: [] };
      
      for (const obj of currentSlide.objects) {
        ctx.save();
        
        if (obj.type === 'freehand') {
          const pathObj = obj as any;
          if (pathObj.points.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = obj.color;
            ctx.lineWidth = pathObj.strokeWidth || 4;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.moveTo(pathObj.points[0].x, pathObj.points[0].y);
            for (let i = 1; i < pathObj.points.length; i++) {
              ctx.lineTo(pathObj.points[i].x, pathObj.points[i].y);
            }
            ctx.stroke();
          }
        } 
        
        else if (obj.type === 'line') {
          const line = obj as any;
          ctx.beginPath();
          ctx.strokeStyle = obj.color;
          ctx.lineWidth = line.strokeWidth || 4;
          ctx.lineCap = 'round';
          ctx.moveTo(line.start.x, line.start.y);
          ctx.lineTo(line.end.x, line.end.y);
          ctx.stroke();
        } 
        
        else if (obj.type === 'arrow') {
          const arrow = obj as any;
          const start = arrow.start;
          const end = arrow.end;
          
          // Draw shaft
          ctx.beginPath();
          ctx.strokeStyle = obj.color;
          ctx.lineWidth = arrow.strokeWidth || 4;
          ctx.lineCap = 'round';
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();

          // Draw arrowhead
          const angle = Math.atan2(end.y - start.y, end.x - start.x);
          const arrowLength = 14;
          ctx.beginPath();
          ctx.fillStyle = obj.color;
          ctx.moveTo(end.x, end.y);
          ctx.lineTo(
            end.x - arrowLength * Math.cos(angle - Math.PI / 6),
            end.y - arrowLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            end.x - arrowLength * Math.cos(angle + Math.PI / 6),
            end.y - arrowLength * Math.sin(angle + Math.PI / 6)
          );
          ctx.closePath();
          ctx.fill();
        } 
        
        else if (obj.type === 'circle') {
          const circle = obj as any;
          ctx.beginPath();
          ctx.arc(circle.center.x, circle.center.y, circle.radius, 0, 2 * Math.PI);
          ctx.strokeStyle = obj.color;
          ctx.lineWidth = circle.strokeWidth || 3;
          
          // Fill translucent for utility areas
          if (circle.fillType === 'filled') {
            ctx.fillStyle = `${obj.color}33`; // alpha 20%
            ctx.fill();
          }
          ctx.stroke();
        } 
        
        else if (obj.type === 'text') {
          const text = obj as any;
          ctx.fillStyle = obj.color;
          ctx.font = 'bold 15px monospace';
          ctx.fillText(text.text, text.position.x, text.position.y);
        } 
        
        else if (obj.type === 'agent') {
          const agent = obj as any;
          // Draw background ring base
          ctx.beginPath();
          ctx.arc(agent.position.x, agent.position.y, agent.size / 2 + 2, 0, 2 * Math.PI);
          ctx.fillStyle = '#0F1215';
          ctx.fill();
          ctx.strokeStyle = agent.roleColor || '#FF4655';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Load and draw face icon
          const faceImg = await loadImage(agent.iconUrl);
          if (faceImg.width > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(agent.position.x, agent.position.y, agent.size / 2, 0, 2 * Math.PI);
            ctx.clip();
            ctx.drawImage(
              faceImg,
              agent.position.x - agent.size / 2,
              agent.position.y - agent.size / 2,
              agent.size,
              agent.size
            );
            ctx.restore();
          }

          // Draw agent name plate below
          ctx.fillStyle = '#0B0E11';
          ctx.fillRect(agent.position.x - 20, agent.position.y + agent.size / 2 + 2, 40, 10);
          ctx.strokeStyle = agent.roleColor || '#FF4655';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(agent.position.x - 20, agent.position.y + agent.size / 2 + 2, 40, 10);

          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 7px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(
            agent.agentName.substring(0, 5).toUpperCase(), 
            agent.position.x, 
            agent.position.y + agent.size / 2 + 9
          );
        } 
        
        else if (obj.type === 'ability') {
          const ab = obj as any;
          ctx.fillStyle = 'rgba(15, 18, 21, 0.95)';
          ctx.fillRect(ab.position.x - ab.size / 2, ab.position.y - ab.size / 2, ab.size, ab.size);
          ctx.strokeStyle = '#FF4655';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(ab.position.x - ab.size / 2, ab.position.y - ab.size / 2, ab.size, ab.size);

          if (ab.iconUrl) {
            const abImg = await loadImage(ab.iconUrl);
            if (abImg.width > 0) {
              ctx.drawImage(
                abImg,
                ab.position.x - ab.size / 2 + 2,
                ab.position.y - ab.size / 2 + 2,
                ab.size - 4,
                ab.size - 4
              );
            }
          }
        }

        ctx.restore();
      }

      // 3. Draw Watermark info plate
      ctx.fillStyle = 'rgba(11, 14, 17, 0.9)';
      ctx.fillRect(20, 20, 340, 60);
      ctx.strokeStyle = '#FF4655';
      ctx.lineWidth = 1;
      ctx.strokeRect(20, 20, 340, 60);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(`VALPORTAL // ${map.displayName.toUpperCase()}`, 35, 42);

      ctx.fillStyle = '#FF4655';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`${tacticName.toUpperCase()}`, 35, 56);
      ctx.fillStyle = '#888888';
      ctx.fillText(`PHASE: ${currentSlide.name.toUpperCase()}`, 35, 70);

      // Trigger file download
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `valportal_${map.displayName.toLowerCase()}_${currentSlide.name.toLowerCase().replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();

      setExporting(false);
      showNotification('TACTICAL OVERLAY EXPORTED SUCCESSFUL', 'success');
    } catch (err) {
      console.error('Export failed', err);
      setExporting(false);
      showNotification('EXPORT FAILED (SECURE ASSETS BLOCKED)', 'error');
    }
  };

  // Filter playable characters based on role
  const filteredAgents = agents.filter(agent => {
    if (activeRoleFilter === 'All') return true;
    return agent.role?.displayName === activeRoleFilter;
  });

  const currentMapLineups = (lineupAgentFilter !== 'all')
    ? combinedLineups.filter(l => {
        const matchesMap = matchesMapName(l.map, activeMap.displayName);
        if (!matchesMap) return false;

        // Filter by Bookmarks
        if (bookmarkedOnly && !favoriteLineupIds.includes(l.id)) {
          return false;
        }

        // Filter by Agent
        if (l.agent.displayName.toLowerCase() !== lineupAgentFilter.toLowerCase()) {
          return false;
        }

        // Filter by Ability
        if (lineupAbilityFilter !== 'all' && l.ability.displayName.toLowerCase() !== lineupAbilityFilter.toLowerCase()) {
          return false;
        }

        const matchesSearch = lineupSearchQuery === '' || 
          l.name.toLowerCase().includes(lineupSearchQuery.toLowerCase()) ||
          l.agent.displayName.toLowerCase().includes(lineupSearchQuery.toLowerCase()) ||
          l.ability.displayName.toLowerCase().includes(lineupSearchQuery.toLowerCase());
        if (!matchesSearch) return false;

        const matchesType = lineupTypeFilter === 'all' || l.type === lineupTypeFilter;
        if (!matchesType) return false;

        const matchesDifficulty = lineupDifficultyFilter === 'all' || l.level === lineupDifficultyFilter;
        if (!matchesDifficulty) return false;

        const activeSide = attackerDefenderMode === 'attacker' ? 'attack' : 'defense';
        const matchesSide = l.site === activeSide;
        if (!matchesSide) return false;

        const getLineupSite = (lineupName: string): 'a' | 'b' | 'c' | 'mid' | 'unknown' => {
          const name = lineupName.toLowerCase();
          if (name.includes('site a') || name.includes(' a ') || name.includes('a site') || name.includes('for a') || name.includes('at a') || name.includes('to a') || name.startsWith('a ') || name.includes('shack')) {
            return 'a';
          }
          if (name.includes('site b') || name.includes(' b ') || name.includes('b site') || name.includes('for b') || name.includes('at b') || name.includes('to b') || name.startsWith('b ')) {
            return 'b';
          }
          if (name.includes('site c') || name.includes(' c ') || name.includes('c site') || name.includes('for c') || name.includes('at c') || name.includes('to c') || name.startsWith('c ')) {
            return 'c';
          }
          if (name.includes('mid') || name.includes('middle') || name.includes('connector')) {
            return 'mid';
          }
          return 'unknown';
        };

        const matchesSite = lineupSiteFilter === 'all' || getLineupSite(l.name) === lineupSiteFilter;
        if (!matchesSite) return false;

        return true;
      })
    : [];

  return (
    <div className="h-screen w-screen bg-[#0B0E11] text-white flex flex-col overflow-hidden select-none font-sans relative">
      
      {/* FLOAT NOTIFICATION HUD */}
      {notification && (
        <div className={`absolute top-16 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-2 border px-4 py-2 font-mono text-xs font-bold shadow-2xl tracking-widest animate-fade-in ${
          notification.type === 'success' ? 'bg-green-500/10 border-green-500 text-green-400' :
          notification.type === 'error' ? 'bg-[#FF4655]/10 border-[#FF4655] text-[#FF4655]' :
          'bg-cyan-500/10 border-[#00F0FF] text-[#00F0FF]'
        }`}>
          <span className="w-1.5 h-1.5 bg-current animate-ping"></span>
          <span>{notification.message}</span>
        </div>
      )}

      {/* TOP HEADER NAVIGATION (60px) */}
      <header className="h-[60px] border-b border-white/5 bg-[#0F1215] flex items-center justify-between px-4 shrink-0 z-20">
        
        {/* Left corner details */}
        <div className="flex items-center space-x-4">
          <button 
            onClick={onBackToHome}
            className="p-1.5 hover:bg-white/5 border border-transparent hover:border-white/5 text-gray-400 hover:text-white transition duration-150 rounded-none flex items-center active:scale-95"
            title="Go back to maps"
          >
            <ArrowLeft size={16} />
          </button>
          
          <div className="h-6 w-[1px] bg-white/10" />

          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] font-mono text-[#FF4655] tracking-widest font-bold">MAP:</span>
              <span className="text-xs font-mono font-bold text-gray-300 tracking-wider uppercase">{map.displayName}</span>
            </div>
            
            {/* Inline Rename tactic field */}
            <input
              type="text"
              value={tacticName}
              onChange={(e) => setTacticName(e.target.value)}
              className="bg-transparent border-b border-transparent hover:border-white/20 focus:border-[#FF4655] focus:outline-none text-[13px] font-mono text-white font-bold w-64 uppercase tracking-wider px-0.5 py-0"
              placeholder="TACTIC NAME"
            />
          </div>
        </div>

        {/* Center: Phase slide navigation tabs */}
        <div className="hidden md:flex items-center bg-[#161A1E]/80 border border-white/5 px-1 py-1 rounded-none max-w-lg overflow-x-auto space-x-1">
          {slides.map((slide, idx) => (
            <div 
              key={slide.id}
              onClick={() => {
                setActiveSlideIdx(idx);
                setUndoStack([]);
                setRedoStack([]);
              }}
              className={`group flex items-center px-3 py-1 font-mono text-[10px] font-bold tracking-widest uppercase transition-all duration-150 cursor-pointer ${idx === activeSlideIdx ? 'bg-[#FF4655] text-black font-extrabold' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <span>
                {slide.name}
              </span>
              
              {slides.length > 1 && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveSlide(idx);
                  }}
                  className={`ml-1.5 p-0.5 rounded-sm transition ${idx === activeSlideIdx ? 'text-black hover:bg-black/10' : 'text-gray-500 hover:text-white hover:bg-white/10'}`}
                >
                  <X size={8} />
                </button>
              )}
            </div>
          ))}

          <button
            onClick={handleAddSlide}
            className="px-2.5 py-1 text-[#FF4655] hover:text-white hover:bg-[#FF4655]/10 rounded-none transition duration-150 active:scale-90 flex items-center justify-center cursor-pointer"
            title="Create next planning phase"
          >
            <Plus size={12} />
          </button>
        </div>

        {/* Right Corner action grouping */}
        <div className="flex items-center space-x-2">
          {/* Action Tools */}
          <div className="flex items-center border border-white/5 bg-[#161A1E]/40 px-1 py-1 space-x-1">
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="p-1.5 rounded-none text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-white/5 transition"
              title="Undo sketch (Ctrl+Z)"
            >
              <Undo2 size={13} />
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="p-1.5 rounded-none text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-white/5 transition"
              title="Redo sketch"
            >
              <Redo2 size={13} />
            </button>
            <button
              onClick={handleClearSlide}
              className="p-1.5 rounded-none text-gray-400 hover:text-[#FF4655] hover:bg-[#FF4655]/5 transition"
              title="Clear phase board"
            >
              <RotateCcw size={13} />
            </button>
          </div>

          <div className="h-6 w-[1px] bg-white/10" />

          {/* Export and Save actions */}
          <button 
            onClick={handleExportPNG}
            disabled={exporting}
            className="px-3.5 py-1.5 bg-[#161A1E] border border-white/5 hover:border-cyan-400 text-[10px] font-mono font-bold text-gray-300 hover:text-white tracking-widest uppercase transition flex items-center space-x-1.5 active:scale-95 disabled:opacity-50"
          >
            <Download size={11} className={exporting ? 'animate-bounce text-[#00F0FF]' : 'text-[#00F0FF]'} />
            <span>{exporting ? 'EXPORTING' : 'EXPORT PNG'}</span>
          </button>

          <button 
            onClick={handleSaveTactic}
            className="px-3.5 py-1.5 bg-[#FF4655] text-black hover:bg-[#FF4655]/90 text-[10px] font-mono font-bold tracking-widest uppercase transition flex items-center space-x-1.5 val-miter-btn active:scale-95"
          >
            <Save size={11} className="fill-black stroke-none" />
            <span>SAVE TACTIC</span>
          </button>
        </div>

      </header>

      {/* CORE 3-COLUMN WORKSPACE (Viewport height locked, no scroll) */}
      <div className="flex-1 flex w-full min-h-0 overflow-hidden relative">
        
        {/* LEFT COLUMN: Tool Selector Rail (60px) OR Lineups Agent Grid (260px) */}
        {activeSidebarTab === 'lineups' ? (
          <aside className="w-[260px] bg-[#0F1215] border-r border-white/5 flex flex-col shrink-0 z-10 select-none h-full min-h-0 overflow-hidden">
            <div className="p-3.5 border-b border-white/5 bg-[#161A1E]/30 shrink-0 flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#FF4655] tracking-widest font-extrabold uppercase">AGENTS // ROSTER</span>
              <span className="text-[8px] font-mono text-gray-500 font-bold uppercase">{filteredAgents.length} SELECTABLE</span>
            </div>
            
            {/* Scrollable Agent Grid */}
            <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
              <div className="grid grid-cols-4 gap-1.5">
                {filteredAgents.map((agent) => {
                  const isSelected = lineupAgentFilter.toLowerCase() === agent.displayName.toLowerCase();
                  
                  // Calculate lineups count for this agent on the active map
                  const lineupCountOnMap = combinedLineups.filter(l => 
                    matchesMapName(l.map, activeMap.displayName) &&
                    l.agent.displayName.toLowerCase() === agent.displayName.toLowerCase()
                  ).length;

                  const hasLineups = lineupCountOnMap > 0;

                  const roleColorMap: { [key: string]: string } = {
                    'Duelist': '#FF4655',
                    'Sentinel': '#22C55E',
                    'Controller': '#00F0FF',
                    'Initiator': '#EAB308'
                  };
                  const roleColor = roleColorMap[agent.role?.displayName || ''] || '#9ca3af';

                  return (
                    <button
                      key={agent.displayName}
                      onClick={() => {
                        setLineupAgentFilter(agent.displayName);
                        setLineupAbilityFilter('all');
                        setSelectedLineup(null);
                        setHoveredLineup(null);
                      }}
                      className={`relative aspect-square bg-[#161A1E] flex flex-col items-center justify-center p-1 cursor-pointer transition-all duration-150 rounded-xl group overflow-hidden ${
                        isSelected 
                          ? 'bg-[#FF4655]/10 scale-95 shadow-[0_0_12px_rgba(255,70,85,0.15)]' 
                          : 'hover:bg-white/5'
                      } ${!hasLineups ? 'opacity-35 grayscale hover:opacity-60' : 'opacity-100'}`}
                      style={{
                        borderColor: isSelected ? roleColor : 'rgba(255,255,255,0.05)',
                        borderWidth: isSelected ? '2px' : '1px'
                      }}
                      title={`${agent.displayName} (${agent.role?.displayName || 'No Role'}) - ${lineupCountOnMap} lineups available on ${activeMap.displayName}`}
                    >
                      {/* Round Agent Portrait (56px) */}
                      <div className="w-14 h-14 rounded-full overflow-hidden border border-white/5 bg-black/40 relative flex items-center justify-center">
                        {agent.displayIcon ? (
                          <img
                            src={agent.displayIcon}
                            alt={agent.displayName}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition-transform duration-150 group-hover:scale-105"
                          />
                        ) : (
                          <div className="text-[10px] font-mono font-black">
                            {agent.displayName.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      
                      {/* Role indicator dot */}
                      <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: roleColor }} />

                      {/* Lineup count badge */}
                      {lineupCountOnMap > 0 && (
                        <div className="absolute bottom-1 right-1 bg-[#101823] border border-white/10 text-[7px] font-mono font-extrabold text-white px-1 py-0.2 rounded-full leading-none min-w-[12px] text-center shadow">
                          {lineupCountOnMap}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Role Filter Tabs at bottom of Left Sidebar */}
            <div className="p-2 border-t border-white/5 bg-[#161A1E]/30 shrink-0">
              <div className="grid grid-cols-2 gap-1 text-[8px] font-mono font-bold text-gray-400">
                {['All', 'Duelist', 'Sentinel', 'Controller', 'Initiator'].map(role => (
                  <button
                    key={role}
                    onClick={() => setActiveRoleFilter(role)}
                    className={`py-1.5 text-[8px] font-mono uppercase text-center transition tracking-tighter border cursor-pointer rounded ${
                      activeRoleFilter === role 
                        ? 'bg-[#FF4655]/10 border-[#FF4655] text-[#FF4655]' 
                        : 'bg-transparent border-white/5 hover:text-white hover:bg-white/5'
                    } ${role === 'All' ? 'col-span-2' : ''}`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        ) : (
          <aside className="w-[60px] bg-[#0F1215] border-r border-white/5 flex flex-col items-center py-4 justify-between shrink-0 z-10">
            
            {/* Top Panel: Drawing Tool Selector */}
            <div className="flex flex-col space-y-2.5 w-full items-center">
              
              <div className="text-[7px] font-mono text-gray-600 font-bold uppercase tracking-widest border-b border-white/5 pb-1 w-8 text-center">
                DRAW
              </div>

              {/* Select Tool */}
              <button
                onClick={() => setActiveTool('select')}
                className={`relative w-9 h-9 flex items-center justify-center transition duration-150 ${activeTool === 'select' ? 'text-white' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                title="Pointer / Reposition Objects"
              >
                {activeTool === 'select' && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-[#FF4655]" />
                )}
                <MousePointer size={15} />
              </button>

              {/* Free Draw Tool */}
              <button
                onClick={() => setActiveTool('freehand')}
                className={`relative w-9 h-9 flex items-center justify-center transition duration-150 ${activeTool === 'freehand' ? 'text-white' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                title="Pen / Freehand Sketch"
              >
                {activeTool === 'freehand' && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-[#FF4655]" />
                )}
                <PenTool size={15} />
              </button>

              {/* Straight Line Tool */}
              <button
                onClick={() => setActiveTool('line')}
                className={`relative w-9 h-9 flex items-center justify-center transition duration-150 ${activeTool === 'line' ? 'text-white' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                title="Straight Line Tool"
              >
                {activeTool === 'line' && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-[#FF4655]" />
                )}
                <span className="w-4.5 h-[3px] bg-current rounded-sm transform -rotate-45" />
              </button>

              {/* Arrow Tool */}
              <button
                onClick={() => setActiveTool('arrow')}
                className={`relative w-9 h-9 flex items-center justify-center transition duration-150 ${activeTool === 'arrow' ? 'text-white' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                title="Arrow Overlay"
              >
                {activeTool === 'arrow' && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-[#FF4655]" />
                )}
                <ArrowUpRight size={16} />
              </button>

              {/* Circle Tool */}
              <button
                onClick={() => setActiveTool('circle')}
                className={`relative w-9 h-9 flex items-center justify-center transition duration-150 ${activeTool === 'circle' ? 'text-white' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                title="Utility Area (Smokes/Poison)"
              >
                {activeTool === 'circle' && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-[#FF4655]" />
                )}
                <Circle size={15} />
              </button>

              {/* Text Annotation Tool */}
              <button
                onClick={() => setActiveTool('text')}
                className={`relative w-9 h-9 flex items-center justify-center transition duration-150 ${activeTool === 'text' ? 'text-white' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                title="Text Annotation"
              >
                {activeTool === 'text' && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-[#FF4655]" />
                )}
                <Type size={15} />
              </button>

              {/* Eraser Tool */}
              <button
                onClick={() => setActiveTool('eraser')}
                className={`relative w-9 h-9 flex items-center justify-center transition duration-150 ${activeTool === 'eraser' ? 'text-white' : 'text-gray-500 hover:text-[#FF4655] hover:bg-[#FF4655]/5'}`}
                title="Click to Erase drawings"
              >
                {activeTool === 'eraser' && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-[#FF4655]" />
                )}
                <Eraser size={15} />
              </button>
 
              {/* Stamps Menu Button */}
              <button
                onClick={() => {
                  setShowStampsMenu(!showStampsMenu);
                }}
                className={`relative w-9 h-9 flex items-center justify-center transition duration-150 ${showStampsMenu ? 'text-white bg-white/10' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                title="Tactical Stamps & Markers"
              >
                {(activeTool.startsWith('stamp-') || showStampsMenu) && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-[#00F0FF]" />
                )}
                <Grid size={15} />
              </button>

            </div>

            {/* Bottom Panel: Visual Color Palette Selector */}
            <div className="flex flex-col space-y-2 items-center w-full">
              <div className="text-[7px] font-mono text-gray-600 font-bold uppercase tracking-widest border-b border-white/5 pb-1 w-8 text-center">
                COLOR
              </div>
              
              {/* Color swatches */}
              {[
                { hex: '#FF4655', name: 'Val Red' },
                { hex: '#00F0FF', name: 'Molly Cyan' },
                { hex: '#22C55E', name: 'Mamba Green' },
                { hex: '#EAB308', name: 'Flash Gold' },
                { hex: '#FFFFFF', name: 'Base White' }
              ].map(col => (
                <button
                  key={col.hex}
                  onClick={() => setActiveColor(col.hex)}
                  className={`w-5.5 h-5.5 border transition duration-150 ${activeColor === col.hex ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                  style={{ backgroundColor: col.hex }}
                  title={col.name}
                />
              ))}
            </div>

          </aside>
        )}

        {/* MIDDLE COLUMN: Interactive Vector Map Board Canvas */}
        <main className="flex-1 min-w-0 relative h-full">
          {/* Floating Stamps & Markers Drawer */}
          {showStampsMenu && (
            <div className="absolute left-4 top-4 z-40 bg-[#0F1215]/95 border border-white/10 p-4 shadow-2xl rounded-xl w-64 backdrop-blur-md">
              <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                <span className="text-[10px] font-mono font-bold tracking-widest text-[#FF4655]">TACTICAL TOOLS //</span>
                <button 
                  onClick={() => setShowStampsMenu(false)}
                  className="text-gray-500 hover:text-white transition cursor-pointer"
                >
                  <X size={12} />
                </button>
              </div>
 
              {/* Grid Layout (matching Valoplant.gg screenshot) */}
              <div className="grid grid-cols-5 gap-2">
                {[
                  { id: 'text', name: 'Text', icon: <Type size={16} /> },
                  { id: 'stamp-pin', name: 'Location Pin', icon: <MapPin size={16} className="text-white" /> },
                  { id: 'stamp-spike', name: 'Spike', icon: (
                    <img 
                      src="https://media.valorant-api.com/gamemodes/96bd3920-4f36-d026-2b28-c683eb0bcac5/displayicon.png"
                      alt="Spike"
                      className="w-5 h-5 object-contain"
                    />
                  )},
 
                  { id: 'stamp-vision-short', name: 'Short Vision', icon: (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#00F0FF" strokeWidth="1.5">
                      <path d="M 12 20 L 4 8 A 12 12 0 0 1 20 8 Z" fill="rgba(0, 240, 255, 0.15)" />
                    </svg>
                  )},
                  { id: 'stamp-vision-long', name: 'Long Vision', icon: (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#EAB308" strokeWidth="1.5">
                      <path d="M 12 22 L 8 4 A 18 18 0 0 1 16 4 Z" fill="rgba(234, 179, 8, 0.15)" />
                    </svg>
                  )},
                  { id: 'stamp-vision-wide', name: 'Wide Vision', icon: (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#A855F7" strokeWidth="1.5">
                      <path d="M 12 20 L 4 12 A 10 10 0 0 1 20 12 Z" fill="rgba(168, 85, 247, 0.15)" />
                    </svg>
                  )},
                  { id: 'stamp-warning', name: 'Warning', icon: <AlertTriangle size={16} className="text-yellow-500" /> },
                  { id: 'stamp-flag', name: 'Flag / Waypoint', icon: <Flag size={16} className="text-red-500" /> },
 
                  { id: 'stamp-anchor', name: 'Anchor', icon: <Anchor size={16} className="text-cyan-400" /> },
                  { id: 'stamp-target', name: 'Objective', icon: <Target size={16} className="text-red-500" /> },
                  { id: 'stamp-star', name: 'Highlight Star', icon: <Star size={16} className="text-yellow-400 fill-yellow-400" /> }
                ].map(tool => {
                  const isActive = activeTool === tool.id;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => {
                        setActiveTool(tool.id as DrawingTool);
                        setShowStampsMenu(false);
                      }}
                      className={`aspect-square flex flex-col items-center justify-center p-1 cursor-pointer transition border rounded-lg active:scale-95 ${
                        isActive 
                          ? 'bg-[#FF4655]/20 border-[#FF4655] text-white shadow-[0_0_8px_rgba(255,70,85,0.25)]' 
                          : 'bg-[#161A1E] border-white/5 hover:border-white/20 text-gray-400 hover:text-white'
                      }`}
                      title={tool.name}
                    >
                      {tool.icon}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
 
          <TacticalCanvas
            map={activeMap}
            slide={slides[activeSlideIdx] || slides[0] || { id: '', name: '', objects: [] }}
            activeTool={
              activePlacementCoordType === 'agent' ? 'set-agent-pos' :
              activePlacementCoordType === 'ability' ? 'set-ability-pos' :
              activeTool
            }
            activeColor={activeColor}
            onChangeSlideObjects={handleObjectsChange}
            onAddUndoState={addUndoState}
            attackerDefenderMode={attackerDefenderMode}
            lineups={currentMapLineups}
            showLineupsOverlay={showLineupsOverlay}
            selectedLineup={selectedLineup}
            onSelectLineup={setSelectedLineup}
            hoveredLineup={hoveredLineup}
            onHoverLineup={setHoveredLineup}
            agents={agents}
            onChangeActiveTool={setActiveTool}
            weapons={weapons}
            onSetPosition={(type, coords) => {
              if (type === 'agent') {
                setUploadAgentPos(coords);
              } else {
                setUploadAbilityPos(coords);
              }
              setActivePlacementCoordType('none');
              setShowUploadModal(true);
              showNotification(`${type === 'agent' ? 'AGENT' : 'ABILITY'} POSITION SET`, 'success');
            }}
          />

          {/* DRAGGABLE TACTICAL VIDEO PLAYER HUD */}
          {selectedLineup && selectedLineup.video && (
            <div
              onMouseDown={handlePanelMouseDown}
              className="absolute bg-[#0F1215]/95 border border-[#FF4655]/40 shadow-2xl overflow-hidden flex flex-col z-30 select-none cursor-default"
              style={{
                left: `${panelPos.x}px`,
                top: `${panelPos.y}px`,
                width: '320px',
              }}
            >
              {/* Header handle */}
              <div className="panel-drag-handle px-3 py-2 bg-[#161A1E] border-b border-white/5 flex items-center justify-between cursor-move text-[9px] font-mono font-bold tracking-widest text-[#FF4655]">
                <div className="flex items-center space-x-1.5 pointer-events-none">
                  <span className="w-1.5 h-1.5 bg-[#FF4655] animate-ping rounded-full" />
                  <span>TACTICAL VIEW // {selectedLineup.agent.displayName.toUpperCase()}</span>
                </div>
                <button
                  onClick={() => setSelectedLineup(null)}
                  className="p-1 hover:bg-white/10 text-gray-400 hover:text-white transition rounded-sm cursor-pointer"
                >
                  <X size={11} />
                </button>
              </div>

              {/* Video aspect wrapper */}
              <div className="aspect-video w-full bg-black relative border-b border-white/5">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${selectedLineup.video.youtube_id}?start=${selectedLineup.video.timestamp_sec}&autoplay=1`}
                  title={selectedLineup.name}
                  className="absolute inset-0 w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>

              {/* Info & CTA Panel */}
              <div className="p-3 bg-black/40 space-y-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`px-1.5 py-0.5 font-mono text-[7px] font-bold tracking-widest uppercase border ${
                      selectedLineup.site === 'attack' ? 'bg-[#FF4655]/10 border-[#FF4655] text-[#FF4655]' : 'bg-cyan-500/10 border-[#00F0FF] text-[#00F0FF]'
                    }`}>
                      {selectedLineup.site} site
                    </span>
                    <span className="font-mono text-[8px] text-gray-500 uppercase">
                      TS: {selectedLineup.video.timestamp_sec}s
                    </span>
                  </div>
                  <h4 className="font-rajdhani font-black text-xs text-white uppercase tracking-wide leading-tight">
                    {selectedLineup.name}
                  </h4>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    onClick={() => {
                      if (selectedLineup.video) {
                        setActiveVideo({
                          youtubeId: selectedLineup.video.youtube_id,
                          start: selectedLineup.video.timestamp_sec,
                          title: selectedLineup.name
                        });
                      }
                    }}
                    className="py-1 bg-black border border-white/5 hover:border-white/25 text-[8px] font-mono font-bold tracking-wider uppercase text-gray-400 hover:text-white transition flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <Video size={9} className="text-[#FF4655]" />
                    <span>FULLSCREEN</span>
                  </button>

                  <button
                    onClick={() => {
                      applyLineupToBoard(selectedLineup);
                      showNotification('LINEUP MARKERS PLACED ON MAP', 'success');
                    }}
                    className="py-1 bg-[#FF4655] text-black hover:bg-[#FF4655]/90 text-[8px] font-mono font-bold tracking-wider uppercase transition flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <Crosshair size={9} />
                    <span>APPLY TO MAP</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* RIGHT COLUMN: Agent and Ability Selector (300px) */}
        <aside className="w-[300px] bg-[#0F1215] border-l border-white/5 flex flex-col shrink-0 z-10 select-none h-full min-h-0 overflow-hidden">
          
          {/* Section 1: Team Role / Attacker Defender Mode Switch */}
          <div className="p-3 border-b border-white/5 bg-[#161A1E]/30">
            <span className="text-[9px] font-mono text-[#FF4655] tracking-widest block font-bold mb-2">FACTION OVERLAY //</span>
            
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setAttackerDefenderMode('attacker')}
                className={`py-1.5 font-mono text-[9px] font-bold tracking-wider uppercase border transition duration-150 cursor-pointer ${attackerDefenderMode === 'attacker' ? 'bg-[#FF4655]/10 border-[#FF4655] text-[#FF4655]' : 'bg-transparent border-white/5 text-gray-500 hover:text-gray-300'}`}
              >
                ATTACKER (RED)
              </button>
              <button
                onClick={() => setAttackerDefenderMode('defender')}
                className={`py-1.5 font-mono text-[9px] font-bold tracking-wider uppercase border transition duration-150 cursor-pointer ${attackerDefenderMode === 'defender' ? 'bg-cyan-500/10 border-[#00F0FF] text-[#00F0FF]' : 'bg-transparent border-white/5 text-gray-500 hover:text-gray-300'}`}
              >
                DEFENDER (CYAN)
              </button>
            </div>
          </div>

          {/* TAB SYSTEM */}
          <div className="grid grid-cols-2 border-b border-white/5 bg-black/35 text-[9px] font-mono font-bold shrink-0">
            <button
              onClick={() => setActiveSidebarTab('roster')}
              className={`py-2 text-center transition cursor-pointer border-r border-white/5 uppercase tracking-wider ${activeSidebarTab === 'roster' ? 'text-white bg-[#161A1E]' : 'text-gray-500 hover:text-gray-300'}`}
            >
              ROSTER & UTILITIES
            </button>
            <button
              onClick={() => setActiveSidebarTab('lineups')}
              className={`py-2 text-center transition cursor-pointer uppercase tracking-wider ${activeSidebarTab === 'lineups' ? 'text-[#FF4655] bg-[#161A1E]' : 'text-gray-500 hover:text-gray-300'}`}
            >
              LINEUPS GUIDE ({currentMapLineups.length})
            </button>
          </div>

          {/* TAB CONTENTS */}
          {activeSidebarTab === 'roster' ? (
            <>
              {/* Section 2: Agent Grid Selector */}
              <div className="p-3.5 border-b border-white/5 flex-1 flex flex-col min-h-0 overflow-hidden">
                
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-mono text-[#FF4655] tracking-widest font-bold uppercase">AGENT ROSTER //</span>
                  <span className="text-[9px] font-mono text-gray-500">{filteredAgents.length} UNITS</span>
                </div>

                {/* Roles selector bar */}
                <div className="flex bg-[#161A1E] border border-white/5 p-0.5 space-x-0.5 rounded-none mb-3 text-[9px] font-mono font-bold shrink-0">
                  {['All', 'Duelist', 'Sentinel', 'Controller', 'Initiator'].map(role => (
                    <button
                      key={role}
                      onClick={() => setActiveRoleFilter(role)}
                      className={`flex-1 py-1 uppercase text-center transition cursor-pointer ${activeRoleFilter === role ? 'bg-white/5 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      {role.substring(0,4)}
                    </button>
                  ))}
                </div>

                {/* Grid display */}
                <div className="flex-1 overflow-y-auto pr-1">
                  {loadingAgents ? (
                    <div className="py-12 text-center">
                      <div className="inline-block w-5 h-5 border border-t-transparent border-[#FF4655] rounded-full animate-spin"></div>
                      <p className="mt-2 text-[9px] font-mono text-gray-500">LOADING AGENTS...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-5 gap-1.5">
                      {filteredAgents.map(agent => (
                        <div
                          key={agent.uuid}
                          draggable="true"
                          onDragStart={(e) => {
                            e.dataTransfer.setData('application/valportal', JSON.stringify({
                              type: 'agent',
                              uuid: agent.uuid,
                              displayName: agent.displayName,
                              displayIcon: agent.displayIcon
                            }));
                          }}
                          onClick={() => setSelectedAgent(agent)}
                          className={`relative aspect-square border cursor-pointer group bg-[#161A1E] overflow-hidden transition active:scale-95 ${selectedAgent?.uuid === agent.uuid ? 'border-[#FF4655]' : 'border-white/5 hover:border-white/20'}`}
                          title={`${agent.displayName} (${agent.role?.displayName || 'Unknown'}) - Drag to Map`}
                        >
                          {/* Face icon */}
                          <img 
                            src={agent.displayIcon} 
                            alt={agent.displayName}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-150"
                          />
                          
                          {/* Selected dot indicator */}
                          {selectedAgent?.uuid === agent.uuid && (
                            <div className="absolute top-0.5 right-0.5 w-1 h-1 bg-[#FF4655]" />
                          )}

                          {/* Small floating role letter in bottom corner */}
                          {agent.role && (
                            <span className="absolute bottom-0 left-0.5 text-[6px] font-mono font-bold text-gray-500">
                              {agent.role.displayName.charAt(0)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Section 3: Dynamic Selected Agent & Ability Selector */}
              <div className="p-3.5 border-b border-white/5 h-44 shrink-0 flex flex-col justify-between bg-[#161A1E]/20">
                {selectedAgent ? (
                  <div className="h-full flex flex-col justify-between">
                    <div>
                      <div className="flex items-center space-x-2 border-b border-white/5 pb-1.5 mb-2 shrink-0">
                        <img 
                          src={selectedAgent.displayIcon} 
                          alt={selectedAgent.displayName} 
                          referrerPolicy="no-referrer"
                          className="w-5 h-5 object-cover bg-black border border-white/15"
                        />
                        <div>
                          <h4 className="font-rajdhani font-black text-sm text-white uppercase leading-none">
                            {selectedAgent.displayName}
                          </h4>
                          <span className="text-[7.5px] font-mono text-[#FF4655] tracking-widest uppercase font-bold">
                            {selectedAgent.role?.displayName || 'AGENT'}
                          </span>
                        </div>
                      </div>

                      <p className="text-[10px] text-gray-400 font-sans leading-snug line-clamp-2 italic">
                        "{selectedAgent.description}"
                      </p>
                    </div>

                    {/* Abilities dragging selector row */}
                    <div>
                      <span className="text-[8px] font-mono text-gray-500 block mb-1.5 uppercase font-bold tracking-widest">
                        ABILITIES // DRAG ONTO MAP
                      </span>
                      
                      <div className="flex space-x-2">
                        {selectedAgent.abilities.map((ability, idx) => {
                          const keyMap: { [key: string]: string } = {
                            'Ability1': 'Q',
                            'Ability2': 'E',
                            'Grenade': 'C',
                            'Ultimate': 'X'
                          };
                          const keyLetter = keyMap[ability.slot] || ability.slot.substring(0, 1);

                          return (
                            <div
                              key={ability.slot}
                              draggable="true"
                              onDragStart={(e) => {
                                e.dataTransfer.setData('application/valportal', JSON.stringify({
                                  type: 'ability',
                                  agentUuid: selectedAgent.uuid,
                                  agentName: selectedAgent.displayName,
                                  abilityName: ability.displayName,
                                  slot: ability.slot,
                                  displayIcon: ability.displayIcon
                                }));
                              }}
                              className="flex-1 bg-[#161A1E] border border-white/5 hover:border-cyan-400 cursor-grab active:cursor-grabbing p-1.5 relative group flex flex-col items-center justify-center aspect-square transition"
                              title={`${ability.displayName} (${keyLetter}) - Drag onto map`}
                            >
                              {ability.displayIcon ? (
                                <img 
                                  src={ability.displayIcon} 
                                  alt={ability.displayName}
                                  referrerPolicy="no-referrer"
                                  className="w-6 h-6 object-contain filter brightness-95 group-hover:scale-105"
                                />
                              ) : (
                                <span className="text-white text-[10px] font-mono font-bold">{keyLetter}</span>
                              )}

                              <span className="absolute bottom-0 right-1 text-[7px] font-mono text-gray-500 font-bold">
                                {keyLetter}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center border border-dashed border-white/5">
                    <span className="text-[10px] font-mono text-gray-600 uppercase">Select Agent to reveal loadouts</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* LINEUPS LIST PANEL */
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-3.5 border-b border-white/5 bg-[#0F1215]">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <div className="flex items-center space-x-2">
                  <span className="text-[9px] font-mono text-[#FF4655] tracking-widest font-bold uppercase">TACTICAL LINEUPS //</span>
                  {lineupAgentFilter !== 'all' && (
                    <span className="text-[9px] font-mono text-gray-500">{currentMapLineups.length} MATCHES</span>
                  )}
                </div>
                
                {/* Upload Button */}
                <button
                  onClick={() => {
                    // Pre-fill fields if we already have selected agent
                    if (lineupAgentFilter !== 'all') {
                      setUploadAgentName(lineupAgentFilter);
                      const matchedAgent = agents.find(a => a.displayName.toLowerCase() === lineupAgentFilter.toLowerCase());
                      if (matchedAgent && matchedAgent.abilities.length > 0) {
                        setUploadAbilityName(matchedAgent.abilities[0].displayName);
                      }
                    } else if (agents.length > 0) {
                      setUploadAgentName(agents[0].displayName);
                      setUploadAbilityName(agents[0].abilities[0]?.displayName || '');
                    }
                    setShowUploadModal(true);
                  }}
                  className="px-2 py-0.5 bg-[#00F0FF]/10 hover:bg-[#00F0FF]/25 border border-[#00F0FF]/30 text-[#00F0FF] text-[8px] font-mono font-bold tracking-wider uppercase transition cursor-pointer flex items-center space-x-1 rounded"
                >
                  <span>+ UPLOAD</span>
                </button>
              </div>

              {/* FLOW - STEP 1: CHOOSE AGENT */}
              {lineupAgentFilter === 'all' ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4 border border-dashed border-white/5 bg-black/10 rounded">
                  <span className="w-1.5 h-1.5 bg-[#FF4655] animate-ping rounded-full mb-3" />
                  <span className="text-[9px] font-mono font-bold text-[#FF4655] uppercase tracking-widest block mb-1">STEP 1 // SELECT AGENT</span>
                  <p className="text-[10px] text-gray-400 font-sans leading-relaxed max-w-[200px]">
                    Select an Agent from the grid on the left panel to display custom lineups.
                  </p>
                </div>
              ) : (
                /* STEP 2: CHOOSE UTILITY & MATCHING CARDS */
                <div className="flex-1 flex flex-col min-h-0">
                  
                  {/* Selected Agent Header */}
                  <div className="mb-3 shrink-0 flex items-center justify-between bg-[#161A1E] border border-white/5 p-2">
                    <div className="flex items-center space-x-2">
                      {(() => {
                        const selAgentObj = agents.find(a => a.displayName.toLowerCase() === lineupAgentFilter.toLowerCase());
                        return (
                          <>
                            {selAgentObj?.displayIcon && (
                              <img 
                                src={selAgentObj.displayIcon} 
                                alt={lineupAgentFilter} 
                                referrerPolicy="no-referrer"
                                className="w-6 h-6 object-cover border border-white/10" 
                              />
                            )}
                            <div>
                              <span className="text-[10px] font-rajdhani font-black text-white uppercase tracking-wide">{lineupAgentFilter}</span>
                              <span className="text-[7px] font-mono text-gray-500 block uppercase">AGENT ACTIVE</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                    <button
                      onClick={() => {
                        setLineupAgentFilter('all');
                        setLineupAbilityFilter('all');
                        setSelectedLineup(null);
                        setHoveredLineup(null);
                      }}
                      className="px-2 py-0.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 text-[8px] font-mono font-bold tracking-wider text-gray-400 hover:text-white transition cursor-pointer"
                    >
                      RESET
                    </button>
                  </div>

                  {/* Persistent Utility Selection Deck (C / Q / E / X) */}
                  <div className="mb-3 shrink-0">
                    <span className="text-[8px] font-mono text-gray-500 block mb-1.5 uppercase font-bold tracking-widest">
                      SELECT ABILITY
                    </span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(() => {
                        const selectedFilterAgentObj = agents.find(a => a.displayName.toLowerCase() === lineupAgentFilter.toLowerCase());
                        const availableAbilities = selectedFilterAgentObj?.abilities || [];
                        
                        const slotsOrder = ['Grenade', 'Ability1', 'Ability2', 'Ultimate']; // C, Q, E, X
                        const roleColorMap: { [key: string]: string } = {
                          'Duelist': '#FF4655',
                          'Sentinel': '#22C55E',
                          'Controller': '#00F0FF',
                          'Initiator': '#EAB308'
                        };
                        const roleColor = roleColorMap[selectedFilterAgentObj?.role?.displayName || ''] || '#00F0FF';

                        return slotsOrder.map(slot => {
                          const ab = availableAbilities.find(a => a.slot === slot);
                          if (!ab) return null;

                          const keyMap: { [key: string]: string } = {
                            'Ability1': 'Q',
                            'Ability2': 'E',
                            'Grenade': 'C',
                            'Ultimate': 'X'
                          };
                          const keyLetter = keyMap[ab.slot] || ab.slot.substring(0, 1);
                          const isSelected = lineupAbilityFilter.toLowerCase() === ab.displayName.toLowerCase();

                          // Calculate lineups for this specific slot on the ACTIVE map
                          const lineupCount = combinedLineups.filter(l => 
                            matchesMapName(l.map, activeMap.displayName) &&
                            l.agent.displayName.toLowerCase() === lineupAgentFilter.toLowerCase() &&
                            l.ability.displayName.toLowerCase() === ab.displayName.toLowerCase()
                          ).length;

                          return (
                            <button
                              key={ab.displayName}
                              onClick={() => {
                                setLineupAbilityFilter(isSelected ? 'all' : ab.displayName);
                                setSelectedLineup(null);
                                setHoveredLineup(null);
                              }}
                              className={`bg-[#161A1E] border p-1.5 flex flex-col items-center justify-between relative cursor-pointer transition active:scale-95 text-center aspect-square rounded-lg ${
                                isSelected 
                                  ? 'bg-white/5' 
                                  : 'border-white/5 hover:border-white/20'
                              }`}
                              style={{
                                borderColor: isSelected ? roleColor : 'rgba(255,255,255,0.05)',
                                borderWidth: isSelected ? '2px' : '1px'
                              }}
                              title={`${ab.displayName} (${keyLetter})`}
                            >
                              <span className="absolute top-0.5 left-1 font-mono text-[7px] font-extrabold text-gray-500 tracking-wider">
                                {keyLetter}
                              </span>

                              {/* Tiny count badge in top-right */}
                              {lineupCount > 0 && (
                                <span className="absolute top-0.5 right-1 font-mono text-[6.5px] font-bold px-1 rounded bg-black/60 text-gray-400">
                                  {lineupCount}
                                </span>
                              )}
                              
                              <div className="w-7 h-7 flex items-center justify-center my-0.5">
                                {ab.displayIcon ? (
                                  <img 
                                    src={ab.displayIcon} 
                                    alt={ab.displayName} 
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-contain filter brightness-95" 
                                  />
                                ) : (
                                  <span className="text-white text-[10px] font-mono font-bold">{keyLetter}</span>
                                )}
                              </div>

                              <span className="text-[7px] font-mono font-bold text-gray-400 leading-none uppercase truncate w-full">
                                {ab.displayName}
                              </span>
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Refinement Filters Panel */}
                  <div className="space-y-2 mb-3 shrink-0">

                    {/* Search Bar + Bookmark Filter */}
                    <div className="flex space-x-1.5">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="SEARCH LINEUPS..."
                          value={lineupSearchQuery}
                          onChange={(e) => setLineupSearchQuery(e.target.value)}
                          className="w-full bg-[#161A1E] border border-white/5 px-2.5 py-1.5 text-[10px] font-mono text-white placeholder-gray-600 focus:outline-none focus:border-[#FF4655]/40 transition uppercase"
                        />
                        {lineupSearchQuery && (
                          <button 
                            onClick={() => setLineupSearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-[9px] font-mono font-bold"
                          >
                            CLEAR
                          </button>
                        )}
                      </div>

                      {/* Bookmark Toggle */}
                      <button
                        onClick={() => {
                          setBookmarkedOnly(!bookmarkedOnly);
                          showNotification(bookmarkedOnly ? "SHOWING ALL LINEUPS" : "FILTERED BY BOOKMARKS ONLY", "info");
                        }}
                        className={`px-3 border transition duration-150 flex items-center justify-center cursor-pointer rounded ${
                          bookmarkedOnly 
                            ? 'bg-[#00F0FF]/15 border-[#00F0FF] text-[#00F0FF]' 
                            : 'bg-[#161A1E] border-white/5 text-gray-500 hover:text-white'
                        }`}
                        title="Show Bookmarked Only"
                      >
                        <Bookmark size={13} className={bookmarkedOnly ? "fill-[#00F0FF]" : ""} />
                      </button>
                    </div>

                    {/* Site Filters */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[7px] font-mono font-bold text-gray-500 uppercase tracking-widest px-1">
                        <span>Site Target</span>
                      </div>
                      <div className="bg-black/10 border border-white/5 p-0.5">
                        <div className="grid grid-cols-5 gap-0.5">
                          {(['all', 'a', 'b', 'c', 'mid'] as const).map((site) => (
                            <button
                              key={site}
                              onClick={() => setLineupSiteFilter(site)}
                              className={`py-1 text-[7px] font-mono font-extrabold uppercase tracking-tight text-center cursor-pointer transition ${
                                lineupSiteFilter === site 
                                  ? 'bg-[#00F0FF] text-black font-black' 
                                  : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
                              }`}
                            >
                              {site.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Difficulty level filter */}
                    <div className="space-y-1">
                      <span className="text-[7px] font-mono font-bold text-gray-500 uppercase tracking-widest px-1 block">Difficulty</span>
                      <div className="grid grid-cols-4 gap-1 bg-black/10 border border-white/5 p-0.5">
                        {(['all', 'easy', 'medium', 'pro'] as const).map((level) => (
                          <button
                            key={level}
                            onClick={() => setLineupDifficultyFilter(level)}
                            className={`py-1 text-[7px] font-mono font-extrabold uppercase tracking-tight text-center cursor-pointer transition ${
                              lineupDifficultyFilter === level 
                                ? 'bg-amber-500 text-black font-black shadow-sm' 
                                : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
                            }`}
                          >
                            {level === 'all' ? 'ALL' : level === 'medium' ? 'MED' : level.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Scrollable Lineup List */}
                  <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 scrollbar-thin">
                    {lineupAgentFilter === 'all' ? (
                      <div className="py-12 text-center border border-dashed border-white/5 p-4 bg-black/10 rounded">
                        <p className="font-mono text-[10px] text-gray-400 uppercase tracking-widest font-black mb-1">
                          SELECT AN AGENT
                        </p>
                        <p className="font-mono text-[8px] text-gray-500">
                          Click any active agent on the left to see their utility and lineups.
                        </p>
                        <div className="mt-4 pt-4 border-t border-white/5">
                          <p className="font-mono text-[7px] text-gray-600 uppercase tracking-widest mb-1.5">
                            AVAILABLE AGENTS IN DATABASE:
                          </p>
                          <div className="flex flex-wrap gap-1 justify-center">
                            {['Brimstone', 'Sova', 'Viper', 'Yoru', 'KAY/O', 'Fade', 'Harbor', 'Cypher'].map(name => (
                              <span key={name} className="px-1.5 py-0.5 bg-white/5 border border-white/5 rounded text-[7.5px] font-mono text-gray-400 uppercase">
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : currentMapLineups.length === 0 ? (
                      <div className="py-12 text-center border border-dashed border-[#FF4655]/10 p-4 bg-[#FF4655]/5 rounded">
                        <p className="font-mono text-[10px] text-[#FF4655] uppercase tracking-widest font-black mb-1">
                          NO LINEUPS FOUND
                        </p>
                        <p className="font-mono text-[8px] text-gray-400">
                          {lineupAgentFilter.toUpperCase()} has no lineups on {activeMap.displayName.toUpperCase()} in the database.
                        </p>
                        <p className="font-mono text-[7.5px] text-gray-500 mt-2 leading-relaxed">
                          Note: Currently, line-up data is provided for Brimstone, Sova, Viper, Yoru, KAY/O, Fade, Harbor, and Cypher.
                        </p>
                      </div>
                    ) : (
                      <>
                        {currentMapLineups.slice(0, lineupLimit).map((lineup) => {
                          const lineupAgent = agents.find(a => a.displayName.toLowerCase() === lineup.agent.displayName.toLowerCase());
                          const lineupAbility = lineupAgent?.abilities.find(
                            ab => ab.displayName.toLowerCase() === lineup.ability.displayName.toLowerCase() ||
                                  ab.slot.toLowerCase() === 'grenade' ||
                                  ab.slot.toLowerCase() === 'ability1'
                          );
                          const isBookmarked = favoriteLineupIds.includes(lineup.id);
                          
                          return (
                            <div 
                              key={lineup.id} 
                              onMouseEnter={() => setHoveredLineup(lineup)}
                              onMouseLeave={() => setHoveredLineup(null)}
                              className={`bg-[#161A1E] border p-3 flex flex-col space-y-2.5 transition duration-150 rounded-xl ${
                                selectedLineup?.id === lineup.id 
                                  ? 'border-[#FF4655] bg-[#161A1E]/80 shadow-[0_0_12px_rgba(255,70,85,0.15)]' 
                                  : 'border-white/5 hover:border-[#FF4655]/30'
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="flex items-center space-x-1">
                                    <span className={`px-1.5 py-0.5 font-mono text-[7px] font-bold tracking-widest uppercase border rounded ${
                                      lineup.site === 'attack' ? 'bg-[#FF4655]/10 border-[#FF4655] text-[#FF4655]' : 'bg-cyan-500/10 border-[#00F0FF] text-[#00F0FF]'
                                    }`}>
                                      {lineup.site} site
                                    </span>
                                    
                                    <span className={`px-1.5 py-0.5 font-mono text-[7px] font-bold tracking-widest uppercase border rounded ${
                                      lineup.type === 'molly' ? 'bg-[#FF4655]/10 border-[#FF4655] text-[#FF4655]' :
                                      lineup.type === 'recon' ? 'bg-cyan-500/10 border-[#00F0FF] text-[#00F0FF]' :
                                      'bg-white/10 border-white/20 text-white'
                                    }`}>
                                      {lineup.type}
                                    </span>
                                  </div>

                                  {/* Bookmark Button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleFavoriteLineup(lineup.id);
                                    }}
                                    className={`p-1 rounded hover:bg-white/5 transition duration-150 cursor-pointer ${
                                      isBookmarked ? 'text-[#00F0FF]' : 'text-gray-500 hover:text-white'
                                    }`}
                                    title={isBookmarked ? "Remove Bookmark" : "Add Bookmark"}
                                  >
                                    <Bookmark size={11} className={isBookmarked ? "fill-[#00F0FF]" : ""} />
                                  </button>
                                </div>
                                
                                <h4 className="font-rajdhani font-black text-xs text-white uppercase tracking-wide leading-tight">
                                  {lineup.name}
                                </h4>
                              </div>
                              
                              <div className="flex items-center space-x-3 bg-black/25 p-2 border border-white/5 rounded-lg">
                                <div className="flex items-center space-x-1.5">
                                  <img 
                                    src={lineupAgent?.displayIcon || `https://media.valorant-api.com/agents/${lineupAgent?.uuid}/displayicon.png`} 
                                    alt={lineup.agent.displayName}
                                    referrerPolicy="no-referrer"
                                    className="w-5 h-5 bg-black border border-white/10 object-cover rounded-full"
                                  />
                                  <span className="font-mono text-[8px] text-gray-300 font-bold uppercase">{lineup.agent.displayName}</span>
                                </div>
                                
                                <div className="h-4 w-[1px] bg-white/5" />
                                
                                <div className="flex items-center space-x-1.5">
                                  {lineupAbility?.displayIcon ? (
                                    <img 
                                      src={lineupAbility.displayIcon} 
                                      alt={lineup.ability.displayName}
                                      referrerPolicy="no-referrer"
                                      className="w-5 h-5 bg-black border border-white/10 object-cover"
                                    />
                                  ) : (
                                    <div className="w-5 h-5 bg-black border border-white/10 flex items-center justify-center text-[7px] font-mono text-gray-500 font-bold">
                                      G
                                    </div>
                                  )}
                                  <span className="font-mono text-[8px] text-gray-400 uppercase">{lineup.ability.displayName}</span>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2 pt-1">
                                {lineup.video && (
                                  <button
                                    onClick={() => {
                                      setSelectedLineup(lineup);
                                      if (lineup.video) {
                                        setActiveVideo({
                                          youtubeId: lineup.video.youtube_id,
                                          start: lineup.video.timestamp_sec,
                                          title: lineup.name
                                        });
                                      }
                                    }}
                                    className="py-1.5 bg-black border border-white/5 hover:border-white/25 hover:bg-white/5 text-[8.5px] font-mono font-bold tracking-wider uppercase text-gray-400 hover:text-white transition flex items-center justify-center space-x-1 cursor-pointer rounded-lg"
                                  >
                                    <Video size={10} className="text-[#FF4655]" />
                                    <span>PREVIEW VIDEO</span>
                                  </button>
                                )}
                                
                                <button
                                  onClick={() => {
                                    applyLineupToBoard(lineup);
                                    showNotification('LINEUP MARKERS PLACED ON MAP', 'success');
                                  }}
                                  className="py-1.5 bg-[#FF4655] text-black hover:bg-[#FF4655]/90 text-[8.5px] font-mono font-bold tracking-wider uppercase transition flex items-center justify-center space-x-1 cursor-pointer"
                                >
                                  <Crosshair size={10} />
                                  <span>APPLY TO MAP</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        
                        {currentMapLineups.length > lineupLimit && (
                          <button
                            onClick={() => setLineupLimit(prev => prev + 30)}
                            className="w-full py-2.5 bg-[#161A1E] hover:bg-white/5 border border-white/5 hover:border-white/15 text-[8.5px] font-mono font-bold tracking-wider uppercase text-gray-400 hover:text-white transition cursor-pointer text-center"
                          >
                            LOAD MORE (+{currentMapLineups.length - lineupLimit} REMAINING)
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 4: Tactical Tactic Notes Panel (Monospace terminal style) */}
          <div className="p-3.5 flex flex-col h-44 shrink-0 bg-black/40">
            <span className="text-[9px] font-mono text-[#FF4655] tracking-widest font-bold uppercase block mb-1.5">
              STRATEGY NOTES //
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="flex-1 bg-[#0B0E11] text-[#00F0FF] border border-white/5 focus:border-[#FF4655] focus:outline-none p-2 font-mono text-[10.5px] leading-relaxed resize-none rounded-none placeholder-gray-700"
              placeholder="ANNOTATIONS, EXECUTE DETAILS, AND DEFUSE DIRECTIVES..."
            />
          </div>

        </aside>

      </div>

      {/* VIDEO LIGHTBOX LIGHTWEIGHT EMBED */}
      {activeVideo && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0F1215] border border-[#FF4655]/40 w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-3 bg-[#161A1E] border-b border-white/5 flex items-center justify-between">
              <span className="font-mono text-xs font-bold tracking-widest text-[#FF4655]">VIDEO REFERENCE //</span>
              <button 
                onClick={() => setActiveVideo(null)}
                className="p-1 hover:bg-white/5 text-gray-400 hover:text-white transition cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
            
            <div className="aspect-video w-full bg-black relative">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${activeVideo.youtubeId}?start=${activeVideo.start}&autoplay=1`}
                title={activeVideo.title}
                className="absolute inset-0 w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            
            <div className="p-4 bg-black/40">
              <h4 className="font-rajdhani text-sm font-bold tracking-wide text-white uppercase">{activeVideo.title}</h4>
              <p className="font-mono text-[10px] text-gray-500 mt-1 uppercase">TIMESTAMP: {activeVideo.start} SECONDS // PRESS CLOSE TO RETURN</p>
            </div>
          </div>
        </div>
      )}
 
      {/* 12. UPLOAD LINEUP MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-[#07090b]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0F1215] border border-white/10 p-5 rounded-2xl shadow-2xl space-y-4 font-sans text-left relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#FF4655] via-[#EAB308] to-[#00F0FF]" />
            
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-rajdhani font-black text-lg text-white uppercase tracking-wider">UPLOAD CUSTOM LINEUP</h3>
                <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest block">CONTRIBUTE A NEW SETUP FOR {activeMap.displayName.toUpperCase()}</span>
              </div>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="p-1 hover:bg-white/5 border border-transparent hover:border-white/5 text-gray-400 hover:text-white transition rounded cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <div className="space-y-3.5 max-h-[70vh] overflow-y-auto pr-1 scrollbar-thin">
              {/* Lineup Name */}
              <div className="space-y-1">
                <label className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-widest block">Lineup Name</label>
                <input 
                  type="text"
                  placeholder="e.g. A SITE DEFAULT MOLLY FROM A MAIN"
                  value={uploadLineupName}
                  onChange={(e) => setUploadLineupName(e.target.value)}
                  className="w-full bg-[#161A1E] border border-white/5 px-3 py-2 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-[#FF4655]/40 transition uppercase rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Agent Select */}
                <div className="space-y-1">
                  <label className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-widest block">Agent</label>
                  <select
                    value={uploadAgentName}
                    onChange={(e) => {
                      setUploadAgentName(e.target.value);
                      const matched = agents.find(a => a.displayName === e.target.value);
                      if (matched && matched.abilities.length > 0) {
                        setUploadAbilityName(matched.abilities[0].displayName);
                      }
                    }}
                    className="w-full bg-[#161A1E] border border-white/5 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#FF4655]/40 transition rounded-lg cursor-pointer"
                  >
                    {agents.map(agent => (
                      <option key={agent.uuid} value={agent.displayName}>{agent.displayName.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                {/* Ability Select */}
                <div className="space-y-1">
                  <label className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-widest block">Ability</label>
                  <select
                    value={uploadAbilityName}
                    onChange={(e) => setUploadAbilityName(e.target.value)}
                    className="w-full bg-[#161A1E] border border-white/5 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#FF4655]/40 transition rounded-lg cursor-pointer"
                  >
                    {(() => {
                      const selAgent = agents.find(a => a.displayName === uploadAgentName) || agents[0];
                      const abils = selAgent?.abilities || [];
                      return abils.map(ab => (
                        <option key={ab.displayName} value={ab.displayName}>{ab.displayName.toUpperCase()}</option>
                      ));
                    })()}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Type */}
                <div className="space-y-1">
                  <label className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-widest block">Lineup Type</label>
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value as any)}
                    className="w-full bg-[#161A1E] border border-white/5 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#FF4655]/40 transition rounded-lg cursor-pointer"
                  >
                    <option value="smoke">SMOKE</option>
                    <option value="molly">MOLLY</option>
                    <option value="flash">FLASH</option>
                    <option value="recon">RECON</option>
                    <option value="setup">SETUP</option>
                  </select>
                </div>

                {/* Side */}
                <div className="space-y-1">
                  <label className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-widest block">Side</label>
                  <select
                    value={uploadSite}
                    onChange={(e) => setUploadSite(e.target.value as any)}
                    className="w-full bg-[#161A1E] border border-white/5 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#FF4655]/40 transition rounded-lg cursor-pointer"
                  >
                    <option value="attack">ATTACKING</option>
                    <option value="defense">DEFENDING</option>
                  </select>
                </div>

                {/* Difficulty */}
                <div className="space-y-1">
                  <label className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-widest block">Difficulty</label>
                  <select
                    value={uploadDifficulty}
                    onChange={(e) => setUploadDifficulty(e.target.value as any)}
                    className="w-full bg-[#161A1E] border border-white/5 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#FF4655]/40 transition rounded-lg cursor-pointer"
                  >
                    <option value="easy">EASY</option>
                    <option value="medium">MEDIUM</option>
                    <option value="pro">PRO</option>
                  </select>
                </div>
              </div>

              {/* YouTube Video URL */}
              <div className="space-y-1">
                <label className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-widest block">YouTube Video URL (Optional)</label>
                <input 
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={uploadYoutubeId}
                  onChange={(e) => setUploadYoutubeId(e.target.value)}
                  className="w-full bg-[#161A1E] border border-white/5 px-3 py-2 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-[#FF4655]/40 transition rounded-lg"
                />
              </div>

              {/* Coordinates Picker Section */}
              <div className="border border-white/5 bg-black/15 p-3 space-y-3 rounded-xl mt-1">
                <div className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-widest border-b border-white/5 pb-1">MAP COORDINATES</div>
                
                <div className="grid grid-cols-2 gap-3">
                  {/* Agent Thrower Position */}
                  <div className="space-y-1.5 text-center">
                    <span className="text-[8px] font-mono text-gray-500 uppercase block">AGENT THROWER</span>
                    <button
                      onClick={() => {
                        setShowUploadModal(false);
                        setActivePlacementCoordType('agent');
                      }}
                      className={`w-full py-2 border text-[10px] font-mono font-bold uppercase transition cursor-pointer rounded-lg flex items-center justify-center space-x-1.5 ${
                        uploadAgentPos 
                          ? 'bg-green-500/10 border-green-500 text-green-400 hover:bg-green-500/20' 
                          : 'bg-[#FF4655]/5 border-[#FF4655]/20 hover:border-[#FF4655]/60 text-[#FF4655]'
                      }`}
                    >
                      <Crosshair size={11} />
                      <span>{uploadAgentPos ? 'RE-SET POSITION' : 'SET POSITION'}</span>
                    </button>
                    {uploadAgentPos ? (
                      <span className="text-[7.5px] font-mono text-green-500/80 block">
                        X: {uploadAgentPos.x.toFixed(3)} | Y: {uploadAgentPos.y.toFixed(3)}
                      </span>
                    ) : (
                      <span className="text-[7.5px] font-mono text-red-400/80 block">REQUIRED</span>
                    )}
                  </div>

                  {/* Ability Target Position */}
                  <div className="space-y-1.5 text-center">
                    <span className="text-[8px] font-mono text-gray-500 uppercase block">ABILITY LANDING</span>
                    <button
                      onClick={() => {
                        setShowUploadModal(false);
                        setActivePlacementCoordType('ability');
                      }}
                      className={`w-full py-2 border text-[10px] font-mono font-bold uppercase transition cursor-pointer rounded-lg flex items-center justify-center space-x-1.5 ${
                        uploadAbilityPos 
                          ? 'bg-green-500/10 border-green-500 text-green-400 hover:bg-green-500/20' 
                          : 'bg-[#FF4655]/5 border-[#FF4655]/20 hover:border-[#FF4655]/60 text-[#FF4655]'
                      }`}
                    >
                      <Crosshair size={11} />
                      <span>{uploadAbilityPos ? 'RE-SET POSITION' : 'SET POSITION'}</span>
                    </button>
                    {uploadAbilityPos ? (
                      <span className="text-[7.5px] font-mono text-green-500/80 block">
                        X: {uploadAbilityPos.x.toFixed(3)} | Y: {uploadAbilityPos.y.toFixed(3)}
                      </span>
                    ) : (
                      <span className="text-[7.5px] font-mono text-red-400/80 block">REQUIRED</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer / Save Actions */}
            <div className="flex items-center justify-end space-x-2 pt-2.5 border-t border-white/5 shrink-0">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 border border-white/5 bg-[#161A1E] text-gray-400 hover:text-white hover:bg-white/5 text-[10px] font-mono font-bold uppercase transition cursor-pointer rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUploadLineup}
                className="px-4 py-2 bg-gradient-to-r from-[#FF4655] to-[#FF4655]/80 hover:from-[#FF4655]/90 hover:to-[#FF4655]/70 text-white text-[10px] font-mono font-bold uppercase transition shadow-lg cursor-pointer rounded-lg"
              >
                Save Lineup
              </button>
            </div>
          </div>
        </div>
      )}
 
      {/* Floating coordinates indicator banner */}
      {activePlacementCoordType !== 'none' && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0F1215]/95 border border-[#00F0FF]/30 p-4 shadow-2xl flex items-center space-x-4 backdrop-blur font-mono text-xs">
          <span className="w-2.5 h-2.5 bg-[#00F0FF] rounded-full animate-ping" />
          <span className="text-white uppercase font-bold tracking-widest">
            {activePlacementCoordType === 'agent' 
              ? 'CLICK ON THE MAP TO SET THROWER (AGENT) POSITION' 
              : 'CLICK ON THE MAP TO SET TARGET (ABILITY) POSITION'}
          </span>
          <button
            onClick={() => {
              setActivePlacementCoordType('none');
              setShowUploadModal(true);
            }}
            className="px-2.5 py-1 bg-[#FF4655]/20 hover:bg-[#FF4655]/30 border border-[#FF4655]/40 text-[#FF4655] text-[10px] font-bold uppercase transition rounded"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-[#0F1215] border-t-2 border-[#FF4655] border-x border-b border-zinc-800 p-6 shadow-2xl relative">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-[#FF4655]/10 p-2 border border-[#FF4655]/30">
                <AlertTriangle className="text-[#FF4655]" size={20} />
              </div>
              <h3 className="font-rajdhani font-bold text-base uppercase tracking-widest text-white">
                {confirmDialog.title}
              </h3>
            </div>
            
            <p className="text-[11px] font-mono text-gray-300 leading-relaxed uppercase tracking-wider mb-6">
              {confirmDialog.message}
            </p>
            
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 font-mono text-[9px] tracking-widest uppercase transition-all duration-150 cursor-pointer"
              >
                CANCEL
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 bg-[#FF4655] text-white hover:bg-[#ff5865] font-mono text-[9px] tracking-widest uppercase font-bold transition-all duration-150 cursor-pointer"
              >
                CONFIRM
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
