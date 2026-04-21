/**
 * Optional proxy to Python service POST /ai/chat when PYTHON_SERVICE_URL is set.
 */
async function forwardPythonChat(message, context) {
  const base = process.env.PYTHON_SERVICE_URL;
  if (!base) return null;

  const url = `${base.replace(/\/$/, "")}/ai/chat`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({ message, context: context || {} }),
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.reply) return { reply: String(data.reply), source: "python" };
    return null;
  } catch {
    clearTimeout(t);
    return null;
  }
}

module.exports = { forwardPythonChat };
