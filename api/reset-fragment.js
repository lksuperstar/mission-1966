const { json, verifyAdminCode, sbFetch } = require('./_supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const isAdmin = await verifyAdminCode(String(body.code || '').trim());
    if (!isAdmin) return json(res, 401, { error: 'Admin-Code erforderlich.' });
    const id = Number(body.id);
    if (!Number.isInteger(id) || id < 1 || id > 50) return json(res, 400, { error: 'Ungültige Fragmentnummer.' });

    const updated = await sbFetch(`/progress?fragment_id=eq.${id}`, {
      method: 'PATCH',
      service: true,
      body: {
        is_solved: false,
        solved_at: null,
        solved_text_answer: null,
        uploaded_image_url: null,
        updated_at: new Date().toISOString(),
      },
    });

    return json(res, 200, { ok: true, updated });
  } catch (e) {
    return json(res, 500, { error: 'Fragment konnte nicht zurückgesetzt werden.' });
  }
};
