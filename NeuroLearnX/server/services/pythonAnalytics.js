/**
 * Optional call to the Python PyMongo analytics microservice.
 * If PYTHON_SERVICE_URL is unset or unreachable, returns null (Node analytics still work).
 */
async function fetchPythonAnalytics() {
  const base = process.env.PYTHON_SERVICE_URL;
  if (!base) return null;

  const url = `${base.replace(/\/$/, "")}/analytics/summary`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4000);

  try {
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    clearTimeout(t);
    return null;
  }
}

module.exports = { fetchPythonAnalytics };
