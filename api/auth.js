const { json, verifyAccessCode } = require('./_supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const code = String(body.code || '').trim();
    const role = await verifyAccessCode(code);
    if (!role) return json(res, 401, { ok: false, error: 'Ungültiger Code.' });
    return json(res, 200, { ok: true, role });
  } catch (e) {
    return json(res, 500, { ok: false, error: 'Authentifizierung fehlgeschlagen.' });
  }
};
