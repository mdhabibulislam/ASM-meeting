/**
 * ASM Meeting Desk: database in your GitHub repo.
 * One Vercel function. It reads and writes small JSON files on a "data" branch of your repo
 * using the GitHub Contents API. GitHub's file `sha` is used as a lock, so two ASMs who tap the
 * same time at the same moment cannot both get it (the second one is told it is taken).
 *
 * Environment variables (set in Vercel, never in the page):
 *   GITHUB_TOKEN   fine-grained token with Contents: Read and write on this one repo
 *   GITHUB_REPO    "owner/repo", for example mdhabibulislam/asm-meeting-desk
 *   ADMIN_CODE     admin login code (defaults to 9999)
 *   GITHUB_BRANCH  optional, defaults to "data"
 */
const AREAS = ['Bogura','Naogaon','Barishal','Jashore','Kushtia','Tangail','Dhaka','Cumilla','Sylhet','Thakurgaon','Rajshahi','Satkhira','Khulna','Bagherhat','Borguna','Jhenaidah','Mymensingh','Pabna','Chattogram','Rangpur','Dinajpur','Kishorganj','Madaripur','Sherpur','Gazipur','Lalmonirhat','Noakhali'];
const DEF_CFG = { slotMin: 30, from: '10:00', to: '18:00', off: [5], maxDay: 3 };
const BOOKINGS = 'data/bookings.json', NOTES = 'data/notes.json', CONFIG = 'data/config.json';

const branch = () => process.env.GITHUB_BRANCH || 'data';
const base = () => `https://api.github.com/repos/${process.env.GITHUB_REPO}`;
const headers = () => ({
  Authorization: 'Bearer ' + process.env.GITHUB_TOKEN,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'asm-meeting-desk',
  'Content-Type': 'application/json'
});
const configured = () => !!(process.env.GITHUB_TOKEN && process.env.GITHUB_REPO);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let branchReady = false;

async function ensureBranch() {
  if (branchReady) return;
  const r = await fetch(`${base()}/git/ref/heads/${branch()}`, { headers: headers() });
  if (r.status === 404) {
    const repo = await (await fetch(base(), { headers: headers() })).json();
    const ref = await (await fetch(`${base()}/git/ref/heads/${repo.default_branch}`, { headers: headers() })).json();
    const c = await fetch(`${base()}/git/refs`, { method: 'POST', headers: headers(), body: JSON.stringify({ ref: 'refs/heads/' + branch(), sha: ref.object.sha }) });
    if (!c.ok && c.status !== 422) throw new Error('Could not create the data branch (' + c.status + ')');
  } else if (!r.ok) throw new Error('GitHub said ' + r.status + '. Check GITHUB_TOKEN and GITHUB_REPO.');
  branchReady = true;
}
async function readFile(path, def) {
  await ensureBranch();
  const r = await fetch(`${base()}/contents/${path}?ref=${branch()}`, { headers: headers(), cache: 'no-store' });
  if (r.status === 404) return { data: JSON.parse(JSON.stringify(def)), sha: undefined };
  if (!r.ok) throw new Error('GitHub read failed (' + r.status + ')');
  const j = await r.json();
  return { data: JSON.parse(Buffer.from(j.content, 'base64').toString('utf8')), sha: j.sha };
}
async function writeFile(path, data, sha, message) {
  const r = await fetch(`${base()}/contents/${path}`, {
    method: 'PUT', headers: headers(),
    body: JSON.stringify({ message, branch: branch(), sha, content: Buffer.from(JSON.stringify(data, null, 1)).toString('base64') })
  });
  if (r.status === 409 || r.status === 422) { const e = new Error('conflict'); e.conflict = true; throw e; }
  if (!r.ok) throw new Error('GitHub write failed (' + r.status + ')');
}
/** Read, change, write. If someone else wrote first, read again and retry. fn returns {write, result}. */
async function update(path, def, message, fn) {
  for (let i = 0; i < 8; i++) {
    const { data, sha } = await readFile(path, def);
    const out = await fn(data);
    if (out.write === false) return out.result;
    try { await writeFile(path, data, sha, message); return out.result; }
    catch (e) { if (!e.conflict) throw e; await sleep(120 + Math.random() * 280); }
  }
  throw new Error('Busy. Try again.');
}
async function getCfg() { return { ...DEF_CFG, ...(await readFile(CONFIG, DEF_CFG)).data }; }

const pad = n => String(n).padStart(2, '0');
function checkSlot(s, cfg) {
  if (!s || typeof s !== 'object') return 'Bad request';
  if (!/^\d{4}-\d{2}-\d{2}_\d{4}$/.test(s.id || '')) return 'Bad time';
  const [date, hm] = s.id.split('_');
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getMonth() !== m - 1) return 'Bad date';
  const dim = new Date(y, m, 0).getDate();
  const win = d >= 1 && d <= 9 ? 'start' : (d >= 25 && d <= Math.min(30, dim) ? 'end' : null);
  if (!win || win !== s.window) return 'That day is not in a meeting window';
  if (cfg.off.includes(dt.getDay())) return 'That day is off';
  const min = Number(hm.slice(0, 2)) * 60 + Number(hm.slice(2));
  const [fh, fm] = cfg.from.split(':').map(Number), [th, tm] = cfg.to.split(':').map(Number);
  const from = fh * 60 + fm, to = th * 60 + tm;
  if (min < from || min + cfg.slotMin > to || (min - from) % cfg.slotMin) return 'That time is not available';
  if (!AREAS.includes(s.area)) return 'Unknown area';
  const asm = String(s.asm || '').trim().slice(0, 60);
  if (!asm) return 'Enter the ASM name';
  s.asm = asm; s.date = date; s.month = `${y}-${pad(m)}`; s.min = min; s.time = `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  let b = req.body;
  try { if (typeof b === 'string') b = JSON.parse(b || '{}'); } catch (e) { return res.status(400).json({ error: 'Bad JSON' }); }
  b = b || {};
  if (b.action === 'ping') return res.status(200).json({ ok: configured(), backend: 'github' });
  if (!configured()) return res.status(503).json({ error: 'GITHUB_TOKEN and GITHUB_REPO are not set' });
  const isAdmin = (req.headers['x-admin-code'] || '') === (process.env.ADMIN_CODE || '9999');
  const uid = typeof b.uid === 'string' ? b.uid.slice(0, 40) : '';
  const need = () => { if (!isAdmin) { const e = new Error('Admin code needed'); e.status = 403; throw e; } };
  try {
    switch (b.action) {
      case 'login':
        return res.status(200).json({ ok: isAdmin });

      case 'list': {
        const cfg = await getCfg();
        const { data } = await readFile(BOOKINGS, { slots: {} });
        const slots = Object.values(data.slots).filter(s => s.month === b.month).map(({ uid: u, ...s }) => ({ ...s, mine: !!uid && u === uid }));
        return res.status(200).json({ slots, cfg });
      }

      case 'book': {
        const cfg = await getCfg();
        const slot = { ...(b.slot || {}) };
        const bad = checkSlot(slot, cfg);
        if (bad) return res.status(200).json({ ok: false, reason: 'invalid', error: bad });
        const result = await update(BOOKINGS, { slots: {} }, `Book ${slot.area} ${slot.id}`, d => {
          const all = Object.values(d.slots);
          if (d.slots[slot.id]) return { write: false, result: { ok: false, reason: 'taken' } };
          const mine = all.find(x => x.area === slot.area && x.window === slot.window && x.month === slot.month);
          if (mine && !isAdmin && mine.uid !== uid) return { write: false, result: { ok: false, reason: 'locked' } };
          const sameDay = all.filter(x => x.date === slot.date && (!mine || x.id !== mine.id)).length;
          if (sameDay >= Number(cfg.maxDay)) return { write: false, result: { ok: false, reason: 'full' } };
          if (mine) delete d.slots[mine.id];
          d.slots[slot.id] = { id: slot.id, date: slot.date, min: slot.min, time: slot.time, month: slot.month, window: slot.window, area: slot.area, asm: slot.asm, uid, bookedAt: Date.now(), status: 'booked' };
          return { result: { ok: true } };
        });
        return res.status(200).json(result);
      }

      case 'cancel': {
        const result = await update(BOOKINGS, { slots: {} }, `Remove ${b.id}`, d => {
          const s = d.slots[b.id];
          if (!s) return { write: false, result: { ok: true } };
          if (!isAdmin && s.uid !== uid) return { write: false, result: { ok: false, reason: 'locked' } };
          delete d.slots[b.id];
          return { result: { ok: true } };
        });
        return res.status(200).json(result);
      }

      case 'patch': {
        need();
        const status = b.status === 'done' ? 'done' : 'booked';
        const result = await update(BOOKINGS, { slots: {} }, `Mark ${b.id} ${status}`, d => {
          if (!d.slots[b.id]) return { write: false, result: { ok: false } };
          d.slots[b.id].status = status; return { result: { ok: true } };
        });
        return res.status(200).json(result);
      }

      case 'notes.list': { need(); const { data } = await readFile(NOTES, { notes: [] }); return res.status(200).json({ notes: data.notes.slice().sort((a, c) => c.ts - a.ts) }); }
      case 'notes.add': {
        need();
        const n = b.note || {};
        if (!AREAS.includes(n.area) || !String(n.text || '').trim()) return res.status(400).json({ error: 'Bad note' });
        const note = { id: 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), area: n.area, text: String(n.text).slice(0, 4000), date: /^\d{4}-\d{2}-\d{2}$/.test(n.date || '') ? n.date : '', asm: String(n.asm || '').slice(0, 60), ts: Date.now() };
        await update(NOTES, { notes: [] }, `Note for ${note.area}`, d => { d.notes.push(note); if (d.notes.length > 2000) d.notes.shift(); return { result: true }; });
        return res.status(200).json({ ok: true });
      }
      case 'notes.del': { need(); await update(NOTES, { notes: [] }, 'Delete note', d => { d.notes = d.notes.filter(x => x.id !== b.id); return { result: true }; }); return res.status(200).json({ ok: true }); }

      case 'config.save': {
        need();
        const c = b.cfg || {};
        const cfg = {
          slotMin: [20, 30, 45, 60].includes(+c.slotMin) ? +c.slotMin : 30,
          from: /^\d{2}:\d{2}$/.test(c.from) ? c.from : '10:00',
          to: /^\d{2}:\d{2}$/.test(c.to) ? c.to : '18:00',
          off: Array.isArray(c.off) ? c.off.map(Number).filter(n => n >= 0 && n <= 6) : [5],
          maxDay: Math.min(6, Math.max(1, +c.maxDay || 3))
        };
        await update(CONFIG, DEF_CFG, 'Change meeting hours', d => { Object.keys(d).forEach(k => delete d[k]); Object.assign(d, cfg); return { result: true }; });
        return res.status(200).json({ ok: true });
      }
      default: return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || 'Server error' });
  }
};
