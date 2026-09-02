// Basic reachability check: follow redirects, measure latency, capture status.
async function httpCheck(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "DePIN-Monitor-Node/1.0" },
    });
    const responseTimeMs = Date.now() - start;
    // drain body so the socket closes
    await res.arrayBuffer().catch(() => {});
    return {
      ok: res.status >= 200 && res.status < 400,
      httpStatus: res.status,
      responseTimeMs,
      detail: `HTTP ${res.status}`,
    };
  } catch (e) {
    return {
      ok: false,
      httpStatus: null,
      responseTimeMs: Date.now() - start,
      detail: `request failed: ${e.name === "AbortError" ? "timeout" : e.message}`,
    };
  } finally {
    clearTimeout(t);
  }
}

module.exports = { httpCheck };
