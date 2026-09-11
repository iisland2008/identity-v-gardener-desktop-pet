const groups = [
  {
    key: 'idle', title: '待机状态', note: '默认形态 · 点击随机对话', asset: '../assets/gardener-idle.png',
    lines: [
      '花园需要耐心，任务也是。',
      '工具箱已经准备好了，今天要修整什么呢？',
      '嘘……你听见花开的声音了吗？',
      '休息一会儿也没关系，我会陪着你的。',
      '旧名字留在过去就好。现在，请叫我艾玛。',
      '火焰会留下痕迹，但花园总会重新发芽。',
      '如果椅子坏掉了，大家是不是就能安全一点？'
    ]
  },
  {
    key: 'working', title: '任务进行中', note: '开始专注 · 倒计时运行', asset: '../assets/gardener-working.png',
    lines: [
      '专心一点，我会替你留意四周。',
      '像修整花圃一样，一点一点来就好。',
      '别担心，工具箱里总能找到办法。',
      '这一小步，也在让荒地变成花园。',
      '艾玛正在认真工作，你也要加油呀。',
      '“你的任务”开始啦。我会替你留意四周。'
    ]
  },
  {
    key: 'complete', title: '任务完成', note: '倒计时结束 · 手动完成', asset: '../assets/gardener-complete.png',
    lines: [
      '完成啦！这一朵小花送给认真工作的你。',
      '今天的花园也被照顾得很好。',
      '做得漂亮！现在可以安心休息一下了。',
      '看，努力已经开花了。',
      '任务安全送达——我们配合得真好！',
      '工具箱收好了。需要我时，再叫艾玛吧。'
    ]
  }
];

function removeConnectedWhite(image, canvas) {
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = frame.data;
  const width = canvas.width;
  const height = canvas.height;
  for (let x = 0; x < width; x++) {
    if (data[x * 4 + 3] < 250 || data[((height - 1) * width + x) * 4 + 3] < 250) return;
  }
  const seen = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  const white = (i) => {
    const p = i * 4;
    const max = Math.max(data[p], data[p + 1], data[p + 2]);
    const min = Math.min(data[p], data[p + 1], data[p + 2]);
    return min > 238 && max - min < 12;
  };
  const add = (i) => { if (!seen[i] && white(i)) { seen[i] = 1; queue[tail++] = i; } };
  for (let x = 0; x < width; x++) { add(x); add((height - 1) * width + x); }
  for (let y = 1; y < height - 1; y++) { add(y * width); add(y * width + width - 1); }
  while (head < tail) {
    const i = queue[head++];
    const x = i % width;
    const y = Math.floor(i / width);
    if (x) add(i - 1);
    if (x + 1 < width) add(i + 1);
    if (y) add(i - width);
    if (y + 1 < height) add(i + width);
  }
  for (let i = 0; i < seen.length; i++) if (seen[i]) data[i * 4 + 3] = 0;
  ctx.putImageData(frame, 0, 0);
}

const cards = document.querySelector('#cards');
const jobs = groups.map((group) => {
  const card = document.createElement('section');
  card.className = `card ${group.key}`;
  card.innerHTML = `
    <div class="state-title"><i></i><h2>${group.title}</h2></div>
    <p class="state-note">${group.note}</p>
    <div class="art-wrap"><canvas></canvas></div>
    <div class="lines">${group.lines.map((line) => `<p class="bubble">${line}</p>`).join('')}</div>`;
  cards.appendChild(card);
  const image = new Image();
  image.src = group.asset;
  return image.decode().then(() => removeConnectedWhite(image, card.querySelector('canvas')));
});

Promise.all(jobs).then(() => { document.documentElement.dataset.ready = 'true'; });
