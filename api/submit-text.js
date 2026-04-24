const { json, sbFetch, parseAlternatives, answerMatches, getFragmentsWithProgress } = require('./_supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const id = Number(body.id);
    const answer = String(body.answer || '');
    const fragment = (await getFragmentsWithProgress()).find((f) => f.id === id);
    if (!fragment || !fragment.is_active) return json(res, 404, { error: 'Fragment nicht gefunden.' });
    if (fragment.type !== 'text') return json(res, 400, { error: 'Dieses Fragment erwartet keinen Text.' });

    const answers = [fragment.answer_main, ...parseAlternatives(fragment.answer_alternatives)].filter(Boolean);
    const correct = answerMatches(answer, answers);

    if (correct) {
      await sbFetch('/progress', {
        method: 'POST',
        service: true,
        body: {
          fragment_id: id,
          is_solved: true,
          solved_at: new Date().toISOString(),
          solved_text_answer: answer,
          updated_at: new Date().toISOString(),
        },
      });
    }

    return json(res, 200, { ok: true, correct });
  } catch (e) {
    return json(res, 500, { error: 'Antwort konnte nicht geprüft werden.' });
  }
};
