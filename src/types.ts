/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Valorant API Types
export interface ValorantMap {
  uuid: string;
  displayName: string;
  coordinates: string;
  displayIcon: string | null; // Top-down radar minimap
  splash: string; // Background splash
  listViewIcon: string | null;
}

export interface Ability {
  slot: string; // e.g. "Ability1", "Ability2", "Grenade", "Ultimate"
  displayName: string;
  description: string;
  displayIcon: string | null;
}

export interface ValorantAgent {
  uuid: string;
  displayName: string;
  description: string;
  developerName: string;
  role: {
    uuid: string;
    displayName: string; // "Duelist", "Sentinel", "Controller", "Initiator"
    description: string;
    displayIcon: string;
  } | null;
  displayIcon: string; // Face icon
  abilities: Ability[];
}

export type DrawingTool = 
  | 'select' | 'freehand' | 'line' | 'arrow' | 'circle' | 'text' | 'eraser'
  | 'stamp-spike' | 'stamp-vision-short' | 'stamp-vision-long' | 'stamp-vision-wide' | 'stamp-pin'
  | 'stamp-warning' | 'stamp-flag' | 'stamp-anchor' | 'stamp-target' | 'stamp-star'
  | 'set-agent-pos' | 'set-ability-pos';

// Vector Objects on Tactical Canvas
export interface Point {
  x: number;
  y: number;
}

export interface BaseObject {
  id: string;
  type: 'freehand' | 'line' | 'arrow' | 'circle' | 'text' | 'agent' | 'ability' | 'stamp';
  color: string;
  opacity?: number;
}

export interface FreehandObject extends BaseObject {
  type: 'freehand';
  points: Point[];
  strokeWidth: number;
}

export interface LineObject extends BaseObject {
  type: 'line';
  start: Point;
  end: Point;
  strokeWidth: number;
}

export interface ArrowObject extends BaseObject {
  type: 'arrow';
  start: Point;
  end: Point;
  strokeWidth: number;
}

export interface CircleObject extends BaseObject {
  type: 'circle';
  center: Point;
  radius: number;
  strokeWidth: number;
  fillType: 'outline' | 'filled'; // outline for generic circles, filled for utilities like smoke
}

export interface TextObject extends BaseObject {
  type: 'text';
  position: Point;
  text: string;
  fontSize: number;
}

export interface AgentObject extends BaseObject {
  type: 'agent';
  agentId: string;
  agentName: string;
  iconUrl: string;
  position: Point;
  size: number;
  roleColor: string; // Attacker (Red) vs Defender (Cyan)
  weapon?: {
    displayName: string;
    displayIcon: string;
  } | null;
  isLocked?: boolean;
}

export interface AbilityObject extends BaseObject {
  type: 'ability';
  agentId: string;
  agentName: string;
  abilityName: string;
  abilitySlot: string;
  iconUrl: string;
  position: Point;
  size: number;
}

export interface StampObject extends BaseObject {
  type: 'stamp';
  stampType: 'spike' | 'vision-short' | 'vision-long' | 'vision-wide' | 'pin' | 'warning' | 'flag' | 'anchor' | 'target' | 'star';
  position: Point;
  size: number;
  rotation?: number;
}

export type TacticalObject =
  | FreehandObject
  | LineObject
  | ArrowObject
  | CircleObject
  | TextObject
  | AgentObject
  | AbilityObject
  | StampObject;

// Tactic Slide / Phase
export interface TacticSlide {
  id: string;
  name: string; // e.g. "Setup", "Execute"
  objects: TacticalObject[];
}

// Saved Tactical Plan Structure
export interface SavedTactic {
  id: string;
  name: string;
  mapUuid: string;
  mapName: string;
  mapSplash: string;
  mapCoordinates: string;
  mapDisplayIcon: string | null;
  slides: TacticSlide[];
  notes: string; // Notes text
  createdAt: string;
  updatedAt: string;
}

// Lineup database structure
export interface Lineup {
  id: string;
  name: string;
  agent: {
    name: string;
    id: number;
    displayName: string;
  };
  ability: {
    id: number;
    displayName: string;
  };
  type: 'smoke' | 'flash' | 'molly' | 'recon' | 'setup';
  site: 'attack' | 'defense';
  map: string;
  agent_position_norm: { x: number; y: number };
  ability_position_norm: { x: number; y: number };
  level: 'easy' | 'medium' | 'pro';
  video?: {
    youtube_id: string;
    timestamp_sec: number;
    title: string;
  };
}
