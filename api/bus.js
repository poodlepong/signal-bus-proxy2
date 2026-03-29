export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { action, q, arsId, lines } = req.query;
  const API_KEY = process.env.BUS_API_KEY;
  const BASE = 'http://ws.bus.go.kr/api/rest/stationinfo';

  let url = '';
  if (action === 'search') {
    url = `${BASE}/getStationByName?serviceKey=${API_KEY}&stSrch=${encodeURIComponent(q)}&resultType=json`;
  } else if (action === 'arrival') {
    url = `${BASE}/getStationByUid?serviceKey=${API_KEY}&arsId=${arsId}&resultType=json`;
  } else {
    return res.status(400).json({ error: 'invalid action' });
  }

  try {
    const r = await fetch(url);
    const text = await r.text();
    try {
      const json = JSON.parse(text);
      const items = json.msgBody?.itemList || [];
      const filtered = lines
        ? items.filter(it => lines.split(',').includes(it.rtNm))
        : items;
      res.status(200).json({ items: filtered });
    } catch {
      // XML 파싱
      const matches = [...text.matchAll(/<itemList>([\s\S]*?)<\/itemList>/g)];
      const items = matches.map(m => {
        const get = tag => m[1].match(new RegExp(`<${tag}>(.*?)<\/${tag}>`))?.[1] || '';
        return { stId: get('stId'), stNm: get('stNm'), arsId: get('arsId'), rtNm: get('rtNm'), arrmsg1: get('arrmsg1'), arrmsg2: get('arrmsg2'), nxtStn: get('nxtStn') };
      });
      const filtered = lines ? items.filter(it => lines.split(',').includes(it.rtNm)) : items;
      res.status(200).json({ items: filtered });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
