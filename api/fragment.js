const { json, verifyAccessCode, getFragmentsWithProgress, getPublicStorageUrl } = require('./_supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const role = (await verifyAccessCode(String(body.code || '').trim())) || 'player';
    const id = Number(body.id);
    if (!Number.isInteger(id) || id < 1) return json(res, 400, { error: 'Ungültige Fragmentnummer.' });

    const fragment = (await getFragmentsWithProgress()).find((f) => f.id === id);
    if (!fragment || !fragment.is_active) return json(res, 404, { error: 'Fragment nicht gefunden.' });

    const solved = !!fragment.progress?.is_solved;
    const response = {
      ok: true,
      role,
      id: fragment.id,
      type: fragment.type,
      is_solved: solved,
      is_active: fragment.is_active,
      question: fragment.question || '',
      reference_image_url: getPublicStorageUrl(fragment.reference_image_url) || null,
      intro_text: fragment.intro_text || '',
      intro_image_url: fragment.intro_image_url || null,
      is_gift: !!fragment.is_gift,
    };

    if (solved) {
      if (fragment.type === 'image_upload') response.uploaded_image_url = fragment.progress?.uploaded_image_url || null;
      else response.answer_main = fragment.answer_main || '';
    }

    return json(res, 200, response);
  } catch (e) {
    return json(res, 500, { error: 'Fragment konnte nicht geladen werden.' });
  }
};
