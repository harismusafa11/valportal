import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_FILE = path.join(__dirname, '../lineups_strats.json');

// Normalize Agent Name to match ability_icons.json keys
const agentNameMapping = {
  'kayo': 'KAY/O',
  'viper': 'Viper',
  'sova': 'Sova',
  'killjoy': 'Killjoy',
  'gekko': 'Gekko',
  'brimstone': 'Brimstone',
  'cypher': 'Cypher',
  'fade': 'Fade',
  'deadlock': 'Deadlock',
  'yoru': 'Yoru',
  'sage': 'Sage',
  'vyse': 'Vyse',
  'breach': 'Breach',
  'neon': 'Neon',
  'phoenix': 'Phoenix',
  'raze': 'Raze',
  'astra': 'Astra',
  'tejo': 'Tejo',
  'chamber': 'Chamber',
  'jett': 'Jett',
  'skye': 'Skye',
  'iso': 'Iso',
  'harbor': 'Harbor',
  'clove': 'Clove',
  'veto': 'Veto',
  'waylay': 'Waylay',
  'reyna': 'Reyna',
  'omen': 'Omen'
};

const mapNameMapping = {
  'fractured': 'Fracture',
  'lotus': 'Lotus',
  'split': 'Split',
  'ascent': 'Ascent',
  'bind': 'Bind',
  'haven': 'Haven',
  'breeze': 'Breeze',
  'icebox': 'Icebox',
  'pearl': 'Pearl',
  'sunset': 'Sunset',
  'abyss': 'Abyss',
  'corrode': 'Corrode',
  'summit': 'Summit'
};

// Simple concurrency limiter helper
async function runWithLimit(concurrency, items, fn) {
  const results = [];
  const activePromises = [];
  for (const item of items) {
    const p = fn(item).then(res => {
      activePromises.splice(activePromises.indexOf(p), 1);
      return res;
    });
    results.push(p);
    activePromises.push(p);
    if (activePromises.length >= concurrency) {
      await Promise.race(activePromises);
    }
  }
  return Promise.all(results);
}

function getNormalizedAgentName(charId, charName) {
  const lower = charId.toLowerCase();
  if (agentNameMapping[lower]) {
    return agentNameMapping[lower];
  }
  return charName;
}

function getNormalizedMapName(mapId, mapName) {
  const lower = mapId.toLowerCase();
  if (mapNameMapping[lower]) {
    return mapNameMapping[lower];
  }
  return mapName;
}

function getYoutubeId(url) {
  if (!url) return '';
  let id = '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    id = match[2];
  }
  return id;
}

function getTimestampSec(url) {
  if (!url) return 0;
  const match = url.match(/[?&](t|start)=(\d+)/);
  return match ? parseInt(match[2], 10) : 0;
}

async function main() {
  console.log('Initializing scraper...');

  // 1. Build typeMap from existing file for maximum compatibility
  let typeMap = {};
  try {
    if (fs.existsSync(OUTPUT_FILE)) {
      const existingData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
      for (const item of existingData) {
        if (item.agent && item.ability_id && item.type) {
          typeMap[`${item.agent.toLowerCase()}:${item.ability_id.toLowerCase()}`] = item.type;
        }
      }
      console.log(`Loaded ${Object.keys(typeMap).length} ability-to-type mappings from existing file.`);
    }
  } catch (e) {
    console.log('Could not load existing file for types. Using regex fallbacks.');
  }

  function getAbilityType(agent, abilityId, abilityName) {
    const key = `${agent.toLowerCase()}:${abilityId.toLowerCase()}`;
    if (typeMap[key]) {
      return typeMap[key];
    }
    const name = (abilityName || abilityId || '').toLowerCase();
    if (name.includes('smoke') || name.includes('cover') || name.includes('screen') || name.includes('ruse') || name.includes('nebula') || name.includes('cloud')) {
      return 'smoke';
    }
    if (name.includes('flash') || name.includes('blind') || name.includes('light') || name.includes('dizzy') || name.includes('leer')) {
      return 'flash';
    }
    if (name.includes('grenade') || name.includes('mosh') || name.includes('swarm') || name.includes('dart') || name.includes('fire') || name.includes('incendiary') || name.includes('molly') || name.includes('snake') || name.includes('shock') || name.includes('paint') || name.includes('fragment') || name.includes('hands') || name.includes('bite') || name.includes('aftershock')) {
      return 'molly';
    }
    if (name.includes('recon') || name.includes('drone') || name.includes('haunt') || name.includes('cam') || name.includes('sensor') || name.includes('seeker') || name.includes('trailblazer')) {
      return 'recon';
    }
    return 'setup';
  }

  // 2. Fetch characters
  console.log('Fetching characters list from API...');
  const charRes = await fetch('https://api.strats.gg/internal/api/v1/games/valorant/characters');
  if (!charRes.ok) {
    throw new Error(`Failed to fetch characters: ${charRes.statusText}`);
  }
  const characters = await charRes.json();
  console.log(`Found ${characters.length} characters.`);

  // 3. Fetch maps
  console.log('Fetching maps list from API...');
  const mapsRes = await fetch('https://api.strats.gg/internal/api/v1/games/valorant/maps');
  if (!mapsRes.ok) {
    throw new Error(`Failed to fetch maps: ${mapsRes.statusText}`);
  }
  const maps = await mapsRes.json();
  console.log(`Found ${maps.length} maps.`);

  // 4. Generate all combinations of mapSource + character
  const queue = [];
  for (const m of maps) {
    for (const ms of m.map_sources) {
      for (const char of characters) {
        queue.push({
          mapId: m.id,
          mapName: m.name,
          mapSourceId: ms.id,
          characterId: char.id,
          characterName: char.name
        });
      }
    }
  }

  console.log(`Prepared ${queue.length} map-source and character combinations to query.`);

  const scrapedLineups = [];
  let completedCount = 0;

  // Query each combination with concurrency limit of 15
  await runWithLimit(15, queue, async (task) => {
    const url = `https://api.strats.gg/internal/api/v1/games/valorant/map_sources/${task.mapSourceId}/characters/${task.characterId}/lineups/grouped`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`[WARN] Failed to fetch lineups for ${task.mapSourceId} / ${task.characterId}: ${res.status}`);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        let addedInCombo = 0;
        for (const group of data) {
          if (!group.point || !Array.isArray(group.lineups)) continue;
          
          const agentX = group.point.left / 100;
          const agentY = group.point.top / 100;

          for (const lineup of group.lineups) {
            if (lineup.status !== 'approved') continue;
            if (!lineup.utility) continue;

            const youtubeId = getYoutubeId(lineup.video_url);
            if (!youtubeId) continue; // must have a valid video

            const agentName = getNormalizedAgentName(task.characterId, task.characterName);
            const mapName = getNormalizedMapName(task.mapId, task.mapName);
            const side = lineup.map_source?.overview || (task.mapSourceId.includes('attacker') ? 'attacker' : 'defender');

            scrapedLineups.push({
              id: lineup.id,
              name: lineup.title || lineup.name || `${agentName} Lineup`,
              agent: agentName,
              ability: lineup.utility.name,
              ability_id: lineup.utility.id,
              map: mapName,
              side: side === 'attacker' ? 'attacker' : 'defender', // normalize side string
              agent_x: agentX,
              agent_y: agentY,
              ability_x: lineup.left / 100,
              ability_y: lineup.top / 100,
              youtube_id: youtubeId,
              timestamp_sec: getTimestampSec(lineup.video_url),
              title: lineup.title || lineup.name || `${agentName} Lineup`,
              views: lineup.views || 0,
              level: lineup.level || 'easy',
              type: getAbilityType(agentName, lineup.utility.id, lineup.utility.name)
            });
            addedInCombo++;
          }
        }
        if (addedInCombo > 0) {
          console.log(`[+] Loaded ${addedInCombo} lineups for ${task.mapName} (${task.mapSourceId.split('-')[1]}) - Agent: ${task.characterName}`);
        }
      }
    } catch (err) {
      console.error(`[ERROR] Querying combination ${task.mapSourceId} / ${task.characterId}:`, err.message);
    } finally {
      completedCount++;
      if (completedCount % 50 === 0 || completedCount === queue.length) {
        console.log(`Progress: ${completedCount}/${queue.length} combinations processed...`);
      }
    }
  });

  console.log(`Scraping complete. Found ${scrapedLineups.length} total lineups.`);

  // 5. Write to lineages_strats.json
  console.log(`Writing output to ${OUTPUT_FILE}...`);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(scrapedLineups, null, 2), 'utf8');
  console.log('Saved data to file successfully!');
}

main().catch(console.error);
