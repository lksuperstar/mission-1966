const { json, verifyAccessCode, getFragmentsWithProgress, parseAlternatives } = require('./_supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const role = await verifyAccessCode(String(body.code || '').trim());
    if (!role) return json(res, 401, { error: 'Ungültiger Code.' });
    const id = Number(body.id);
    if (!Number.isInteger(id) || id < 1) return json(res, 400, { error: 'Ungültige Fragmentnummer.' });

    const fragment = (await getFragmentsWithProgress()).find((f) => f.id === id);
    if (!fragment) return json(res, 404, { error: 'Fragment nicht gefunden.' });

    const solved = !!fragment.progress?.is_solved;
    const response = {
      ok: true,
      id: fragment.id,
      type: fragment.type,
      is_solved: solved,
      is_active: fragment.is_active,
      question: fragment.question || '',
      reference_image_url: fragment.reference_image_url || null,
    };

    if (solved) {
      if (fragment.type === 'image_upload') {
        response.uploaded_image_url = fragment.progress?.uploaded_image_url || null;
      } else {
        response.answer_main = fragment.answer_main;
        response.answer_alternatives = parseAlternatives(fragment.answer_alternatives);
      }
    }

    return json(res, 200, response);
  } catch (e) {
    return json(res, 500, { error: 'Fragment konnte nicht geladen werden.' });
  }
};
