const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function json(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

function getPublicBase() {
  return `${SUPABASE_URL}/rest/v1`;
}

async function sbFetch(path, { method = 'GET', body, headers = {}, service = false } = {}) {
  const key = service ? SUPABASE_SERVICE_ROLE_KEY : SUPABASE_ANON_KEY;
  const res = await fetch(`${getPublicBase()}${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation,resolution=merge-duplicates',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(typeof data === 'string' ? data : JSON.stringify(data));
  }
  return data;
}

async function getSetting(key) {
  const data = await sbFetch(`/settings?key=eq.${encodeURIComponent(key)}&select=value&limit=1`, { service: true });
  return data?.[0]?.value || null;
}

async function verifyAccessCode(code) {
  if (!code) return null;
  const player = await getSetting('player_code');
  const admin = await getSetting('admin_code');
  if (code === admin) return 'admin';
  if (code === player) return 'player';
  return null;
}

function parseAlternatives(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/[;,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalize(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/nr\.?\s*/g, 'nummer ')
    .replace(/hh?[:;.,\- ]?mm/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function singularize(token) {
  const variants = new Set([token]);
  for (const suffix of ['en', 'er', 'e', 'n', 's']) {
    if (token.length > suffix.length + 2 && token.endsWith(suffix)) {
      variants.add(token.slice(0, -suffix.length));
    }
  }
  return [...variants];
}

function editDistance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[a.length][b.length];
}

function answerMatches(input, answers) {
  const inputNorm = normalize(input);
  if (!inputNorm) return false;

  const expandedAnswers = new Set();
  for (const answer of answers) {
    const norm = normalize(answer);
    if (!norm) continue;
    expandedAnswers.add(norm);
    singularize(norm).forEach((v) => expandedAnswers.add(v));
  }

  if (expandedAnswers.has(inputNorm)) return true;
  for (const variant of singularize(inputNorm)) {
    if (expandedAnswers.has(variant)) return true;
  }

  for (const answer of expandedAnswers) {
    const maxLen = Math.max(answer.length, inputNorm.length);
    const dist = editDistance(answer, inputNorm);
    if (maxLen <= 4 && dist === 0) return true;
    if (maxLen <= 7 && dist <= 1) return true;
    if (maxLen > 7 && dist <= 2) return true;
  }
  return false;
}

async function getFragmentsWithProgress() {
  const fragments = await sbFetch('/fragments?select=id,question,type,answer_main,answer_alternatives,reference_image_url,is_active&order=id.asc', { service: true });
  const progress = await sbFetch('/progress?select=fragment_id,is_solved,solved_at,uploaded_image_url,solved_text_answer', { service: true });
  const map = new Map(progress.map((p) => [p.fragment_id, p]));
  return fragments.map((f) => ({
    ...f,
    progress: map.get(f.id) || null,
  }));
}

module.exports = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  json,
  sbFetch,
  getSetting,
  verifyAccessCode,
  parseAlternatives,
  normalize,
  answerMatches,
  getFragmentsWithProgress,
};
