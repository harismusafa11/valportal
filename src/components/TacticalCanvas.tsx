/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  DrawingTool, 
  TacticalObject, 
  Point, 
  ValorantMap, 
  TacticSlide, 
  AgentObject, 
  AbilityObject,
  StampObject,
  FreehandObject,
  LineObject,
  ArrowObject,
  CircleObject,
  TextObject,
  Lineup,
  ValorantAgent
} from '../types';
import { ZoomIn, ZoomOut, Maximize2, Trash2, ArrowUpRight, Circle, PenTool, Type, HelpCircle, Move, Edit3, RotateCcw, RotateCw, Minus, Plus } from 'lucide-react';

const MAP_ATTACKER_DEFENDER_IMAGES: Record<string, { attacker: string; defender: string }> = {
  abyss: {
    attacker: 'https://resources.strats.gg/images/a1cfbd37-78bb-4db3-b21a-8cff2b97bcc1.svg',
    defender: 'https://resources.strats.gg/images/9301e350-44fd-4313-ab70-02bc03ba74b8.svg'
  },
  ascent: {
    attacker: 'https://resources.strats.gg/images/3f3c6eb7-160c-4183-b41d-84e1dc7ce61b.svg',
    defender: 'https://s3-us-east-2.amazonaws.com/strats-gg/images/497dcbf5-982c-412e-aa68-41c62b8d83d0.svg'
  },
  bind: {
    attacker: 'https://s3-us-east-2.amazonaws.com/strats-gg/images/5bae4d50-d938-44c4-982d-be4e96bd46dc.svg',
    defender: 'https://s3-us-east-2.amazonaws.com/strats-gg/images/4b55782b-4988-401b-896e-09a9c6e69c11.svg'
  },
  breeze: {
    attacker: 'https://resources.strats.gg/images/8ed37e0d-1347-4be6-8b95-bca8d26a7529.svg',
    defender: 'https://resources.strats.gg/images/eaea0b81-339b-4bf6-bd6b-edd143d59053.svg'
  },
  corrode: {
    attacker: 'https://resources.strats.gg/images/cfc62a9d-a99f-4dff-8660-8f98623b7c36.svg',
    defender: 'https://resources.strats.gg/images/b3355ffb-ed35-4eb0-bec4-f969bcc0f943.svg'
  },
  fracture: {
    attacker: 'https://s3-us-east-2.amazonaws.com/strats-gg/images/02cbd304-39ea-4a69-981a-ef637792f940.svg',
    defender: 'https://s3-us-east-2.amazonaws.com/strats-gg/images/617f3e3a-6e6e-4667-a18f-95198ad33dbc.svg'
  },
  haven: {
    attacker: 'https://resources.strats.gg/images/faa88fff-e48c-4ed9-8717-ec74efcf41df.svg',
    defender: 'https://s3-us-east-2.amazonaws.com/strats-gg/images/4f7c050f-6268-4cdc-9275-0e5430fe6886.svg'
  },
  icebox: {
    attacker: 'https://resources.strats.gg/images/9392c124-2f1a-4f6a-aa61-430cabef755b.svg',
    defender: 'https://resources.strats.gg/images/64950889-db94-464d-bda5-55a5b5303642.svg'
  },
  lotus: {
    attacker: 'https://resources.strats.gg/images/1611d847-964a-476a-b215-f73130103e13.svg',
    defender: 'https://resources.strats.gg/images/4a2824ab-b325-458d-8a9c-3e0f0ae8930e.svg'
  },
  pearl: {
    attacker: 'https://resources.strats.gg/images/22c22ed2-6af8-4787-8c12-f780959be1c8.svg',
    defender: 'https://resources.strats.gg/images/61c47130-e0d2-4136-aef5-f2f3faee53be.svg'
  },
  split: {
    attacker: 'https://s3-us-east-2.amazonaws.com/strats-gg/images/0d76f194-54ad-41ce-930b-dfc46982792f.svg',
    defender: 'https://s3-us-east-2.amazonaws.com/strats-gg/images/78b2b831-f610-41d7-9a57-3efa7b6aee4f.svg'
  },
  summit: {
    attacker: 'https://resources.strats.gg/images/f7e1eed5-c208-4a14-bbf6-92138ae8e7c8.svg',
    defender: 'https://resources.strats.gg/images/29612070-8b31-4449-95d4-0b5b0de5e1d4.svg'
  },
  sunset: {
    attacker: 'https://resources.strats.gg/images/9d92143f-4f74-4e66-b4a1-b64b5806d837.svg',
    defender: 'https://resources.strats.gg/images/e788b340-0c6a-4139-91a7-343c3bd5379a.svg'
  }
};

interface TacticalCanvasProps {
  map: ValorantMap;
  slide: TacticSlide;
  activeTool: DrawingTool;
  activeColor: string;
  onChangeSlideObjects: (objects: TacticalObject[]) => void;
  onAddUndoState: () => void;
  attackerDefenderMode: 'attacker' | 'defender';
  lineups?: Lineup[];
  showLineupsOverlay?: boolean;
  selectedLineup?: Lineup | null;
  onSelectLineup?: (lineup: Lineup | null) => void;
  hoveredLineup?: Lineup | null;
  onHoverLineup?: (lineup: Lineup | null) => void;
  agents?: ValorantAgent[];
  onChangeActiveTool?: (tool: DrawingTool) => void;
  onSetPosition?: (type: 'agent' | 'ability', coords: Point) => void;
  weapons?: any[];
}
 
export default function TacticalCanvas({
  map,
  slide,
  activeTool,
  activeColor,
  onChangeSlideObjects,
  onAddUndoState,
  attackerDefenderMode,
  lineups = [],
  showLineupsOverlay = true,
  selectedLineup = null,
  onSelectLineup,
  hoveredLineup = null,
  onHoverLineup,
  agents = [],
  onChangeActiveTool,
  onSetPosition,
  weapons = []
}: TacticalCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastTouchDistanceRef = useRef<number | null>(null);
  const touchStartZoomRef = useRef<number>(1);
  const touchStartPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const mapNameLower = map.displayName.toLowerCase();
  const mapImageUrl = MAP_ATTACKER_DEFENDER_IMAGES[mapNameLower]
    ? MAP_ATTACKER_DEFENDER_IMAGES[mapNameLower][attackerDefenderMode]
    : map.displayIcon || map.splash;

  // Viewport zoom & pan
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });
  
  // Spacebar panning state
  const [spacePressed, setSpacePressed] = useState<boolean>(false);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawingStart, setDrawingStart] = useState<Point>({ x: 0, y: 0 });
  const [activeTempPoints, setActiveTempPoints] = useState<Point[]>([]);
  const [tempEnd, setTempEnd] = useState<Point | null>(null);

  // Selection & dragging state
  const [draggedObjectId, setDraggedObjectId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

  // Text tool inline typing state
  const [textInputPos, setTextInputPos] = useState<Point | null>(null);
  const [typingText, setTypingText] = useState<string>('');

  // Right-click agent weapons context menu state
  const [agentContextMenu, setAgentContextMenu] = useState<{ agentId: string; x: number; y: number } | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Close context menu on outside clicks
  useEffect(() => {
    const handleOutsideClick = () => {
      setAgentContextMenu(null);
      setActiveCategory(null);
    };
    window.addEventListener('click', handleOutsideClick);
    window.addEventListener('mousedown', handleOutsideClick);
    return () => {
      window.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  // Helper to compute offsetted coordinates for lineups to prevent perfect overlaps
  const getLineupCoords = (lineup: Lineup, index: number): { agentX: number; agentY: number; abilityX: number; abilityY: number } => {
    let offsetX = 0;
    let offsetY = 0;
    
    // Check if there are other lineups before this one in the list with very close coordinates
    const duplicates = lineups.slice(0, index).filter(other => {
      const dxAgent = Math.abs(other.agent_position_norm.x - lineup.agent_position_norm.x);
      const dyAgent = Math.abs(other.agent_position_norm.y - lineup.agent_position_norm.y);
      const dxAbility = Math.abs(other.ability_position_norm.x - lineup.ability_position_norm.x);
      const dyAbility = Math.abs(other.ability_position_norm.y - lineup.ability_position_norm.y);
      return (dxAgent < 0.003 && dyAgent < 0.003) || (dxAbility < 0.003 && dyAbility < 0.003);
    });

    if (duplicates.length > 0) {
      const angle = (duplicates.length * 0.9) % (Math.PI * 2);
      const distance = 14 * Math.ceil(duplicates.length / 8); // subtle pixel displacement
      offsetX = Math.cos(angle) * distance;
      offsetY = Math.sin(angle) * distance;
    }

    return {
      agentX: 50 + lineup.agent_position_norm.x * 900 + offsetX,
      agentY: 50 + lineup.agent_position_norm.y * 900 + offsetY,
      abilityX: 50 + lineup.ability_position_norm.x * 900 + offsetX,
      abilityY: 50 + lineup.ability_position_norm.y * 900 + offsetY
    };
  };

  // Handle Spacebar event for panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setSpacePressed(true);
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedObjectId && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          handleDeleteSelected();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedObjectId, slide.objects]);

  // Dynamically fit and center the 1000x1000 map workspace within the viewport container
  useEffect(() => {
    if (!containerRef.current) return;
 
    const handleResize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const containerW = rect.width;
      const containerH = rect.height;
      if (containerW > 0 && containerH > 0) {
        const fitScale = Math.min(containerW / 1000, containerH / 1000) * 0.95;
        setZoom(fitScale);
        setPan({
          x: (containerW - 1000 * fitScale) / 2,
          y: (containerH - 1000 * fitScale) / 2
        });
      }
    };
 
    handleResize();
 
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(containerRef.current);
 
    return () => {
      resizeObserver.disconnect();
    };
  }, [map, attackerDefenderMode]);

  // Reset zoom & pan when map changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedObjectId(null);
  }, [map, attackerDefenderMode]);

  // Convert client mouse screen coordinate to relative SVG coordinate (accounting for Zoom and Pan)
  const getSVGCoords = (clientX: number, clientY: number): Point => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const relativeY = clientY - rect.top;
    
    // Reverse the pan and zoom transform
    return {
      x: (relativeX - pan.x) / zoom,
      y: (relativeY - pan.y) / zoom
    };
  };

  // Zoom on Scroll
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const zoomFactor = 1.05;
    const newZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor;
    
    // Restrict zoom limits
    if (newZoom < 0.5 || newZoom > 5) return;

    // Adjust pan to zoom relative to mouse pointer position
    const rect = svgRef.current!.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const svgMouseX = (mouseX - pan.x) / zoom;
    const svgMouseY = (mouseY - pan.y) / zoom;

    const newPanX = mouseX - svgMouseX * newZoom;
    const newPanY = mouseY - svgMouseY * newZoom;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  // Mouse Down
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    // If middle click OR space pressed OR pointer in panning mode (or selection tool clicked on blank space)
    const isPanningActive = spacePressed || e.button === 1 || activeTool === 'select' && e.target === svgRef.current;
    
    if (isPanningActive) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (e.button !== 0) return; // Only allow left clicks

    const coords = getSVGCoords(e.clientX, e.clientY);

    // Coordinate Placement Mode for user uploading lineups
    if (activeTool === 'set-agent-pos' || activeTool === 'set-ability-pos') {
      const normCoords = {
        x: coords.x / 1000,
        y: coords.y / 1000
      };
      if (onSetPosition) {
        onSetPosition(activeTool === 'set-agent-pos' ? 'agent' : 'ability', normCoords);
      }
      if (onChangeActiveTool) {
        onChangeActiveTool('select');
      }
      return;
    }

    // Typing field open? Commit it
    if (textInputPos) {
      commitText();
      return;
    }

    // 1. SELECT TOOL
    if (activeTool === 'select') {
      // Checked if clicked on an object
      const target = e.target as SVGElement;
      const objId = target.getAttribute('data-obj-id');
      if (objId) {
        setSelectedObjectId(objId);
        const obj = slide.objects.find(o => o.id === objId);
        if (obj) {
          if (obj.type === 'agent' && (obj as AgentObject).isLocked) {
            return;
          }
          setDraggedObjectId(objId);
          setDragOffset(coords);
        }
      } else {
        setSelectedObjectId(null);
      }
      return;
    }

    // 1.5 STAMP TOOL PLACEMENT
    if (activeTool.startsWith('stamp-')) {
      onAddUndoState();
      const stampType = activeTool.replace('stamp-', '') as StampObject['stampType'];
      const id = `placed_stamp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const stampObj: StampObject = {
        id,
        type: 'stamp',
        stampType,
        position: coords,
        size: stampType === 'vision-long' ? 120 : stampType === 'vision-short' ? 80 : stampType === 'vision-wide' ? 60 : 30,
        color: activeColor
      };
      onChangeSlideObjects([...slide.objects, stampObj]);
      setSelectedObjectId(id);

      // Auto-switch back to select tool so it doesn't duplicate and lets user drag immediately
      if (onChangeActiveTool) {
        onChangeActiveTool('select');
      }
      return;
    }

    // 2. ERASER TOOL
    if (activeTool === 'eraser') {
      const target = e.target as SVGElement;
      const objId = target.getAttribute('data-obj-id');
      if (objId) {
        onAddUndoState();
        onChangeSlideObjects(slide.objects.filter(o => o.id !== objId));
        if (selectedObjectId === objId) setSelectedObjectId(null);
      }
      return;
    }

    // 3. TEXT TOOL
    if (activeTool === 'text') {
      onAddUndoState();
      setTextInputPos(coords);
      setTypingText('');
      // Wait for next render to focus input
      setTimeout(() => {
        const input = document.getElementById('canvas-text-input');
        if (input) input.focus();
      }, 50);
      return;
    }

    // 4. VECTOR DRAWING TOOLS
    onAddUndoState();
    setIsDrawing(true);
    setDrawingStart(coords);

    if (activeTool === 'freehand') {
      setActiveTempPoints([coords]);
    } else {
      setTempEnd(coords);
    }
  };

  // Mouse Move
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    // 1. PANNING ACTION
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    const coords = getSVGCoords(e.clientX, e.clientY);

    // 2. DRAGGING PLACED OBJECT (AGENT / ABILITY / TEXT / STAMP / CIRCLE / LINE / ARROW / FREEHAND)
    if (draggedObjectId) {
      const dx = coords.x - dragOffset.x;
      const dy = coords.y - dragOffset.y;
      if (dx !== 0 || dy !== 0) {
        const updatedObjects = slide.objects.map(obj => {
          if (obj.id === draggedObjectId) {
            if (obj.type === 'agent' || obj.type === 'ability' || obj.type === 'text' || obj.type === 'stamp') {
              return {
                ...obj,
                position: {
                  x: obj.position.x + dx,
                  y: obj.position.y + dy
                }
              };
            } else if (obj.type === 'circle') {
              return {
                ...obj,
                center: {
                  x: (obj as CircleObject).center.x + dx,
                  y: (obj as CircleObject).center.y + dy
                }
              };
            } else if (obj.type === 'line' || obj.type === 'arrow') {
              return {
                ...obj,
                start: {
                  x: (obj as LineObject).start.x + dx,
                  y: (obj as LineObject).start.y + dy
                },
                end: {
                  x: (obj as LineObject).end.x + dx,
                  y: (obj as LineObject).end.y + dy
                }
              };
            } else if (obj.type === 'freehand') {
              return {
                ...obj,
                points: (obj as FreehandObject).points.map(p => ({
                  x: p.x + dx,
                  y: p.y + dy
                }))
              };
            }
          }
          return obj;
        });
        onChangeSlideObjects(updatedObjects);
        setDragOffset(coords);
      }
      return;
    }

    // 3. DRAWING IN PROGRESS
    if (isDrawing) {
      if (activeTool === 'freehand') {
        setActiveTempPoints(prev => [...prev, coords]);
      } else {
        setTempEnd(coords);
      }
    }
  };
  
  // Touch Event simulations to support drawing, dragging, and pinch-to-zoom on touch screens
  const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 2) {
      // Cancel active mouse/draw actions
      setIsDrawing(false);
      setIsPanning(false);
      setDraggedObjectId(null);

      // Initialize pinch tracking variables
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const distance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      lastTouchDistanceRef.current = distance;
      touchStartZoomRef.current = zoom;
      touchStartPanRef.current = { ...pan };
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      
      // Simulate a mouse down event
      const simulatedEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        button: 0,
        preventDefault: () => {},
        stopPropagation: () => {},
        target: e.target
      } as unknown as React.MouseEvent<SVGSVGElement>;
      
      handleMouseDown(simulatedEvent);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 2 && lastTouchDistanceRef.current !== null) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDistance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      
      if (currentDistance > 0) {
        const ratio = currentDistance / lastTouchDistanceRef.current;
        let newZoom = touchStartZoomRef.current * ratio;
        
        // Restrict zoom limits (0.3 to 8)
        if (newZoom < 0.3) newZoom = 0.3;
        if (newZoom > 8) newZoom = 8;
        
        // Find screen coordinates midpoint relative to SVG container bounding client rect
        const rect = svgRef.current!.getBoundingClientRect();
        const midX = ((t1.clientX + t2.clientX) / 2) - rect.left;
        const midY = ((t1.clientY + t2.clientY) / 2) - rect.top;
        
        // Calculate original relative coordinates of the midpoint before this zoom step
        const svgMidX = (midX - touchStartPanRef.current.x) / touchStartZoomRef.current;
        const svgMidY = (midY - touchStartPanRef.current.y) / touchStartZoomRef.current;
        
        // Calculate new pan to keep the midpoint at the same screen coordinates
        const newPanX = midX - svgMidX * newZoom;
        const newPanY = midY - svgMidY * newZoom;
        
        setZoom(newZoom);
        setPan({ x: newPanX, y: newPanY });
      }
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      
      const simulatedEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        preventDefault: () => {},
        stopPropagation: () => {},
        target: e.target
      } as unknown as React.MouseEvent<SVGSVGElement>;
      
      handleMouseMove(simulatedEvent);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<SVGSVGElement>) => {
    lastTouchDistanceRef.current = null;
    
    if (e.touches.length === 0 && e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      
      const simulatedEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        preventDefault: () => {},
        stopPropagation: () => {},
        target: e.target
      } as unknown as React.MouseEvent<SVGSVGElement>;
      
      handleMouseUp(simulatedEvent);
    }
  };

  // Mouse Up
  const handleMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (draggedObjectId) {
      setDraggedObjectId(null);
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);

    const coords = getSVGCoords(e.clientX, e.clientY);
    const id = `draw_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    let newObj: TacticalObject | null = null;

    if (activeTool === 'freehand' && activeTempPoints.length > 1) {
      const freehandObj: FreehandObject = {
        id,
        type: 'freehand',
        color: activeColor,
        points: activeTempPoints,
        strokeWidth: 4
      };
      newObj = freehandObj;
    } else if (activeTool === 'line') {
      const lineObj: LineObject = {
        id,
        type: 'line',
        color: activeColor,
        start: drawingStart,
        end: coords,
        strokeWidth: 4
      };
      newObj = lineObj;
    } else if (activeTool === 'arrow') {
      const arrowObj: ArrowObject = {
        id,
        type: 'arrow',
        color: activeColor,
        start: drawingStart,
        end: coords,
        strokeWidth: 4
      };
      newObj = arrowObj;
    } else if (activeTool === 'circle') {
      const dx = coords.x - drawingStart.x;
      const dy = coords.y - drawingStart.y;
      const radius = Math.sqrt(dx * dx + dy * dy);
      if (radius > 5) {
        const circleObj: CircleObject = {
          id,
          type: 'circle',
          color: activeColor,
          center: drawingStart,
          radius,
          strokeWidth: 3,
          fillType: activeColor === '#FFFFFF' ? 'outline' : 'filled'
        };
        newObj = circleObj;
      }
    }

    if (newObj) {
      onChangeSlideObjects([...slide.objects, newObj]);
    }

    // Reset temporary builders
    setActiveTempPoints([]);
    setTempEnd(null);
  };

  // Commit text typed in input field
  const commitText = () => {
    if (!textInputPos) return;
    
    const trimmed = typingText.trim();
    if (trimmed.length > 0) {
      const id = `text_${Date.now()}`;
      const textObj: TextObject = {
        id,
        type: 'text',
        color: activeColor,
        position: textInputPos,
        text: trimmed,
        fontSize: 16
      };
      onChangeSlideObjects([...slide.objects, textObj]);
    }

    setTextInputPos(null);
    setTypingText('');
  };

  // Drag & Drop Agent/Ability from panel
  const handleDragOver = (e: React.DragEvent<SVGSVGElement>) => {
    e.preventDefault();
  };
 
  const handleDrop = (e: React.DragEvent<SVGSVGElement>) => {
    e.preventDefault();
    try {
      const rawData = e.dataTransfer.getData('application/valportal');
      if (!rawData) return;
 
      const data = JSON.parse(rawData);
      const coords = getSVGCoords(e.clientX, e.clientY);
      const id = `placed_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
 
      onAddUndoState();
 
      if (data.type === 'agent') {
        const agentObj: AgentObject = {
          id,
          type: 'agent',
          agentId: data.uuid,
          agentName: data.displayName,
          iconUrl: data.displayIcon,
          position: coords,
          size: 40,
          color: attackerDefenderMode === 'attacker' ? '#FF4655' : '#00F0FF',
          roleColor: attackerDefenderMode === 'attacker' ? '#FF4655' : '#00F0FF'
        };
        onChangeSlideObjects([...slide.objects, agentObj]);
        setSelectedObjectId(id);
      } else if (data.type === 'ability') {
        const abilityObj: AbilityObject = {
          id,
          type: 'ability',
          agentId: data.agentUuid,
          agentName: data.agentName,
          abilityName: data.displayName,
          abilitySlot: data.slot,
          iconUrl: data.displayIcon,
          position: coords,
          size: 30,
          color: '#FFFFFF'
        };
        onChangeSlideObjects([...slide.objects, abilityObj]);
        setSelectedObjectId(id);
      }
    } catch (err) {
      console.error('Failed to parse drag drop event', err);
    }
  };

  // Styles helper for standard drawing color fills
  const getCircleFill = (obj: CircleObject) => {
    if (obj.fillType === 'outline') return 'none';
    
    // Valorant theme utility highlights
    // Fire/molly = Red/orange
    if (obj.color === '#FF4655') return 'rgba(255, 70, 85, 0.18)';
    // Smoke = Charcoal or Navy Blue translucent
    if (obj.color === '#8A9CA8' || obj.color === '#1E293B') return 'rgba(110, 130, 145, 0.35)';
    // Poison = Green
    if (obj.color === '#22C55E') return 'rgba(34, 197, 94, 0.25)';
    // Flash / Yellow = Cyan or Yellow
    if (obj.color === '#00F0FF') return 'rgba(0, 240, 255, 0.15)';
    if (obj.color === '#EAB308') return 'rgba(234, 179, 8, 0.18)';
    
    // Default translucent fill of the stroke color
    return `${obj.color}1E`;
  };

  // Generates freehand smooth path markup
  const getFreehandPathString = (obj: FreehandObject) => {
    if (obj.points.length === 0) return '';
    const d = obj.points.reduce((acc, p, idx) => {
      if (idx === 0) return `M ${p.x} ${p.y}`;
      return `${acc} L ${p.x} ${p.y}`;
    }, '');
    return d;
  };
 
  // Zoom preset actions
  const zoomIn = () => setZoom(z => Math.min(z * 1.2, 8));
  const zoomOut = () => setZoom(z => Math.max(z / 1.2, 0.3));
  const resetView = () => {
    if (!containerRef.current) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const containerW = rect.width;
    const containerH = rect.height;
    if (containerW > 0 && containerH > 0) {
      const fitScale = Math.min(containerW / 1000, containerH / 1000) * 0.95;
      setZoom(fitScale);
      setPan({
        x: (containerW - 1000 * fitScale) / 2,
        y: (containerH - 1000 * fitScale) / 2
      });
    } else {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  };
 
  const handleDeleteSelected = () => {
    if (!selectedObjectId) return;
    onAddUndoState();
    onChangeSlideObjects(slide.objects.filter(o => o.id !== selectedObjectId));
    setSelectedObjectId(null);
  };

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full bg-[#0B0E11] overflow-hidden select-none"
      style={{ cursor: spacePressed ? 'grab' : isPanning ? 'grabbing' : 'default' }}
    >
      <svg
        ref={svgRef}
        className="w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <defs>
          <marker
            id="arrowhead-red"
            markerWidth="10"
            markerHeight="7"
            refX="6"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#FF4655" />
          </marker>
          <marker
            id="arrowhead-cyan"
            markerWidth="10"
            markerHeight="7"
            refX="6"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#00F0FF" />
          </marker>
          <marker
            id="arrowhead-white"
            markerWidth="10"
            markerHeight="7"
            refX="6"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#FFFFFF" />
          </marker>
          <marker
            id="arrowhead-green"
            markerWidth="10"
            markerHeight="7"
            refX="6"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#22C55E" />
          </marker>
          <marker
            id="arrowhead-yellow"
            markerWidth="10"
            markerHeight="7"
            refX="6"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#EAB308" />
          </marker>

          {/* Grid pattern background for tech look */}
          <pattern id="tech-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
          </pattern>

          {/* Radial Gradient for Short Vision (Cyan flashlight beam) */}
          <radialGradient id="vision-cone-gradient-short" cx="50%" cy="100%" r="100%" fx="50%" fy="100%">
            <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#00F0FF" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#00F0FF" stopOpacity="0" />
          </radialGradient>

          {/* Radial Gradient for Long Vision (Yellow flashlight beam) */}
          <radialGradient id="vision-cone-gradient-long" cx="50%" cy="100%" r="100%" fx="50%" fy="100%">
            <stop offset="0%" stopColor="#EAB308" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#EAB308" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#EAB308" stopOpacity="0" />
          </radialGradient>

          {/* Radial Gradient for Wide Vision (Purple flashlight beam) */}
          <radialGradient id="vision-cone-gradient-wide" cx="50%" cy="100%" r="100%" fx="50%" fy="100%">
            <stop offset="0%" stopColor="#A855F7" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#A855F7" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. Base Tech grid background */}
        <rect width="100%" height="100%" fill="url(#tech-grid)" />

        {/* 2. Map Image & Drawings Group (Transformed by Zoom & Pan) */}
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          
          {/* Map Top-Down Layout */}
          {mapImageUrl ? (
            <image
              href={mapImageUrl}
              x="50"
              y="50"
              width="900"
              height="900"
              style={{ pointerEvents: 'none', opacity: 0.85 }}
            />
          ) : (
            // Fallback Splash Art if minimap displayIcon is unavailable
            <image
              href={map.splash}
              x="0"
              y="0"
              width="1000"
              height="600"
              style={{ pointerEvents: 'none', opacity: 0.3 }}
            />
          )}

          {/* STATIC VECTOR DRAWINGS ON MAP */}
          {slide.objects.map((obj) => {
            const isSelected = selectedObjectId === obj.id;
            const markerId = obj.color === '#FF4655' ? 'arrowhead-red' 
                           : obj.color === '#00F0FF' ? 'arrowhead-cyan'
                           : obj.color === '#22C55E' ? 'arrowhead-green'
                           : obj.color === '#EAB308' ? 'arrowhead-yellow'
                           : 'arrowhead-white';

            switch (obj.type) {
              case 'freehand':
                return (
                  <path
                    key={obj.id}
                    data-obj-id={obj.id}
                    d={getFreehandPathString(obj as FreehandObject)}
                    fill="none"
                    stroke={obj.color}
                    strokeWidth={(obj as FreehandObject).strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`cursor-pointer transition-colors duration-150 ${activeTool === 'eraser' ? 'hover:stroke-red-500 hover:opacity-75' : ''}`}
                    strokeDasharray={isSelected ? '6,6' : 'none'}
                  />
                );

              case 'line':
                return (
                  <line
                    key={obj.id}
                    data-obj-id={obj.id}
                    x1={(obj as LineObject).start.x}
                    y1={(obj as LineObject).start.y}
                    x2={(obj as LineObject).end.x}
                    y2={(obj as LineObject).end.y}
                    stroke={obj.color}
                    strokeWidth={(obj as LineObject).strokeWidth}
                    strokeLinecap="round"
                    className={`cursor-pointer transition-colors duration-150 ${activeTool === 'eraser' ? 'hover:stroke-red-500 hover:opacity-75' : ''}`}
                    strokeDasharray={isSelected ? '6,6' : 'none'}
                  />
                );

              case 'arrow':
                return (
                  <line
                    key={obj.id}
                    data-obj-id={obj.id}
                    x1={(obj as ArrowObject).start.x}
                    y1={(obj as ArrowObject).start.y}
                    x2={(obj as ArrowObject).end.x}
                    y2={(obj as ArrowObject).end.y}
                    stroke={obj.color}
                    strokeWidth={(obj as ArrowObject).strokeWidth}
                    strokeLinecap="round"
                    markerEnd={`url(#${markerId})`}
                    className={`cursor-pointer transition-colors duration-150 ${activeTool === 'eraser' ? 'hover:stroke-red-500 hover:opacity-75' : ''}`}
                    strokeDasharray={isSelected ? '6,6' : 'none'}
                  />
                );

              case 'circle':
                return (
                  <circle
                    key={obj.id}
                    data-obj-id={obj.id}
                    cx={(obj as CircleObject).center.x}
                    cy={(obj as CircleObject).center.y}
                    r={(obj as CircleObject).radius}
                    stroke={obj.color}
                    strokeWidth={(obj as CircleObject).strokeWidth}
                    fill={getCircleFill(obj as CircleObject)}
                    className={`cursor-pointer transition-colors duration-150 ${activeTool === 'eraser' ? 'hover:stroke-red-500 hover:opacity-75' : ''}`}
                    strokeDasharray={isSelected ? '6,6' : 'none'}
                  />
                );

              case 'text':
                return (
                  <g key={obj.id} className="cursor-pointer">
                    {isSelected && (
                      <rect
                        x={(obj as TextObject).position.x - 4}
                        y={(obj as TextObject).position.y - 14}
                        width={(obj as TextObject).text.length * 9.6 + 8}
                        height={20}
                        fill="none"
                        stroke="#FF4655"
                        strokeWidth={1}
                        strokeDasharray="3,3"
                      />
                    )}
                    <text
                      data-obj-id={obj.id}
                      x={(obj as TextObject).position.x}
                      y={(obj as TextObject).position.y}
                      fill={obj.color}
                      fontSize={(obj as TextObject).fontSize}
                      fontFamily="monospace"
                      fontWeight="bold"
                      className="select-none font-mono"
                    >
                      {(obj as TextObject).text}
                    </text>
                  </g>
                );

              case 'agent':
                const agent = obj as AgentObject;
                const matchedAgent = agents.find(a => a.uuid === agent.agentId || a.displayName.toLowerCase() === agent.agentName.toLowerCase());
                return (
                  <g 
                    key={obj.id} 
                    className="cursor-grab active:cursor-grabbing"
                    data-obj-id={obj.id}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!containerRef.current) return;
                      const rect = containerRef.current.getBoundingClientRect();
                      setAgentContextMenu({
                        agentId: obj.id,
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top
                      });
                      setActiveCategory(null);
                    }}
                  >
                    {/* Ring highlight: Attacker (Red) / Defender (Cyan) or Selected */}
                    <circle
                      cx={agent.position.x}
                      cy={agent.position.y}
                      r={agent.size / 2 + (isSelected ? 5 : 2)}
                      fill="rgba(15,18,21,0.85)"
                      stroke={isSelected ? '#FFFFFF' : agent.roleColor}
                      strokeWidth={isSelected ? 2 : 1.5}
                      strokeDasharray={isSelected ? '3,3' : 'none'}
                      data-obj-id={obj.id}
                    />
                    {/* Role Label background tag */}
                    <rect
                      x={agent.position.x - 18}
                      y={agent.position.y + agent.size / 2 + 1}
                      width="36"
                      height="12"
                      fill="#0B0E11"
                      stroke={agent.roleColor}
                      strokeWidth={1}
                      rx={2}
                      data-obj-id={obj.id}
                    />
                    <text
                      x={agent.position.x}
                      y={agent.position.y + agent.size / 2 + 10}
                      fill="#FFFFFF"
                      fontSize="8"
                      fontFamily="monospace"
                      textAnchor="middle"
                      className="font-mono text-[8px] font-bold"
                      data-obj-id={obj.id}
                    >
                      {agent.agentName.substring(0, 5).toUpperCase()}
                    </text>
                    {/* Agent face icon */}
                    <image
                      href={agent.iconUrl}
                      x={agent.position.x - agent.size / 2}
                      y={agent.position.y - agent.size / 2}
                      width={agent.size}
                      height={agent.size}
                      clipPath="circle(50%)"
                      data-obj-id={obj.id}
                    />
 
                    {/* Attached Weapon Silhouette Overlay */}
                    {agent.weapon && (
                      <image
                        href={agent.weapon.displayIcon}
                        x={agent.position.x - 5}
                        y={agent.position.y + 2}
                        width={agent.size * 1.4}
                        height={agent.size * 0.55}
                        style={{ 
                          pointerEvents: 'none', 
                          filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.9)) brightness(1.2)',
                          transform: 'scaleX(-1)',
                          transformOrigin: 'center',
                          transformBox: 'fill-box'
                        }}
                      />
                    )}

                    {/* Valoplant-style floating agent menu (abilities quick spawn + delete button) */}
                    {isSelected && matchedAgent && (
                      <foreignObject
                        x={agent.position.x - 75}
                        y={agent.position.y - agent.size / 2 - 36}
                        width="150"
                        height="30"
                        className="overflow-visible"
                      >
                        <div 
                          className="flex items-center justify-center space-x-1 px-1.5 py-1 bg-[#0F1215]/95 border border-[#FF4655] rounded-full shadow-2xl backdrop-blur-xs select-none"
                          onMouseDown={(e) => e.stopPropagation()}
                          onMouseUp={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Abilities buttons */}
                          {matchedAgent.abilities.map((ability) => {
                            const keyMap: { [key: string]: string } = {
                              'Ability1': 'Q',
                              'Ability2': 'E',
                              'Grenade': 'C',
                              'Ultimate': 'X'
                            };
                            const keyLetter = keyMap[ability.slot] || ability.slot.substring(0, 1);
                            
                            return (
                              <button
                                key={ability.slot}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAddUndoState();
                                  const abId = `placed_ab_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                                  const abObj: AbilityObject = {
                                    id: abId,
                                    type: 'ability',
                                    agentId: agent.agentId,
                                    agentName: agent.agentName,
                                    abilityName: ability.displayName,
                                    abilitySlot: ability.slot,
                                    iconUrl: ability.displayIcon || '',
                                    position: {
                                      x: agent.position.x + 36, // spawn slightly next to agent
                                      y: agent.position.y
                                    },
                                    size: 30,
                                    color: '#FFFFFF'
                                  };
                                  onChangeSlideObjects([...slide.objects, abObj]);
                                  setSelectedObjectId(abId);
                                }}
                                className="w-5.5 h-5.5 rounded-full bg-black/40 border border-white/5 hover:border-cyan-400 hover:bg-white/5 active:scale-90 flex items-center justify-center transition cursor-pointer"
                                title={`Place ${ability.displayName} (${keyLetter})`}
                              >
                                {ability.displayIcon ? (
                                  <img
                                    src={ability.displayIcon}
                                    alt={ability.displayName}
                                    className="w-3.5 h-3.5 object-contain"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <span className="text-white text-[8px] font-mono font-bold">{keyLetter}</span>
                                )}
                              </button>
                            );
                          })}

                          <div className="h-4.5 w-[1px] bg-white/10 mx-0.5" />

                          {/* Quick delete button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddUndoState();
                              onChangeSlideObjects(slide.objects.filter(o => o.id !== agent.id));
                              setSelectedObjectId(null);
                            }}
                            className="w-5.5 h-5.5 rounded-full bg-[#FF4655]/10 border border-[#FF4655]/20 hover:bg-[#FF4655] hover:text-black active:scale-90 flex items-center justify-center transition cursor-pointer text-red-400 hover:border-transparent"
                            title="Delete Agent"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </foreignObject>
                    )}
                  </g>
                );

              case 'ability':
                const ability = obj as AbilityObject;
                return (
                  <g 
                    key={obj.id} 
                    className="cursor-grab active:cursor-grabbing"
                    data-obj-id={obj.id}
                  >
                    {/* Border highlight */}
                    <rect
                      x={ability.position.x - ability.size / 2}
                      y={ability.position.y - ability.size / 2}
                      width={ability.size}
                      height={ability.size}
                      fill="rgba(15, 18, 21, 0.9)"
                      stroke={isSelected ? '#FFFFFF' : '#FF4655'}
                      strokeWidth={isSelected ? 1.5 : 1}
                      strokeDasharray={isSelected ? '3,3' : 'none'}
                      className="rounded"
                      data-obj-id={obj.id}
                    />
                    {/* Small text indicator in corner */}
                    <rect
                      x={ability.position.x + ability.size / 2 - 8}
                      y={ability.position.y - ability.size / 2 - 4}
                      width="12"
                      height="9"
                      fill="#FF4655"
                      rx={1}
                      data-obj-id={obj.id}
                    />
                    <text
                      x={ability.position.x + ability.size / 2 - 2}
                      y={ability.position.y - ability.size / 2 + 3}
                      fill="#FFFFFF"
                      fontSize="7"
                      fontFamily="monospace"
                      textAnchor="middle"
                      className="font-mono font-bold text-[7px]"
                      data-obj-id={obj.id}
                    >
                      {ability.abilitySlot.replace('Ability1', 'Q').replace('Ability2', 'E').replace('Grenade', 'C').replace('Ultimate', 'X').substring(0,1)}
                    </text>
                    {/* Ability Icon */}
                    {ability.iconUrl ? (
                      <image
                        href={ability.iconUrl}
                        x={ability.position.x - ability.size / 2 + 2}
                        y={ability.position.y - ability.size / 2 + 2}
                        width={ability.size - 4}
                        height={ability.size - 4}
                        data-obj-id={obj.id}
                      />
                    ) : (
                      <text
                        x={ability.position.x}
                        y={ability.position.y + 4}
                        fill="#FFFFFF"
                        fontSize="9"
                        textAnchor="middle"
                        className="font-mono font-bold text-[9px]"
                        data-obj-id={obj.id}
                      >
                        {ability.abilitySlot.substring(0, 1)}
                      </text>
                    )}
                  </g>
                );
 
              case 'stamp': {
                const stamp = obj as StampObject;
                const isSelected = selectedObjectId === stamp.id;
                const x = stamp.position.x;
                const y = stamp.position.y;
                const strokeColor = stamp.color;
                const r = stamp.size || 50;
                
                // Scale factor for shapes (base scale coordinates designed around size of 30)
                const scaleFactor = r / 30;
                const transformScale = `translate(${x}, ${y}) scale(${scaleFactor}) translate(${-x}, ${-y})`;

                return (
                  <g 
                    key={stamp.id} 
                    className="cursor-grab active:cursor-grabbing"
                    data-obj-id={stamp.id}
                    transform={stamp.rotation ? `rotate(${stamp.rotation}, ${x}, ${y})` : undefined}
                  >
                    {/* Rendering different stamp shapes */}
                    {stamp.stampType === 'spike' && (
                      <image
                        href="https://media.valorant-api.com/gamemodes/96bd3920-4f36-d026-2b28-c683eb0bcac5/displayicon.png"
                        x={x - r/2}
                        y={y - r/2}
                        width={r}
                        height={r}
                        data-obj-id={stamp.id}
                      />
                    )}

                    {stamp.stampType === 'vision-short' && (
                      <g data-obj-id={stamp.id}>
                        {/* 60 degrees vision cone with radial gradient flashlight beam effect */}
                        <path 
                          d={`M ${x} ${y} L ${x - r * 0.5} ${y - r * 0.866} A ${r} ${r} 0 0 1 ${x + r * 0.5} ${y - r * 0.866} Z`} 
                          fill="url(#vision-cone-gradient-short)" 
                          stroke={strokeColor === '#FFFFFF' ? '#00F0FF' : strokeColor} 
                          strokeWidth="1.5" 
                          strokeOpacity="0.8"
                          data-obj-id={stamp.id} 
                        />
                      </g>
                    )}

                    {stamp.stampType === 'vision-long' && (
                      <g data-obj-id={stamp.id}>
                        {/* 30 degrees narrow vision cone with radial gradient flashlight beam effect */}
                        <path 
                          d={`M ${x} ${y} L ${x - r * 0.2588} ${y - r * 0.9659} A ${r} ${r} 0 0 1 ${x + r * 0.2588} ${y - r * 0.9659} Z`} 
                          fill="url(#vision-cone-gradient-long)" 
                          stroke={strokeColor === '#FFFFFF' ? '#EAB308' : strokeColor} 
                          strokeWidth="1.5" 
                          strokeOpacity="0.8"
                          data-obj-id={stamp.id} 
                        />
                      </g>
                    )}

                    {stamp.stampType === 'vision-wide' && (
                      <g data-obj-id={stamp.id}>
                        {/* 120 degrees wide vision cone with radial gradient flashlight beam effect */}
                        <path 
                          d={`M ${x} ${y} L ${x - r * 0.866} ${y - r * 0.5} A ${r} ${r} 0 0 1 ${x + r * 0.866} ${y - r * 0.5} Z`} 
                          fill="url(#vision-cone-gradient-wide)" 
                          stroke={strokeColor === '#FFFFFF' ? '#A855F7' : strokeColor} 
                          strokeWidth="1.5" 
                          strokeOpacity="0.8"
                          data-obj-id={stamp.id} 
                        />
                      </g>
                    )}

                    {stamp.stampType === 'pin' && (
                      <g data-obj-id={stamp.id} transform={transformScale}>
                        <path d={`M ${x} ${y} C ${x - 8} ${y - 12} ${x - 8} ${y - 20} ${x} ${y - 20} C ${x + 8} ${y - 20} ${x + 8} ${y - 12} ${x} ${y} Z`} fill={strokeColor} stroke="#0B0E11" strokeWidth="1.2" data-obj-id={stamp.id} />
                        <circle cx={x} cy={y - 14} r="3" fill="#0B0E11" data-obj-id={stamp.id} />
                      </g>
                    )}

                    {stamp.stampType === 'warning' && (
                      <g data-obj-id={stamp.id} transform={transformScale}>
                        <polygon points={`${x},${y - 14} ${x - 12},${y + 6} ${x + 12},${y + 6}`} fill="#EAB308" stroke="#0B0E11" strokeWidth="1.5" data-obj-id={stamp.id} />
                        <text x={x} y={y + 3} fill="#0F1215" fontSize="9" fontWeight="black" fontFamily="monospace" textAnchor="middle" data-obj-id={stamp.id}>!</text>
                      </g>
                    )}

                    {stamp.stampType === 'flag' && (
                      <g data-obj-id={stamp.id} transform={transformScale}>
                        <line x1={x - 4} y1={y + 10} x2={x - 4} y2={y - 12} stroke="#FFFFFF" strokeWidth="2" data-obj-id={stamp.id} />
                        <polygon points={`${x - 4},${y - 12} ${x + 12},${y - 7} ${x - 4},${y - 2}`} fill={strokeColor === '#FFFFFF' ? '#FF4655' : strokeColor} data-obj-id={stamp.id} />
                      </g>
                    )}

                    {stamp.stampType === 'anchor' && (
                      <g data-obj-id={stamp.id} transform={transformScale}>
                        <path d={`M ${x} ${y - 8} L ${x} ${y + 6} M ${x - 7} ${y - 3} L ${x + 7} ${y - 3} M ${x - 7} ${y + 3} A 7 7 0 0 0 ${x + 7} ${y + 3}`} fill="none" stroke={strokeColor === '#FFFFFF' ? '#00F0FF' : strokeColor} strokeWidth="2" strokeLinecap="round" data-obj-id={stamp.id} />
                        <circle cx={x} cy={y - 8} r="2" fill="none" stroke={strokeColor === '#FFFFFF' ? '#00F0FF' : strokeColor} strokeWidth="1.5" data-obj-id={stamp.id} />
                      </g>
                    )}

                    {stamp.stampType === 'target' && (
                      <g data-obj-id={stamp.id} transform={transformScale}>
                        <circle cx={x} cy={y} r="10" fill="none" stroke={strokeColor === '#FFFFFF' ? '#FF4655' : strokeColor} strokeWidth="1.5" data-obj-id={stamp.id} />
                        <circle cx={x} cy={y} r="5" fill="none" stroke={strokeColor === '#FFFFFF' ? '#FF4655' : strokeColor} strokeWidth="1" data-obj-id={stamp.id} />
                        <circle cx={x} cy={y} r="1.5" fill={strokeColor === '#FFFFFF' ? '#FF4655' : strokeColor} data-obj-id={stamp.id} />
                        <line x1={x - 13} y1={y} x2={x + 13} y2={y} stroke={strokeColor === '#FFFFFF' ? '#FF4655' : strokeColor} strokeWidth="1" data-obj-id={stamp.id} />
                        <line x1={x} y1={y - 13} x2={x} y2={y + 13} stroke={strokeColor === '#FFFFFF' ? '#FF4655' : strokeColor} strokeWidth="1" data-obj-id={stamp.id} />
                      </g>
                    )}

                    {stamp.stampType === 'star' && (
                      <g data-obj-id={stamp.id} transform={transformScale}>
                        <path d={`M ${x} ${y - 12} L ${x + 3.5} ${y - 3.5} L ${x + 12} ${y - 3.5} L ${x + 5} ${y + 1.5} L ${x + 8} ${y + 10} L ${x} ${y + 5} L ${x - 8} ${y + 10} L ${x - 5} ${y + 1.5} L ${x - 12} ${y - 3.5} L ${x - 3.5} ${y - 3.5} Z`} fill={strokeColor} stroke="#0B0E11" strokeWidth="1" data-obj-id={stamp.id} />
                      </g>
                    )}

                    {/* Hovering Quick Control Menu for selected stamp */}
                    {isSelected && (
                      <foreignObject
                        x={x - 60}
                        y={y - (stamp.stampType.startsWith('vision-') ? r + 35 : 50)}
                        width="120"
                        height="30"
                        className="overflow-visible"
                        transform={stamp.rotation ? `rotate(${-stamp.rotation}, ${x}, ${y})` : undefined}
                      >
                        <div 
                          className="flex items-center justify-center space-x-1 bg-[#0F1215]/95 border border-white/10 rounded-lg p-1 shadow-xl backdrop-blur-sm pointer-events-auto"
                          onMouseDown={(e) => e.stopPropagation()}
                          onMouseUp={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Rotate Left */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddUndoState();
                              onChangeSlideObjects(slide.objects.map(o => o.id === stamp.id ? { ...o, rotation: ((stamp.rotation || 0) - 15) % 360 } : o));
                            }}
                            className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
                            title="Rotate Left"
                          >
                            <RotateCcw size={10} />
                          </button>

                          {/* Rotate Right */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddUndoState();
                              onChangeSlideObjects(slide.objects.map(o => o.id === stamp.id ? { ...o, rotation: ((stamp.rotation || 0) + 15) % 360 } : o));
                            }}
                            className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
                            title="Rotate Right"
                          >
                            <RotateCw size={10} />
                          </button>

                          <div className="w-[1px] h-3 bg-white/10" />

                          {/* Scale Down */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddUndoState();
                              onChangeSlideObjects(slide.objects.map(o => o.id === stamp.id ? { ...o, size: Math.max(20, (stamp.size || 50) - 10) } : o));
                            }}
                            className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
                            title="Scale Down"
                          >
                            <Minus size={10} />
                          </button>

                          {/* Scale Up */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddUndoState();
                              onChangeSlideObjects(slide.objects.map(o => o.id === stamp.id ? { ...o, size: Math.min(250, (stamp.size || 50) + 10) } : o));
                            }}
                            className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
                            title="Scale Up"
                          >
                            <Plus size={10} />
                          </button>

                          <div className="w-[1px] h-3 bg-white/10" />

                          {/* Delete */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddUndoState();
                              onChangeSlideObjects(slide.objects.filter(o => o.id !== stamp.id));
                              setSelectedObjectId(null);
                            }}
                            className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-500/20 text-red-400 hover:text-red-300 transition cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </foreignObject>
                    )}
                  </g>
                );
              }

              default:
                return null;
            }
          })}

          {/* TEMPORARY BUILDERS (DRAWINGS CURRENTLY ACTIVE BEFORE MOUSE UP) */}
          {isDrawing && (
            <>
              {activeTool === 'freehand' && activeTempPoints.length > 0 && (
                <path
                  d={activeTempPoints.reduce((acc, p, idx) => {
                    if (idx === 0) return `M ${p.x} ${p.y}`;
                    return `${acc} L ${p.x} ${p.y}`;
                  }, '')}
                  fill="none"
                  stroke={activeColor}
                  strokeWidth={4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.8}
                />
              )}
              {activeTool === 'line' && tempEnd && (
                <line
                  x1={drawingStart.x}
                  y1={drawingStart.y}
                  x2={tempEnd.x}
                  y2={tempEnd.y}
                  stroke={activeColor}
                  strokeWidth={4}
                  strokeLinecap="round"
                  opacity={0.8}
                />
              )}
              {activeTool === 'arrow' && tempEnd && (
                <line
                  x1={drawingStart.x}
                  y1={drawingStart.y}
                  x2={tempEnd.x}
                  y2={tempEnd.y}
                  stroke={activeColor}
                  strokeWidth={4}
                  strokeLinecap="round"
                  markerEnd={`url(#arrowhead-${
                    activeColor === '#FF4655' ? 'red' 
                    : activeColor === '#00F0FF' ? 'cyan' 
                    : activeColor === '#22C55E' ? 'green'
                    : activeColor === '#EAB308' ? 'yellow'
                    : 'white'
                  })`}
                  opacity={0.8}
                />
              )}
              {activeTool === 'circle' && tempEnd && (
                <circle
                  cx={drawingStart.x}
                  cy={drawingStart.y}
                  r={Math.sqrt(
                    Math.pow(tempEnd.x - drawingStart.x, 2) +
                    Math.pow(tempEnd.y - drawingStart.y, 2)
                  )}
                  stroke={activeColor}
                  strokeWidth={3}
                  fill={
                    activeColor === '#FFFFFF' 
                      ? 'none' 
                      : activeColor === '#FF4655' ? 'rgba(255, 70, 85, 0.12)'
                      : activeColor === '#00F0FF' ? 'rgba(0, 240, 255, 0.10)'
                      : activeColor === '#22C55E' ? 'rgba(34, 197, 94, 0.12)'
                      : activeColor === '#EAB308' ? 'rgba(234, 179, 8, 0.12)'
                      : `${activeColor}12`
                  }
                  opacity={0.8}
                />
              )}
            </>
          )}

          {/* INTERACTIVE LINEUPS OVERLAY ON THE MAP */}
          {showLineupsOverlay && lineups && lineups.map((lineup, index) => {
            const isSelected = selectedLineup?.id === lineup.id;
            const isHovered = hoveredLineup?.id === lineup.id;
            
            const { agentX, agentY, abilityX, abilityY } = getLineupCoords(lineup, index);

            const selAgentObj = agents.find(a => a.displayName.toLowerCase() === lineup.agent.displayName.toLowerCase());
            const agentIcon = selAgentObj?.displayIcon || '';
            const selAbilityObj = selAgentObj?.abilities.find(ab => ab.displayName.toLowerCase() === lineup.ability.displayName.toLowerCase());
            const abilityIcon = selAbilityObj?.displayIcon || '';

            const roleName = selAgentObj?.role?.displayName || '';
            const roleColorMap: Record<string, string> = {
              'Duelist': '#FF4655',
              'Sentinel': '#22C55E',
              'Controller': '#00F0FF',
              'Initiator': '#EAB308'
            };
            const roleColor = roleColorMap[roleName] || '#FF4655';

            const markerId = roleName === 'Duelist' ? 'arrowhead-red'
                           : roleName === 'Controller' ? 'arrowhead-cyan'
                           : roleName === 'Sentinel' ? 'arrowhead-green'
                           : roleName === 'Initiator' ? 'arrowhead-yellow'
                           : 'arrowhead-white';

            return (
              <g key={`lineup-overlay-${lineup.id}`}>
                {/* 1. Large invisible trajectory line wrapper for excellent hover/click target */}
                <line
                  x1={agentX}
                  y1={agentY}
                  x2={abilityX}
                  y2={abilityY}
                  stroke="transparent"
                  strokeWidth={14}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectLineup) onSelectLineup(lineup);
                  }}
                  onMouseEnter={() => onHoverLineup && onHoverLineup(lineup)}
                  onMouseLeave={() => onHoverLineup && onHoverLineup(null)}
                />

                {/* Trajectory arrow shaft - only drawn when selected or hovered (starts.gg style) */}
                {(isSelected || isHovered) && (
                  <line
                    x1={agentX}
                    y1={agentY}
                    x2={abilityX}
                    y2={abilityY}
                    stroke={roleColor}
                    strokeWidth={isSelected ? 3.5 : 2.5}
                    strokeDasharray={isSelected ? '4,3' : 'none'}
                    opacity={1.0}
                    markerEnd={`url(#${markerId})`}
                    className="transition-all duration-150 pointer-events-none"
                    style={{ filter: `drop-shadow(0px 0px 4px ${roleColor})` }}
                  />
                )}

                {/* Accent white thin line inside the arrow on hover/select */}
                {(isSelected || isHovered) && (
                  <line
                    x1={agentX}
                    y1={agentY}
                    x2={abilityX}
                    y2={abilityY}
                    stroke="#FFFFFF"
                    strokeWidth={0.8}
                    opacity={isSelected ? 0.75 : 0.4}
                    strokeDasharray={isSelected ? '4,3' : 'none'}
                    className="transition-all duration-150 pointer-events-none"
                  />
                )}

                {/* Agent Standing Position Indicator - only drawn when selected or hovered (starts.gg style) */}
                {(isSelected || isHovered) && (
                  <g
                    className="cursor-pointer transition-all duration-150"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectLineup) onSelectLineup(lineup);
                    }}
                    onMouseEnter={() => onHoverLineup && onHoverLineup(lineup)}
                    onMouseLeave={() => onHoverLineup && onHoverLineup(null)}
                  >
                    <circle
                      cx={agentX}
                      cy={agentY}
                      r={isSelected ? 14 : 13}
                      fill="#FFFFFF"
                      stroke={isSelected ? '#101823' : roleColor}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      style={{ filter: 'drop-shadow(0px 2px 8px rgba(255,255,255,0.5))' }}
                      className="transition-all duration-150"
                    />
                    {agentIcon ? (
                      <>
                        <clipPath id={`agent-clip-${lineup.id}`}>
                          <circle cx={agentX} cy={agentY} r={isSelected ? 12.8 : 11.8} />
                        </clipPath>
                        <image
                          href={agentIcon}
                          x={agentX - (isSelected ? 14 : 13)}
                          y={agentY - (isSelected ? 14 : 13)}
                          width={(isSelected ? 14 : 13) * 2}
                          height={(isSelected ? 14 : 13) * 2}
                          clipPath={`url(#agent-clip-${lineup.id})`}
                          referrerPolicy="no-referrer"
                        />
                      </>
                    ) : (
                      <text
                        x={agentX}
                        y={agentY + 2.5}
                        textAnchor="middle"
                        fill="#0F1215"
                        fontSize="7"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {lineup.agent.displayName.substring(0, 2).toUpperCase()}
                      </text>
                    )}
                  </g>
                )}

                {/* Ability Landing Target Position Indicator (Semi-transparent ability circle) */}
                <g
                  className="cursor-pointer transition-all duration-150"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectLineup) onSelectLineup(lineup);
                  }}
                  onMouseEnter={() => onHoverLineup && onHoverLineup(lineup)}
                  onMouseLeave={() => onHoverLineup && onHoverLineup(null)}
                >
                  {/* Glowing ripple animation (matching strats.gg position effects) */}
                  {(isSelected || isHovered) && (
                    <>
                      <circle
                        cx={abilityX}
                        cy={abilityY}
                        r={12}
                        fill="none"
                        stroke={roleColor}
                        strokeWidth="1.5"
                        className="pointer-events-none"
                      >
                        <animate attributeName="r" values="12;50" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="1;0" dur="2s" repeatCount="indefinite" />
                      </circle>
                      <circle
                        cx={abilityX}
                        cy={abilityY}
                        r={12}
                        fill="none"
                        stroke={roleColor}
                        strokeWidth="1"
                        className="pointer-events-none"
                      >
                        <animate attributeName="r" values="12;50" dur="2s" begin="1s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="1;0" dur="2s" begin="1s" repeatCount="indefinite" />
                      </circle>
                    </>
                  )}

                  {/* Outer glowing semi-transparent region indicating utility area */}
                  <circle
                    cx={abilityX}
                    cy={abilityY}
                    r={isSelected ? 32 : isHovered ? 28 : 22}
                    fill={roleColor}
                    fillOpacity={isSelected ? 0.28 : isHovered ? 0.22 : 0.14}
                    stroke={roleColor}
                    strokeWidth={1}
                    strokeDasharray="2,2"
                    className="transition-all duration-150 pointer-events-none animate-pulse"
                  />

                  {/* Inner indicator with image/dot */}
                  <circle
                    cx={abilityX}
                    cy={abilityY}
                    r={isSelected ? 14 : isHovered ? 13 : 11}
                    fill="#0F1215"
                    fillOpacity={0.8}
                    stroke={isSelected ? '#FFFFFF' : isHovered ? roleColor : 'rgba(255,255,255,0.3)'}
                    strokeWidth={isSelected ? 2 : 1.2}
                    style={{ filter: isSelected || isHovered ? `drop-shadow(0px 2px 8px ${roleColor}60)` : 'none' }}
                    className="transition-all duration-150"
                  />
                  {abilityIcon ? (
                    <>
                      <clipPath id={`ability-clip-${lineup.id}`}>
                        <circle cx={abilityX} cy={abilityY} r={isSelected ? 12.8 : isHovered ? 11.8 : 10.0} />
                      </clipPath>
                      <image
                        href={abilityIcon}
                        x={abilityX - (isSelected ? 14 : isHovered ? 13 : 11)}
                        y={abilityY - (isSelected ? 14 : isHovered ? 13 : 11)}
                        width={(isSelected ? 14 : isHovered ? 13 : 11) * 2}
                        height={(isSelected ? 14 : isHovered ? 13 : 11) * 2}
                        clipPath={`url(#ability-clip-${lineup.id})`}
                        referrerPolicy="no-referrer"
                      />
                    </>
                  ) : (
                    <circle
                      cx={abilityX}
                      cy={abilityY}
                      r={isSelected ? 4.5 : isHovered ? 3.5 : 2}
                      fill={roleColor}
                      className="transition-all duration-150"
                    />
                  )}
                </g>
              </g>
            );
          })}

          {/* Dynamic Vector Hovered Tooltip Overlay */}
          {showLineupsOverlay && hoveredLineup && (() => {
            const hLineup = hoveredLineup;
            const hIndex = lineups.findIndex(l => l.id === hLineup.id);
            const { abilityX: hAbilityX, abilityY: hAbilityY } = hIndex !== -1 
              ? getLineupCoords(hLineup, hIndex) 
              : { abilityX: 50 + hLineup.ability_position_norm.x * 900, abilityY: 50 + hLineup.ability_position_norm.y * 900 };
            
            const tooltipWidth = 190;
            const tooltipHeight = 58;
            const tooltipX = hAbilityX - tooltipWidth / 2;
            const tooltipY = hAbilityY - tooltipHeight - 14;

            return (
              <g className="pointer-events-none select-none z-50 transition-all duration-150 animate-fade-in">
                {/* Background Card Panel */}
                <rect
                  x={tooltipX}
                  y={tooltipY}
                  width={tooltipWidth}
                  height={tooltipHeight}
                  fill="#0F1215"
                  stroke="#FF4655"
                  strokeWidth={1.2}
                  rx={2}
                  style={{ filter: 'drop-shadow(0px 6px 16px rgba(0,0,0,0.75))' }}
                />
                
                {/* Header Strip */}
                <rect
                  x={tooltipX + 0.6}
                  y={tooltipY + 0.6}
                  width={tooltipWidth - 1.2}
                  height={16}
                  fill="#161A1E"
                  rx={1.5}
                />
                
                {/* Agent and Type metadata text */}
                <text
                  x={tooltipX + 8}
                  y={tooltipY + 11.5}
                  fill="#FF4655"
                  fontSize="7.5"
                  fontWeight="bold"
                  fontFamily="monospace"
                  className="font-mono tracking-widest font-extrabold uppercase"
                >
                  {hLineup.agent.displayName.toUpperCase()} // {hLineup.type.toUpperCase()}
                </text>
                
                {/* Side/Faction metadata text */}
                <text
                  x={tooltipX + tooltipWidth - 8}
                  y={tooltipY + 11.5}
                  fill={hLineup.site === 'attack' ? '#FF4655' : '#00F0FF'}
                  fontSize="7"
                  fontWeight="bold"
                  fontFamily="monospace"
                  textAnchor="end"
                  className="font-mono font-extrabold uppercase"
                >
                  {hLineup.site} side
                </text>

                {/* Lineup Title Name Box */}
                <foreignObject
                  x={tooltipX + 8}
                  y={tooltipY + 20}
                  width={tooltipWidth - 16}
                  height={32}
                  className="overflow-hidden"
                >
                  <div className="text-white text-[9.5px] font-mono leading-tight font-black uppercase line-clamp-2 h-full flex items-center pt-0.5">
                    {hLineup.name}
                  </div>
                </foreignObject>

                {/* Small indicator triangle arrow points to actual coordinate */}
                <polygon
                  points={`${hAbilityX - 4.5},${hAbilityY - 14} ${hAbilityX + 4.5},${hAbilityY - 14} ${hAbilityX},${hAbilityY - 9}`}
                  fill="#FF4655"
                />
              </g>
            );
          })()}

          {/* INLINE TEXT TOOL EDITOR FIELD */}
          {textInputPos && (
            <foreignObject
              x={textInputPos.x}
              y={textInputPos.y - 12}
              width="200"
              height="34"
              className="overflow-visible"
            >
              <input
                id="canvas-text-input"
                type="text"
                value={typingText}
                onChange={(e) => setTypingText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    commitText();
                  } else if (e.key === 'Escape') {
                    setTextInputPos(null);
                    setTypingText('');
                  }
                }}
                onBlur={commitText}
                className="bg-[#0F1215] border border-[#FF4655] text-white px-1.5 py-0.5 text-xs outline-none font-mono font-bold w-full rounded-none"
                style={{ color: activeColor }}
                placeholder="Type here..."
              />
            </foreignObject>
          )}
        </g>
      </svg>

      {/* QUICK FLOATING HUD TOOLS (ZOOM STATS AND COORDINATE GRIDS) */}
      <div className="absolute bottom-4 left-4 flex items-center space-x-1.5 z-10 font-mono text-[11px] text-gray-400 bg-[#0F1215] border border-white/5 p-1.5 rounded-sm shadow-xl">
        <button 
          onClick={zoomOut}
          className="p-1 hover:bg-white/5 hover:text-white transition duration-150 rounded-none border border-transparent hover:border-white/10 active:scale-95"
          title="Zoom Out"
        >
          <ZoomOut size={12} />
        </button>
        <span className="px-2 font-bold select-none text-gray-300">
          ZOOM: {Math.round(zoom * 100)}%
        </span>
        <button 
          onClick={zoomIn}
          className="p-1 hover:bg-white/5 hover:text-white transition duration-150 rounded-none border border-transparent hover:border-white/10 active:scale-95"
          title="Zoom In"
        >
          <ZoomIn size={12} />
        </button>
        <button 
          onClick={resetView}
          className="p-1 hover:bg-white/5 hover:text-white transition duration-150 rounded-none border border-transparent hover:border-white/10 active:scale-95"
          title="Reset View"
        >
          <Maximize2 size={12} />
        </button>
      </div>

      {/* INSTRUCTIONS MINI CHEATSHEET OVERLAY */}
      <div className="absolute bottom-4 right-4 text-right pointer-events-none z-10 text-[10px] text-gray-500 font-mono flex flex-col space-y-0.5 select-none bg-[#0B0E11]/85 p-2 border border-white/5 rounded-none">
        <div className="text-gray-400 font-bold mb-0.5 flex items-center justify-end">
          <HelpCircle size={10} className="mr-1 text-[#FF4655]" /> TACTICAL SHORTCUTS
        </div>
        <div>DRAG ICON TO DROP ON BOARD</div>
        <div>SELECT TOOL: DRAG PLACED OBJECTS</div>
        <div>SPACEBAR + DRAG: PAN VECTOR BOARD</div>
        <div>MOUSE WHEEL: ZOOM MAP SCALE</div>
        <div>BACKSPACE/DEL: REMOVE SELECTED</div>
      </div>

      {/* Selected Object Control Floating Button */}
      {selectedObjectId && (
        <div className="absolute top-4 left-4 z-10 bg-[#FF4655]/10 border border-[#FF4655] px-2 py-1 flex items-center space-x-2 animate-fade-in rounded-sm">
          <span className="text-[10px] text-white font-mono font-bold tracking-widest">
            OBJECT SELECTED ({slide.objects.find(o => o.id === selectedObjectId)?.type.toUpperCase()})
          </span>
          <button 
            onClick={handleDeleteSelected}
            className="p-1 text-white bg-[#FF4655] hover:bg-[#FF4655]/90 transition duration-150 border border-transparent active:scale-95"
            title="Delete selected object"
          >
            <Trash2 size={11} />
          </button>
        </div>
      )}

      {/* HUD HOVER TOOLTIP FOR LINEUPS */}
      {hoveredLineup && (() => {
        const hIndex = lineups.findIndex(l => l.id === hoveredLineup.id);
        const { agentX: hAgentX, agentY: hAgentY } = hIndex !== -1 
          ? getLineupCoords(hoveredLineup, hIndex) 
          : { agentX: 50 + hoveredLineup.agent_position_norm.x * 900, agentY: 50 + hoveredLineup.agent_position_norm.y * 900 };
        return (
          <div 
            className="absolute pointer-events-none bg-[#0F1215]/95 border border-white/10 p-2.5 z-40 font-mono text-[9px] uppercase shadow-2xl tracking-wide rounded-none select-none flex flex-col space-y-1.5 transition-all duration-100 ease-out min-w-[180px] text-left"
            style={{
              left: `${hAgentX * zoom + pan.x}px`,
              top: `${hAgentY * zoom + pan.y - 12}px`,
              transform: 'translate(-50%, -100%)'
            }}
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-1 font-bold">
              <span className="text-[#FF4655]">{hoveredLineup.agent.displayName}</span>
              <span className="text-gray-500">//</span>
              <span className="text-[#00F0FF]">{hoveredLineup.ability.displayName}</span>
            </div>
            <div className="text-white text-[10px] font-bold leading-snug">{hoveredLineup.name}</div>
            <div className="flex justify-between items-center text-[7.5px] text-gray-400 font-bold bg-black/40 px-1 py-0.5 border border-white/5">
              <span>SITE: {hoveredLineup.site}</span>
              <span>TYPE: {hoveredLineup.type}</span>
            </div>
            <div className="text-[7.5px] text-gray-500 font-bold text-center border-t border-white/5 pt-1 uppercase animate-pulse">
              CLICK TO PREVIEW VIDEO OVERLAY
            </div>
          </div>
        );
      })()}

      {/* 13. RIGHT-CLICK AGENT WEAPONS CONTEXT MENU */}
      {agentContextMenu && (() => {
        const targetObj = slide.objects.find(o => o.id === agentContextMenu.agentId);
        if (!targetObj || targetObj.type !== 'agent') return null;
        const targetAgent = targetObj as AgentObject;

        const categories = ['Sidearms', 'Rifles', 'Shotguns', 'SMGs', 'Snipers', 'Heavies'] as const;
        
        const categoryMapping: Record<string, string> = {
          'Sidearms': 'EEquippableCategory::Sidearm',
          'Rifles': 'EEquippableCategory::Rifle',
          'Shotguns': 'EEquippableCategory::Shotgun',
          'SMGs': 'EEquippableCategory::SMG',
          'Snipers': 'EEquippableCategory::Sniper',
          'Heavies': 'EEquippableCategory::Heavy'
        };

        return (
          <div 
            className="absolute z-50 bg-[#0F1215]/95 border border-white/10 p-1.5 shadow-2xl backdrop-blur-md rounded-xl select-none min-w-[170px]"
            style={{
              left: `${agentContextMenu.x}px`,
              top: `${agentContextMenu.y}px`
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Categories */}
            <div className="flex flex-col space-y-0.5">
              {categories.map(cat => {
                const catWeapons = weapons.filter((w: any) => w.category === categoryMapping[cat]);
                const hasWeapons = catWeapons.length > 0;
                
                return (
                  <div key={cat} className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveCategory(activeCategory === cat ? null : cat);
                      }}
                      onMouseEnter={() => {
                        setActiveCategory(cat);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs font-rajdhani font-semibold uppercase tracking-wide rounded-lg transition duration-150 cursor-pointer ${
                        activeCategory === cat ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] text-gray-500">▶</span>
                        <span>{cat}</span>
                      </div>
                      <span className="text-[9px] text-gray-600 font-mono">({catWeapons.length})</span>
                    </button>

                    {/* Submenu Flyout (Horizontal) */}
                    {activeCategory === cat && hasWeapons && (
                      <div className="absolute left-full top-0 ml-1.5 z-50 bg-[#0F1215]/95 border border-white/10 p-1.5 shadow-2xl rounded-xl min-w-[160px] max-h-[250px] overflow-y-auto scrollbar-thin flex flex-col space-y-0.5">
                        {catWeapons.map((weapon: any) => {
                          const isCurrent = targetAgent.weapon?.displayName === weapon.displayName;
                          return (
                            <button
                              key={weapon.uuid}
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddUndoState();
                                onChangeSlideObjects(
                                  slide.objects.map(o => o.id === targetAgent.id ? {
                                    ...o,
                                    weapon: {
                                      displayName: weapon.displayName,
                                      displayIcon: weapon.displayIcon
                                    }
                                  } : o)
                                );
                                setAgentContextMenu(null);
                                setActiveCategory(null);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition text-xs font-rajdhani font-bold tracking-wide cursor-pointer ${
                                isCurrent ? 'bg-[#FF4655]/15 text-[#FF4655]' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              <span className="mr-3">{weapon.displayName.toUpperCase()}</span>
                              {weapon.displayIcon && (
                                <img 
                                  src={weapon.displayIcon} 
                                  alt={weapon.displayName} 
                                  className="h-3 w-8 object-contain filter brightness-95 opacity-80"
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="h-[1px] bg-white/5 my-1.5" />

            {/* Clear Weapon Option (only if has weapon) */}
            {targetAgent.weapon && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddUndoState();
                  onChangeSlideObjects(
                    slide.objects.map(o => o.id === targetAgent.id ? {
                      ...o,
                      weapon: null
                    } : o)
                  );
                  setAgentContextMenu(null);
                  setActiveCategory(null);
                }}
                className="w-full text-left px-3 py-2 text-xs font-rajdhani font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition duration-150 cursor-pointer flex items-center space-x-2"
              >
                <span>✕</span>
                <span>REMOVE WEAPON</span>
              </button>
            )}

            {/* Lock / Unlock Agent Option */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddUndoState();
                onChangeSlideObjects(
                  slide.objects.map(o => o.id === targetAgent.id ? {
                    ...o,
                    isLocked: !targetAgent.isLocked
                  } : o)
                );
                setAgentContextMenu(null);
                setActiveCategory(null);
              }}
              className="w-full text-left px-3 py-2 text-xs font-rajdhani font-bold text-[#00F0FF] hover:text-[#00F0FF] hover:bg-[#00F0FF]/10 rounded-lg transition duration-150 cursor-pointer flex items-center space-x-2"
            >
              <span>{targetAgent.isLocked ? '🔓' : '🔒'}</span>
              <span>{targetAgent.isLocked ? 'UNLOCK AGENT' : 'LOCK AGENT'}</span>
            </button>
          </div>
        );
      })()}
    </div>
  );
}
