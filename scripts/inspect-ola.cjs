const axios = require('axios');

async function testTargetSnippet() {
  const url = 'https://v6.olamovies.mov/categories/movies';
  const res = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    },
  });

  const matches = res.data.match(/self\.__next_f\.push\(\[1,"(.*?)"\]\)/gs) || [];
  let fullPayload = '';
  for (const m of matches) {
    const raw = m.slice(24, -3);
    try { fullPayload += JSON.parse(`"${raw}"`); } catch (e) { fullPayload += raw; }
  }

  const idx = fullPayload.indexOf('/movies/the-uprising-2026');
  console.log(fullPayload.slice(idx + 1800, idx + 2600));
}

testTargetSnippet();
