const { json, verifyAccessCode, getFragmentsWithProgress } = require('./_supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const role = await verifyAccessCode(String(body.code || '').trim());
    if (!role) return json(res, 401, { error: 'Ungültiger Code.' });

    const fragments = await getFragmentsWithProgress();
    return json(res, 200, {
      ok: true,
      role,
      fragments: fragments.map((f) => ({
        id: f.id,
        type: f.type,
        is_active: f.is_active,
        is_solved: !!f.progress?.is_solved,
      })),
    });
  } catch (e) {
    return json(res, 500, { error: 'Übersicht konnte nicht geladen werden.' });
  }
};
