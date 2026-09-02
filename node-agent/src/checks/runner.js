const { httpCheck } = require("./http");
const { renderCheck } = require("./render");

// Combine both checks into a single up/down verdict.
// Rule: UP requires HTTP reachable AND render check passing. Either failing => DOWN.
async function runJob(job) {
  const http = await httpCheck(job.url);
  let render = { renderOk: null, httpStatus: null, responseTimeMs: null, detail: "render skipped" };

  try {
    render = await renderCheck(job.url, job.expectedSelector);
  } catch (e) {
    render = { renderOk: false, httpStatus: null, responseTimeMs: null, detail: `render error: ${e.message}` };
  }

  const up = http.ok && render.renderOk !== false;
  return {
    status: up ? "up" : "down",
    httpStatus: http.httpStatus ?? render.httpStatus ?? null,
    responseTimeMs: http.responseTimeMs ?? render.responseTimeMs ?? null,
    renderOk: render.renderOk,
    detail: `http: ${http.detail} | render: ${render.detail}`,
  };
}

module.exports = { runJob };
