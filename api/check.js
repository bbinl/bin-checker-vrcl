export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Only POST allowed' });
    return;
  }

  const { bins } = req.body;

  if (!bins || !Array.isArray(bins)) {
    res.status(400).json({ error: 'Invalid input: bins array is required.' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  for (const bin of bins) {
    if (bin && bin.trim().length >= 6) {
      try {
        const apiURL = `https://bin-db.vercel.app/api/bin?bin=${bin.trim()}`;
        const apiRes = await fetch(apiURL);
        const data = await apiRes.json();
        res.write(`data: ${JSON.stringify({ ...data, originalBin: bin })}\n\n`);
      } catch (err) {
        res.write(`data: ${JSON.stringify({ originalBin: bin, error: err.message || 'Error' })}\n\n`);
      }
      await new Promise(resolve => setTimeout(resolve, 300)); // Delay to avoid rate-limiting
    }
  }

  res.write(`event: done\ndata: complete\n\n`);
  res.end();
}
