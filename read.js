/**
 * Reads the Power BI screenshots with Claude and returns the rows as JSON.
 * Admin only. Needs ANTHROPIC_API_KEY in Vercel. Optional: ANTHROPIC_MODEL.
 */
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if ((req.headers['x-admin-code'] || '') !== (process.env.ADMIN_CODE || '9999')) return res.status(403).json({ error: 'Admin code needed' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: 'ANTHROPIC_API_KEY is not set in Vercel' });
  let b = req.body;
  try { if (typeof b === 'string') b = JSON.parse(b || '{}'); } catch (e) { return res.status(400).json({ error: 'Bad JSON' }); }
  const images = Array.isArray(b && b.images) ? b.images.slice(0, 6) : [];
  if (!images.length || typeof b.prompt !== 'string') return res.status(400).json({ error: 'Send prompt and images' });
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
        max_tokens: 8000,
        messages: [{ role: 'user', content: [
          ...images.map(i => ({ type: 'image', source: { type: 'base64', media_type: i.type === 'image/png' ? 'image/png' : 'image/jpeg', data: String(i.data) } })),
          { type: 'text', text: b.prompt }
        ] }]
      })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(502).json({ error: 'Claude said ' + r.status + ': ' + ((j.error && j.error.message) || 'request failed') });
    const text = (j.content || []).map(c => c.text || '').join('');
    const m = text.match(/\[[\s\S]*\]/);
    if (!m) return res.status(502).json({ error: 'Could not find the table in the screenshot' });
    return res.status(200).json({ rows: JSON.parse(m[0]) });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Server error' });
  }
};
