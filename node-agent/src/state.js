// In-memory runtime state, surfaced by the local dashboard.
const state = {
  wallet: null,
  region: null,
  startedAt: null,
  onChain: false,
  stake: "0",
  lastHeartbeatAt: null,
  jobsRun: 0,
  recent: [], // { at, url, region, status, responseTimeMs, renderOk, submitted, onChain }
  errors: [],
};

function pushRecent(entry) {
  state.recent.unshift({ at: new Date().toISOString(), ...entry });
  state.recent = state.recent.slice(0, 50);
}
function pushError(msg) {
  state.errors.unshift({ at: new Date().toISOString(), msg });
  state.errors = state.errors.slice(0, 20);
}

module.exports = { state, pushRecent, pushError };
