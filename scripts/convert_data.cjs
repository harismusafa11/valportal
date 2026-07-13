const fs = require('fs');
const path = require('path');

const inputStratsPath = path.join(__dirname, '../lineups_strats.json');
const inputIconsPath = path.join(__dirname, '../ability_icons.json');

const outputLineupsPath = path.join(__dirname, '../src/data/lineups.json');
const outputIconsPath = path.join(__dirname, '../src/data/ability_icons.json');

console.log('Reading files...');
const strats = JSON.parse(fs.readFileSync(inputStratsPath, 'utf8'));
const icons = JSON.parse(fs.readFileSync(inputIconsPath, 'utf8'));

// Helper maps for IDs
const agentIds = {};
let nextAgentId = 1;
function getAgentId(name) {
  if (!agentIds[name]) {
    agentIds[name] = nextAgentId++;
  }
  return agentIds[name];
}

const abilityIds = {};
let nextAbilityId = 1;
function getAbilityId(name) {
  if (!abilityIds[name]) {
    abilityIds[name] = nextAbilityId++;
  }
  return abilityIds[name];
}

console.log(`Processing ${strats.length} lineups...`);

const mappedStrats = strats.map((item, idx) => {
  let site = 'attack';
  if (item.side === 'defender' || item.side === 'defense') {
    site = 'defense';
  } else if (item.side === 'attacker' || item.side === 'attack') {
    site = 'attack';
  }

  let type = item.type;
  if (!['smoke', 'flash', 'molly', 'recon', 'setup'].includes(type)) {
    type = 'setup';
  }

  let video = undefined;
  if (item.youtube_id) {
    video = {
      youtube_id: item.youtube_id,
      timestamp_sec: item.timestamp_sec || 0,
      title: item.title || item.name
    };
  }

  const agentName = item.agent;
  const agentId = getAgentId(agentName);
  const abilityId = getAbilityId(item.ability);

  // Global swap: in lineups_strats.json, agent_x/y is the landing position (cluster center)
  // and ability_x/y is the standing/thrower position. Swap them to match the React app.
  const agentX = item.ability_x;
  const agentY = item.ability_y;
  const abilityX = item.agent_x;
  const abilityY = item.agent_y;

  return {
    id: item.id || `l_${idx}`,
    name: item.name,
    agent: {
      id: agentId,
      name: agentName,
      displayName: agentName
    },
    ability: {
      id: abilityId,
      displayName: item.ability
    },
    type: type,
    site: site,
    map: item.map,
    agent_position_norm: {
      x: agentX,
      y: agentY
    },
    ability_position_norm: {
      x: abilityX,
      y: abilityY
    },
    level: item.level || 'easy',
    video: video
  };
});

console.log('Writing output files...');
fs.writeFileSync(outputLineupsPath, JSON.stringify(mappedStrats, null, 2), 'utf8');
fs.writeFileSync(outputIconsPath, JSON.stringify(icons, null, 2), 'utf8');

console.log('Conversion completed successfully!');
