const fs = require('fs');
const path = require('path');

const COMPLETE_VISIBLE_MS = 8_000;
const ACTIVE_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const RECENT_FILE_MS = 8 * 60 * 60 * 1000;
const READ_CHUNK_BYTES = 64 * 1024;
const LINE_PREFIX_LIMIT = 2048;

function listSessionFiles(root, now = Date.now()) {
  if (!fs.existsSync(root)) return [];
  const files = [];
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(target);
      } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        try {
          const stat = fs.statSync(target);
          if (now - stat.mtimeMs <= RECENT_FILE_MS) files.push({ path: target, mtimeMs: stat.mtimeMs });
        } catch {}
      }
    }
  }
  return files.sort((a, b) => b.mtimeMs - a.mtimeMs).slice(0, 12);
}

function lifecycleFromLine(line) {
  const typePosition = line.indexOf('"type":"event_msg"');
  if (typePosition < 0 || typePosition > 180) return null;
  if (!line.includes('"type":"task_started"')
    && !line.includes('"type":"task_complete"')
    && !line.includes('"type":"turn_aborted"')) return null;
  try {
    const event = JSON.parse(line);
    const kind = event.payload?.type;
    const time = Date.parse(event.timestamp);
    if (!['task_started', 'task_complete', 'turn_aborted'].includes(kind) || !Number.isFinite(time)) return null;
    return { kind, time, active: kind === 'task_started' };
  } catch {
    return null;
  }
}

function readLifecycleDelta(filePath, startOffset = 0, initialPrefix = '') {
  const stat = fs.statSync(filePath);
  if (stat.size < startOffset) startOffset = 0;
  const buffer = Buffer.alloc(READ_CHUNK_BYTES);
  const descriptor = fs.openSync(filePath, 'r');
  const events = [];
  let offset = startOffset;
  let prefix = initialPrefix;
  try {
    while (offset < stat.size) {
      const length = Math.min(buffer.length, stat.size - offset);
      const bytesRead = fs.readSync(descriptor, buffer, 0, length, offset);
      if (!bytesRead) break;
      const chunk = buffer.toString('utf8', 0, bytesRead);
      let position = 0;
      while (position < chunk.length) {
        const newline = chunk.indexOf('\n', position);
        const end = newline === -1 ? chunk.length : newline;
        if (prefix.length < LINE_PREFIX_LIMIT) {
          prefix += chunk.slice(position, Math.min(end, position + LINE_PREFIX_LIMIT - prefix.length));
        }
        if (newline === -1) break;
        const event = lifecycleFromLine(prefix);
        if (event) events.push(event);
        prefix = '';
        position = newline + 1;
      }
      offset += bytesRead;
    }
  } finally {
    fs.closeSync(descriptor);
  }
  return { events, offset: stat.size, prefix };
}

function latestLifecycleEvent(filePath) {
  const { events } = readLifecycleDelta(filePath);
  return events.at(-1) || null;
}

function detectCodexState(sessionsRoot, now = Date.now()) {
  const events = [];
  for (const file of listSessionFiles(sessionsRoot, now)) {
    try {
      const event = latestLifecycleEvent(file.path);
      if (event) events.push(event);
    } catch {}
  }
  if (events.some((event) => event.active && now - event.time <= ACTIVE_MAX_AGE_MS)) return 'working';
  const latest = events.sort((a, b) => b.time - a.time)[0];
  if (latest?.kind === 'task_complete' && now - latest.time <= COMPLETE_VISIBLE_MS) return 'complete';
  return 'idle';
}

class CodexStatusMonitor {
  constructor({ sessionsRoot, onState, intervalMs = 700 }) {
    this.sessionsRoot = sessionsRoot;
    this.onState = onState;
    this.intervalMs = intervalMs;
    this.timer = null;
    this.state = null;
    this.trackers = new Map();
  }

  check() {
    const now = Date.now();
    const files = listSessionFiles(this.sessionsRoot, now);
    const present = new Set(files.map((file) => file.path));
    for (const [filePath] of this.trackers) {
      if (!present.has(filePath)) this.trackers.delete(filePath);
    }
    for (const file of files) {
      const tracker = this.trackers.get(file.path) || { offset: 0, prefix: '', latest: null };
      try {
        const delta = readLifecycleDelta(file.path, tracker.offset, tracker.prefix);
        tracker.offset = delta.offset;
        tracker.prefix = delta.prefix;
        if (delta.events.length) tracker.latest = delta.events.at(-1);
        this.trackers.set(file.path, tracker);
      } catch {}
    }
    const events = [...this.trackers.values()].map((tracker) => tracker.latest).filter(Boolean);
    let next = 'idle';
    if (events.some((event) => event.active && now - event.time <= ACTIVE_MAX_AGE_MS)) {
      next = 'working';
    } else {
      const latest = events.sort((a, b) => b.time - a.time)[0];
      if (latest?.kind === 'task_complete' && now - latest.time <= COMPLETE_VISIBLE_MS) next = 'complete';
    }
    if (next !== this.state) {
      this.state = next;
      this.onState(next);
    }
    return next;
  }

  start() {
    this.stop();
    this.check();
    this.timer = setInterval(() => this.check(), this.intervalMs);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

module.exports = { CodexStatusMonitor, detectCodexState, latestLifecycleEvent, readLifecycleDelta };
