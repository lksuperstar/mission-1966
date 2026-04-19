const { json, verifyAccessCode, sbFetch, getFragmentsWithProgress, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = require('./_supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const role = await verifyAccessCode(String(body.code || '').trim());
    if (!role) return json(res, 401, { error: 'Ungültiger Code.' });
    const id = Number(body.id);
    const dataUrl = String(body.imageDataUrl || '');
    const fragment = (await getFragmentsWithProgress()).find((f) => f.id === id);
    if (!fragment) return json(res, 404, { error: 'Fragment nicht gefunden.' });
    if (fragment.type !== 'image_upload') return json(res, 400, { error: 'Dieses Fragment erwartet kein Bild.' });
    const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) return json(res, 400, { error: 'Ungültiges Bildformat.' });

    const mime = match[1];
    const ext = mime.includes('png') ? 'png' : 'jpg';
    const buffer = Buffer.from(match[2], 'base64');
    const filePath = `fragment-${id}-${Date.now()}.${ext}`;

    const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/mission-images/${filePath}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': mime,
        'x-upsert': 'true',
      },
      body: buffer,
    });
    const uploadText = await uploadRes.text();
    if (!uploadRes.ok) return json(res, 500, { error: uploadText || 'Upload fehlgeschlagen.' });

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/mission-images/${filePath}`;
    await sbFetch('/progress', {
      method: 'POST',
      service: true,
      body: {
        fragment_id: id,
        is_solved: true,
        solved_at: new Date().toISOString(),
        uploaded_image_url: publicUrl,
        updated_at: new Date().toISOString(),
      },
    });

    return json(res, 200, { ok: true, imageUrl: publicUrl });
  } catch (e) {
    return json(res, 500, { error: 'Bild konnte nicht hochgeladen werden.' });
  }
};
