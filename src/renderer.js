const stateAssets = {
  idle: '../assets/gardener-idle.png',
  working: '../assets/gardener-working.png',
  complete: '../assets/gardener-complete.png'
};

const lines = {
  idle: [
    '花园需要耐心，任务也是。',
    '工具箱已经准备好了，今天要修整什么呢？',
    '嘘……你听见花开的声音了吗？',
    '休息一会儿也没关系，我会陪着你的。',
    '旧名字留在过去就好。现在，请叫我艾玛。',
    '火焰会留下痕迹，但花园总会重新发芽。',
    '如果椅子坏掉了，大家是不是就能安全一点？'
  ],
  working: [
    '专心一点，我会替你留意四周。',
    '像修整花圃一样，一点一点来就好。',
    '别担心，工具箱里总能找到办法。',
    '这一小步，也在让荒地变成花园。',
    '艾玛正在认真工作，你也要加油呀。'
  ],
  complete: [
    '完成啦！这一朵小花送给认真工作的你。',
    '今天的花园也被照顾得很好。',
    '做得漂亮！现在可以安心休息一下了。',
    '看，努力已经开花了。',
    '任务安全送达——我们配合得真好！'
  ]
};

const canvas = document.querySelector('#pet-canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const app = document.querySelector('#pet-app');
const panel = document.querySelector('#panel');
const speech = document.querySelector('#speech');
const speechText = document.querySelector('#speech-text');
const statusLabel = document.querySelector('#status-label');
let mode = 'idle';
let speechTimer = null;
let lastLine = '';
let assetsReady = false;
let observedCodexState = 'idle';
const processed = new Map();

function imageToTransparentCanvas(image) {
  const output = document.createElement('canvas');
  output.width = image.naturalWidth;
  output.height = image.naturalHeight;
  const out = output.getContext('2d', { willReadFrequently: true });
  out.drawImage(image, 0, 0);
  const frame = out.getImageData(0, 0, output.width, output.height);
  const data = frame.data;
  const width = output.width;
  const height = output.height;
  const borderHasAlpha = (() => {
    for (let x = 0; x < width; x += 1) {
      if (data[x * 4 + 3] < 250 || data[((height - 1) * width + x) * 4 + 3] < 250) return true;
    }
    return false;
  })();
  if (borderHasAlpha) return output;
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const isBackground = (index) => {
    const p = index * 4;
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    return r > 238 && g > 238 && b > 238 && Math.max(r, g, b) - Math.min(r, g, b) < 12;
  };
  const enqueue = (index) => {
    if (!visited[index] && isBackground(index)) {
      visited[index] = 1;
      queue[tail++] = index;
    }
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) enqueue(index - 1);
    if (x + 1 < width) enqueue(index + 1);
    if (y > 0) enqueue(index - width);
    if (y + 1 < height) enqueue(index + width);
  }

  for (let i = 0; i < visited.length; i += 1) {
    if (visited[i]) data[i * 4 + 3] = 0;
  }
  out.putImageData(frame, 0, 0);
  return output;
}

async function loadState(nextMode) {
  let imageCanvas = processed.get(nextMode);
  if (!imageCanvas) {
    const image = new Image();
    image.src = stateAssets[nextMode];
    await image.decode();
    imageCanvas = imageToTransparentCanvas(image);
    processed.set(nextMode, imageCanvas);
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(imageCanvas, 0, 0, canvas.width, canvas.height);
}

async function preloadStates() {
  await Promise.all(Object.keys(stateAssets).map((state) => loadState(state)));
  await loadState('idle');
}

function randomLine(group = mode) {
  const pool = lines[group];
  const choices = pool.filter((line) => line !== lastLine);
  const line = choices[Math.floor(Math.random() * choices.length)] || pool[0];
  lastLine = line;
  return line;
}

function say(text = randomLine()) {
  clearTimeout(speechTimer);
  speechText.textContent = text;
  speech.classList.add('visible');
  speechTimer = setTimeout(() => speech.classList.remove('visible'), 4600);
}

async function setMode(nextMode) {
  mode = nextMode;
  app.classList.remove('idle', 'working', 'complete');
  app.classList.add(nextMode);
  statusLabel.textContent = { idle: '待机中', working: '任务进行中', complete: '任务完成' }[nextMode];
  await loadState(nextMode);
}

async function togglePanel(force) {
  const open = typeof force === 'boolean' ? force : !panel.classList.contains('open');
  panel.classList.toggle('open', open);
  panel.setAttribute('aria-hidden', String(!open));
  app.classList.toggle('compact', !open);
  await window.petAPI.setCompact(!open);
}

document.querySelector('#talk-button').addEventListener('click', () => say());
document.querySelector('#menu-button').addEventListener('click', () => togglePanel());
document.querySelector('#close-panel').addEventListener('click', () => togglePanel(false));
document.querySelector('#quit-button').addEventListener('click', () => window.petAPI.quit());

window.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  togglePanel();
});

window.petAPI.onCodexState(async (nextMode) => {
  if (!stateAssets[nextMode]) return;
  observedCodexState = nextMode;
  if (!assetsReady || nextMode === mode) return;
  await setMode(nextMode);
  say(randomLine(nextMode));
});

preloadStates()
  .then(async () => {
    assetsReady = true;
    await setMode(observedCodexState);
    setTimeout(() => say(randomLine(observedCodexState)), 400);
  })
  .catch(() => say('图片加载失败，请重新启动园丁桌宠。'));
