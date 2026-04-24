const { json, sbFetch, getFragmentsWithProgress, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = require('./_supabase');

function getExtensionFromMime(mime) {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  if (mime.includes('mp4')) return 'mp4';
  if (mime.includes('quicktime')) return 'mov';
  if (mime.includes('webm')) return 'webm';
  return 'jpg';
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const id = Number(body.id);
    const dataUrl = String(body.fileDataUrl || body.imageDataUrl || '');
    const fragment = (await getFragmentsWithProgress()).find((f) => f.id === id);
    if (!fragment || !fragment.is_active) return json(res, 404, { error: 'Fragment nicht gefunden.' });
    if (!['image_upload', 'mission'].includes(fragment.type)) return json(res, 400, { error: 'Dieses Fragment erwartet keinen Datei-Upload.' });

    const match = dataUrl.match(/^data:((?:image|video)\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) return json(res, 400, { error: 'Ungültiges Datei-Format.' });

    const mime = match[1];
    const isVideo = mime.startsWith('video/');
    const allowed = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/quicktime',
      'video/webm'
    ];

    if (!allowed.includes(mime)) {
      return json(res, 400, { error: 'Bitte JPG, PNG, WEBP, GIF, MP4, MOV oder WEBM hochladen.' });
    }

    const ext = getExtensionFromMime(mime);
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

    return json(res, 200, { ok: true, fileUrl: publicUrl, imageUrl: publicUrl, isVideo });
  } catch (e) {
    return json(res, 500, { error: 'Datei konnte nicht hochgeladen werden.' });
  }
};
