import https from 'https';

https.get('https://valorant-api.com/v1/competitivetiers', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const latest = json.data[json.data.length - 1];
      console.log('TIERS UUID:', latest.uuid);
      const radiant = latest.tiers.find(t => t.tierName.toLowerCase().includes('radiant'));
      console.log('RADIANT TIER:', radiant);
    } catch (err) {
      console.error('Parse error:', err);
    }
  });
}).on('error', (err) => {
  console.error('Fetch error:', err.message);
});
