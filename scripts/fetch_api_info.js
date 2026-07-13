async function getMapsImageUrls() {
  const url = 'https://api.strats.gg/internal/api/v1/games/valorant/maps';
  const res = await fetch(url);
  const maps = await res.json();
  for (const m of maps) {
    console.log(`Map: ${m.name} (id: ${m.id})`);
    for (const ms of m.map_sources) {
      console.log(`  Source ID: ${ms.id}`);
      console.log(`  Source URL: ${ms.source_url}`);
      console.log(`  Overview: ${ms.overview}`);
    }
    console.log('--------------------------------------------------');
  }
}

getMapsImageUrls();
