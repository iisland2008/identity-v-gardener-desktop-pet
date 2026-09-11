const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { detectCodexState } = require('../src/codex-status.cjs');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gardener-codex-status-'));
const session = path.join(root, 'session.jsonl');
const now = Date.now();
const line = (time, type) => JSON.stringify({
  timestamp: new Date(time).toISOString(),
  type: 'event_msg',
  payload: { type }
});

fs.writeFileSync(session, `${line(now - 1000, 'task_started')}\n`);
assert.equal(detectCodexState(root, now), 'working');

fs.appendFileSync(session, `${line(now, 'task_complete')}\n`);
assert.equal(detectCodexState(root, now + 1000), 'complete');
assert.equal(detectCodexState(root, now + 9000), 'idle');

fs.appendFileSync(session, `${line(now + 10_000, 'task_started')}\n${line(now + 11_000, 'turn_aborted')}\n`);
assert.equal(detectCodexState(root, now + 12_000), 'idle');

process.stdout.write('Codex lifecycle detection passed.\n');
