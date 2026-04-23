import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET = 'mission-images';

function buildImageUrlCandidates(baseName, projectUrl) {
  if (!baseName) return null;

  const extensions = ['.jpg', '.jpeg', '.png', '.webp'];

  return extensions.map(
    ext =>
      `${projectUrl}/storage/v1/object/public/${BUCKET}/${baseName}${ext}`
  );
}

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Fragment ID fehlt' });
  }

  const { data: fragment, error } = await supabase
    .from('fragments')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const { data: progress } = await supabase
    .from('progress')
    .select('*')
    .eq('fragment_id', id)
    .single();

  const projectUrl = process.env.SUPABASE_URL;

  let introImageCandidates = null;

  if (fragment.intro_image_name) {
    introImageCandidates = buildImageUrlCandidates(
      fragment.intro_image_name,
      projectUrl
    );
  }

  return res.status(200).json({
    ...fragment,
    progress,
    introImageCandidates
  });
}
