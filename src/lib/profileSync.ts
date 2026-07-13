/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from './supabaseClient';

export interface ProfileData {
  username: string;
  tagline: string;
  title: string;
  accountLevel: number;
  cardUuid: string;
  cardWideArt: string;
  cardLargeArt: string;
  rankName: string;
  rankIcon: string;
}

export interface SettingsData {
  sens: number;
  dpi: number;
  edpi: number;
}

export interface ScoreData {
  score: number;
  accuracy: number;
  kps: number;
  rank: string;
}

export interface HighScoresData {
  gridshot?: ScoreData;
  microflick?: ScoreData;
  tracking?: ScoreData;
  reflex?: ScoreData;
}

export interface UnifiedSetupData {
  profile: ProfileData | null;
  settings: SettingsData | null;
  crosshair: string | null;
  aimHighScores: HighScoresData | null;
}

// ─── Local Storage Keys ────────────────────────────────────────────────────────

const KEY_PROFILE = 'valportal_user_profile';
const KEY_SETTINGS = 'valportal_user_settings';
const KEY_CROSSHAIR = 'valportal_user_crosshair';
const KEY_HIGH_SCORES = 'valportal_aim_high_scores';

// ─── Local Storage Getters & Setters ───────────────────────────────────────────

export function getLocalSetupData(): UnifiedSetupData {
  let profile: ProfileData | null = null;
  let settings: SettingsData | null = null;
  let crosshair: string | null = null;
  let aimHighScores: HighScoresData | null = null;

  try {
    const rawProfile = localStorage.getItem(KEY_PROFILE);
    if (rawProfile) profile = JSON.parse(rawProfile);
  } catch (_) {}

  try {
    const rawSettings = localStorage.getItem(KEY_SETTINGS);
    if (rawSettings) settings = JSON.parse(rawSettings);
  } catch (_) {}

  try {
    crosshair = localStorage.getItem(KEY_CROSSHAIR);
  } catch (_) {}

  try {
    const rawScores = localStorage.getItem(KEY_HIGH_SCORES);
    if (rawScores) aimHighScores = JSON.parse(rawScores);
  } catch (_) {}

  return { profile, settings, crosshair, aimHighScores };
}

export function saveLocalSetupData(data: Partial<UnifiedSetupData>) {
  try {
    if (data.profile !== undefined) {
      if (data.profile === null) localStorage.removeItem(KEY_PROFILE);
      else localStorage.setItem(KEY_PROFILE, JSON.stringify(data.profile));
    }
    if (data.settings !== undefined) {
      if (data.settings === null) localStorage.removeItem(KEY_SETTINGS);
      else localStorage.setItem(KEY_SETTINGS, JSON.stringify(data.settings));
    }
    if (data.crosshair !== undefined) {
      if (data.crosshair === null) localStorage.removeItem(KEY_CROSSHAIR);
      else localStorage.setItem(KEY_CROSSHAIR, data.crosshair);
    }
    if (data.aimHighScores !== undefined) {
      if (data.aimHighScores === null) localStorage.removeItem(KEY_HIGH_SCORES);
      else localStorage.setItem(KEY_HIGH_SCORES, JSON.stringify(data.aimHighScores));
    }
  } catch (err) {
    console.error('Failed to save to local storage', err);
  }
}

// ─── Merging Logic ─────────────────────────────────────────────────────────────

function mergeSetupData(local: UnifiedSetupData, cloud: UnifiedSetupData): UnifiedSetupData {
  // 1. Profile: Take whichever has values, preference to local if it has custom values
  const profile = local.profile || cloud.profile;

  // 2. Settings: Take local settings or cloud
  const settings = local.settings || cloud.settings;

  // 3. Crosshair: Take local crosshair code or cloud
  const crosshair = local.crosshair || cloud.crosshair;

  // 4. Aim High Scores: Merge per-mode, taking the highest score
  const mergedScores: HighScoresData = { ...cloud.aimHighScores };
  const modes: (keyof HighScoresData)[] = ['gridshot', 'microflick', 'tracking', 'reflex'];

  for (const mode of modes) {
    const localMode = local.aimHighScores?.[mode];
    const cloudMode = cloud.aimHighScores?.[mode];

    if (localMode && cloudMode) {
      if (localMode.score >= cloudMode.score) {
        mergedScores[mode] = localMode;
      } else {
        mergedScores[mode] = cloudMode;
      }
    } else if (localMode) {
      mergedScores[mode] = localMode;
    }
  }

  return { profile, settings, crosshair, aimHighScores: mergedScores };
}

// ─── Supabase Cloud Sync ───────────────────────────────────────────────────────

export async function syncLocalStorageToSupabase(): Promise<UnifiedSetupData | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
      return null; // Guest mode - no cloud sync
    }

    const user = session.user;
    const localData = getLocalSetupData();

    // Retrieve cloud data from Supabase Auth user_metadata
    const cloudSetup = user.user_metadata?.valportal_setup as UnifiedSetupData | undefined;
    const cloudData: UnifiedSetupData = {
      profile: cloudSetup?.profile || null,
      settings: cloudSetup?.settings || null,
      crosshair: cloudSetup?.crosshair || null,
      aimHighScores: cloudSetup?.aimHighScores || null,
    };

    // Merge local and cloud data
    const mergedData = mergeSetupData(localData, cloudData);

    // Save back to cloud metadata
    const { error } = await supabase.auth.updateUser({
      data: {
        valportal_setup: mergedData
      }
    });

    if (error) {
      console.warn('Failed to update user profile metadata in Supabase:', error.message);
    } else {
      console.log('Successfully synced local profile & setup to Supabase!');
    }

    // Always update local storage with the merged dataset
    saveLocalSetupData(mergedData);

    return mergedData;
  } catch (err) {
    console.error('Error during profile synchronization:', err);
    return null;
  }
}

/**
 * Downloads cloud data directly to local storage (e.g. on initial mount if logged in)
 */
export async function downloadCloudSetupToLocal(): Promise<UnifiedSetupData | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return null;

    const cloudSetup = session.user.user_metadata?.valportal_setup as UnifiedSetupData | undefined;
    if (cloudSetup) {
      saveLocalSetupData(cloudSetup);
      return cloudSetup;
    }
    return null;
  } catch (err) {
    console.error('Failed to download cloud setup to local storage:', err);
    return null;
  }
}
