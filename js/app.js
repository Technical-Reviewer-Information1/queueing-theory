(function () {
  'use strict';
  const C = window.Chart, T = window.Tools, $ = id => document.getElementById(id);
  const NS = 'http://www.w3.org/2000/svg';
  function el(n, a, t) { const e = document.createElementNS(NS, n); for (const k in a) if (a[k] != null) e.setAttribute(k, a[k]); if (t != null) e.textContent = t; return e; }

  /* 本文と同じ度数分布 */
  const ARR = [
    { range: '0以上〜30未満', mid: 0, n: 5 },
    { range: '30以上〜90未満', mid: 1, n: 12 },
    { range: '90以上〜150未満', mid: 2, n: 15 },
    { range: '150以上〜210未満', mid: 3, n: 10 },
    { range: '210以上〜270未満', mid: 4, n: 8 }
  ];
  const TOTAL = 50;
  const REL = ARR.map(a => a.n / TOTAL);
  const CUM = REL.map((_, i) => REL.slice(0, i + 1).reduce((x, y) => x + y, 0));

  /* ---------- STEP1 表の空欄 ---------- */
  function drawArr() {
    let h = '<thead><tr><th>到着間隔（秒）</th><th>階級値</th><th>人数</th><th>相対度数</th><th>累積相対度数</th></tr></thead><tbody>';
    ARR.forEach((a, i) => {
      const blankRel = (i === 2), blankCum = (i === 2);
      h += '<tr><td>' + a.range + '</td><td>' + a.mid + '分</td><td>' + a.n + '</td>' +
        '<td>' + (blankRel ? '<input class="blankin" type="text" inputmode="decimal" data-k="rel" aria-label="相対度数">' : REL[i].toFixed(2)) + '</td>' +
        '<td>' + (blankCum ? '<input class="blankin" type="text" inputmode="decimal" data-k="cum" aria-label="累積相対度数">' : CUM[i].toFixed(2)) + '</td></tr>';
    });
    h += '<tr><td>合計</td><td>—</td><td>' + TOTAL + '</td><td>1.00</td><td>—</td></tr>';
    $('arrTable').innerHTML = h + '</tbody>';
  }
  function checkArr() {
    let ok = 0, tot = 0;
    $('arrTable').querySelectorAll('input').forEach(inp => {
      tot++;
      const ans = inp.dataset.k === 'rel' ? REL[2] : CUM[2];
      const got = parseFloat(inp.value);
      if (Math.abs(got - ans) < 0.006) { inp.classList.add('ok'); inp.classList.remove('ng'); ok++; }
      else { inp.classList.add('ng'); inp.classList.remove('ok'); }
    });
    const fb = $('arrFb'); fb.hidden = false;
    fb.className = 'note ' + (ok === tot ? 'ok' : 'ng');
    fb.innerHTML = ok === tot
      ? '正解です。相対度数は <strong>0.30</strong>、累積相対度数は <strong>0.64</strong>。本文の解答群では ② と ⑤ です。'
      : ok + ' / ' + tot + ' 正解。「計算のしかたを見る」で式を確認しましょう。';
  }
  function showArr() {
    const fb = $('arrFb'); fb.hidden = false; fb.className = 'note info';
    fb.innerHTML = '相対度数 ＝ <span class="mono">15 ÷ 50 ＝ 0.30</span><br>' +
      '累積相対度数 ＝ <span class="mono">0.10 ＋ 0.24 ＋ 0.30 ＝ 0.64</span>（または前の行の 0.34 に 0.30 を足す）';
  }

  /* ---------- STEP2 乱数対応 ---------- */
  function drawMap() {
    let h = '<thead><tr><th>乱数の範囲</th><th>到着間隔</th></tr></thead><tbody>';
    ARR.forEach((a, i) => {
      const lo = i === 0 ? 0 : CUM[i - 1];
      h += '<tr id="maprow' + i + '"><td class="mono">' + lo.toFixed(2) + ' 以上 ' +
        (i === ARR.length - 1 ? '1.00' : CUM[i].toFixed(2)) + ' 未満</td><td>' + a.mid + ' 分</td></tr>';
    });
    $('mapTable').innerHTML = h + '</tbody>';
    const RND = [{ p: '2人目', r: 0.12 }, { p: '3人目', r: 0.61 }, { p: '4人目', r: null }, { p: '5人目', r: 0.26 }];
    $('rndTable').innerHTML = '<thead><tr><th>客</th><th>生成した乱数</th><th>到着間隔</th></tr></thead><tbody>' +
      '<tr><td>1人目</td><td>—</td><td>0 分</td></tr>' +
      RND.map(x => '<tr><td>' + x.p + '</td><td>' + (x.r == null ? '<strong style="color:var(--warn)">？</strong>' : x.r.toFixed(2)) +
        '</td><td>' + (x.r == null ? '3 分' : gap(x.r) + ' 分') + '</td></tr>').join('') + '</tbody>';
  }
  function gap(r) {
    for (let i = 0; i < CUM.length; i++) if (r < CUM[i]) return ARR[i].mid;
    return ARR[ARR.length - 1].mid;
  }
  function rollOne() {
    const r = Math.random();
    const g = gap(r);
    const idx = ARR.findIndex(a => a.mid === g);
    $('mapTable').querySelectorAll('tr').forEach(t => t.style.background = '');
    const row = $('maprow' + idx); if (row) row.style.background = 'var(--warn-bg)';
    $('rollOut').innerHTML = '乱数 <strong>' + r.toFixed(3) + '</strong> → 到着間隔 <strong>' + g + ' 分</strong>';
  }

  /* ---------- STEP3 ガントチャート ---------- */
  let gaps = [0, 1, 2, 3, 1], svc = 4;
  function simulate(gapsArr, service, lanes) {
    lanes = lanes || 1;
    const free = new Array(lanes).fill(0);
    let t = 0;
    const rows = [];
    gapsArr.forEach((g, i) => {
      t += g;
      const k = free.indexOf(Math.min(...free));
      const start = Math.max(t, free[k]);
      const end = start + service;
      free[k] = end;
      rows.push({ i: i + 1, gap: g, arrive: t, start, end, wait: start - t });
    });
    return rows;
  }
  function peakWaiting(rows) {
    const events = [];
    rows.forEach(r => { events.push([r.arrive, 1]); events.push([r.start, -1]); });
    events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    let cur = 0, best = 0, at = 0;
    events.forEach(([t, d]) => { cur += d; if (cur > best) { best = cur; at = t; } });
    return { peak: best, at };
  }
  function drawGantt() {
    const rows = simulate(gaps, svc, 1);
    const endMax = Math.max(...rows.map(r => r.end));
    const W = Math.max(560, endMax * 22 + 120), H = rows.length * 34 + 52;
    const L = 62, R = 20, unit = (W - L - R) / Math.max(1, endMax);
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': '待ち行列のガントチャート' });
    for (let t = 0; t <= endMax; t += (endMax > 40 ? 5 : 2)) {
      svg.appendChild(el('line', { x1: L + t * unit, y1: 22, x2: L + t * unit, y2: H - 24, class: 'gline' }));
      svg.appendChild(el('text', { x: L + t * unit, y: H - 8, class: 'gtick' }, t));
    }
    const pk = peakWaiting(rows);
    if (pk.peak > 0) svg.appendChild(el('line', { x1: L + pk.at * unit, y1: 16, x2: L + pk.at * unit, y2: H - 24, class: 'peak' }));
    rows.forEach((r, i) => {
      const y = 26 + i * 34;
      svg.appendChild(el('text', { x: L - 8, y: y + 11, class: 'glabel', 'text-anchor': 'end' }, r.i + '人目'));
      if (r.wait > 0) svg.appendChild(el('rect', { x: L + r.arrive * unit, y: y, width: r.wait * unit, height: 22, class: 'wait' }));
      svg.appendChild(el('rect', { x: L + r.start * unit, y: y, width: svc * unit, height: 22, class: 'serve' }));
      if (r.wait > 0) svg.appendChild(el('text', { x: L + (r.arrive + r.wait / 2) * unit, y: y + 11,
        class: 'gtick', fill: '#4a4f57' }, r.wait + '分待ち'));
    });
    svg.appendChild(el('text', { x: L, y: 12, class: 'gtick', 'text-anchor': 'start' }, '時間（分）'));
    const box = $('gantt'); box.innerHTML = ''; box.appendChild(svg);

    const waits = rows.map(r => r.wait);
    $('mPeak').textContent = pk.peak;
    $('mMaxWait').textContent = Math.max(...waits);
    $('mAvgWait').textContent = (waits.reduce((a, b) => a + b, 0) / waits.length).toFixed(1);
    $('mEnd').textContent = endMax;
    $('qTable').innerHTML = '<thead><tr><th>客</th><th>到着間隔</th><th>到着時刻</th><th>乗車開始</th><th>乗車終了</th><th>待ち時間</th></tr></thead><tbody>' +
      rows.map(r => '<tr><td>' + r.i + '</td><td class="mono">' + r.gap + '</td><td class="mono">' + r.arrive +
        '</td><td class="mono">' + r.start + '</td><td class="mono">' + r.end + '</td><td class="mono" style="color:' +
        (r.wait > svc ? 'var(--ng)' : 'var(--ink)') + '">' + r.wait + '</td></tr>').join('') + '</tbody>';
    const n = $('qNote');
    const avgGap = gaps.slice(1).reduce((a, b) => a + b, 0) / Math.max(1, gaps.length - 1);
    n.className = avgGap < svc ? 'note ng' : 'note ok';
    n.innerHTML = '最も待ち人数が多いのは <strong>' + pk.at + ' 分</strong>のときで <strong>' + pk.peak +
      ' 人</strong>、最も長い待ち時間は <strong>' + Math.max(...waits) + ' 分</strong>です。<br>' +
      '平均の到着間隔は ' + avgGap.toFixed(1) + ' 分、乗車時間は ' + svc + ' 分。' +
      (avgGap < svc
        ? '<strong>到着のほうが速いので、行列はどんどん伸びていきます。</strong>後ろの人ほど待ち時間が長くなっているはずです。'
        : '到着間隔のほうが長いので、行列は伸び続けません。');
    $('qTools').innerHTML = '';
    $('qTools').appendChild(T.saveButton(() => svg, '待ち行列のガントチャート'));
  }
  function reRun() {
    const n = Math.max(2, Math.min(30, parseInt($('nPeople').value, 10) || 5));
    svc = Math.max(1, Math.min(15, parseInt($('svcTime').value, 10) || 4));
    gaps = [0];
    for (let i = 1; i < n; i++) gaps.push(gap(Math.random()));
    drawGantt();
  }

  /* ---------- STEP4 くり返し ---------- */
  function runMany() {
    const service = +$('svc2').value, lanes = +$('lanes').value;
    const avgs = [], maxs = [];
    for (let k = 0; k < 100; k++) {
      const g = [0];
      for (let i = 1; i < 50; i++) g.push(gap(Math.random()));
      const rows = simulate(g, service, lanes);
      const w = rows.map(r => r.wait);
      avgs.push(w.reduce((a, b) => a + b, 0) / w.length);
      maxs.push(Math.max(...w));
    }
    const av = avgs.reduce((a, b) => a + b, 0) / avgs.length;
    const mx = maxs.reduce((a, b) => a + b, 0) / maxs.length;
    $('sAvg').textContent = av.toFixed(1);
    $('sMax').textContent = mx.toFixed(1);
    const lo = Math.floor(Math.min(...avgs)), hi = Math.ceil(Math.max(...avgs));
    const w = Math.max(1, Math.ceil((hi - lo) / 8));
    const cnt = new Array(Math.max(1, Math.ceil((hi - lo) / w))).fill(0);
    const edges = cnt.map((_, i) => lo + i * w).concat([lo + cnt.length * w]);
    avgs.forEach(v => { let i = Math.floor((v - lo) / w); if (i >= cnt.length) i = cnt.length - 1; if (i < 0) i = 0; cnt[i]++; });
    C.hist($('manyChart'), { W: 700, H: 280, counts: cnt, edges, unit: '回' });
    const n = $('manyNote');
    n.className = av > 20 ? 'note ng' : av > 8 ? 'note warn' : 'note ok';
    n.innerHTML = '乗車時間 ' + service + ' 分・窓口 ' + lanes + ' つで50人を通したとき、平均待ち時間は <strong>' +
      av.toFixed(1) + ' 分</strong>、最大待ち時間の平均は <strong>' + mx.toFixed(1) + ' 分</strong>。<br>' +
      'ヒストグラムは100回それぞれの平均待ち時間の分布です。<strong>同じ条件でもこれだけばらつきます。</strong>' +
      (lanes > 1 ? '窓口を増やすと待ち時間が大きく減ることが確かめられます。' : '窓口を2つに増やして比べてみましょう。');
  }

  /* ---------- STEP5 クイズ ---------- */
  const QUIZ = [
    { t: '人数15人、全体50人のとき、相対度数はいくらか。', choices: ['0.30', '0.15', '0.64', '0.47'], a: '0.30',
      why: '15 ÷ 50 ＝ 0.30 です。相対度数は「その階級が全体に占める割合」を表します。' },
    { t: '累積相対度数が 0.34 の次の階級で、相対度数が 0.30 のとき、累積相対度数はいくらか。',
      choices: ['0.64', '0.30', '0.34', '0.94'], a: '0.64',
      why: '0.34 ＋ 0.30 ＝ 0.64。累積相対度数は、その階級までの相対度数を足していった値です。' },
    { t: '乱数0.73が出たとき、到着間隔は何分になるか（累積相対度数 0.10/0.34/0.64/0.84/1.00）。',
      choices: ['3分', '2分', '1分', '4分'], a: '3分',
      why: '0.64以上0.84未満の範囲なので、その階級の階級値である3分になります。' },
    { t: '待ち時間はどのように求めるか。',
      choices: ['乗車開始時刻 − 到着時刻', '乗車終了時刻 − 到着時刻', '到着間隔 − 乗車時間', '乗車時間 × 前に並んでいる人数'],
      a: '乗車開始時刻 − 到着時刻',
      why: '着いてから乗り始めるまでが待ち時間です。乗車時間は待ち時間には含めません。' },
    { t: '平均の到着間隔が2分、乗車時間が4分のとき、行列はどうなるか。',
      choices: ['どんどん伸びていく', '一定の長さで落ち着く', '短くなっていく', '人数によって決まらない'],
      a: 'どんどん伸びていく',
      why: '2分に1人来るのに、1人に4分かかるので、処理が追いつきません。<strong>到着間隔＜サービス時間</strong>のとき行列は伸び続けます。' },
    { t: '同じ条件でシミュレーションしても平均待ち時間が毎回変わるのはなぜか。',
      choices: ['到着間隔を乱数で決めているから', 'コンピュータの計算誤差', '人数がちがうから', '乗車時間が変わるから'],
      a: '到着間隔を乱数で決めているから',
      why: '確率的モデルなので実行のたびに結果が変わります。だから何回もくり返して平均やばらつきを見ます。' }
  ];
  let qList = [], qi = 0, qScore = 0;
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function startQuiz() { qList = shuffle(QUIZ); qi = 0; qScore = 0; renderQ(); }
  function renderQ() {
    if (qi >= qList.length) {
      $('qText').textContent = qScore + ' / ' + qList.length + ' 問正解';
      $('qChoices').innerHTML = ''; $('qFb').hidden = true; $('qNext').disabled = true;
      $('qProgress').textContent = qList.length + ' / ' + qList.length; return;
    }
    const it = qList[qi];
    $('qProgress').textContent = (qi + 1) + ' / ' + qList.length;
    $('qScore').textContent = qScore;
    $('qText').textContent = it.t;
    const box = $('qChoices'); box.className = 'choice4'; box.innerHTML = '';
    shuffle(it.choices).forEach(c => {
      const b = document.createElement('button');
      b.className = 'btn'; b.textContent = c; b.dataset.c = c;
      b.addEventListener('click', () => answerQ(c));
      box.appendChild(b);
    });
    $('qFb').hidden = true; $('qNext').disabled = true;
    $('qNext').textContent = (qi === qList.length - 1) ? '結果を見る' : '次の問題';
  }
  function answerQ(c) {
    const it = qList[qi], ok = c === it.a, box = $('qChoices');
    box.classList.add('locked');
    [...box.children].forEach(b => {
      if (b.dataset.c === it.a) b.classList.add('correct');
      else if (b.dataset.c === c) b.classList.add('wrong');
    });
    if (ok) qScore++;
    const fb = $('qFb');
    fb.className = 'note ' + (ok ? 'ok' : 'ng');
    fb.innerHTML = (ok ? '正解。' : '正解は「<strong>' + it.a + '</strong>」。') + it.why;
    fb.hidden = false;
    $('qScore').textContent = qScore; $('qNext').disabled = false;
  }

  function init() {
    $('checkArr').addEventListener('click', checkArr);
    $('showArr').addEventListener('click', showArr);
    $('resetArr').addEventListener('click', () => { drawArr(); $('arrFb').hidden = true; });
    $('rollOne').addEventListener('click', rollOne);
    $('rollClear').addEventListener('click', () => {
      $('rollOut').textContent = '—';
      $('mapTable').querySelectorAll('tr').forEach(t => t.style.background = '');
    });
    $('useBook').addEventListener('click', () => {
      gaps = [0, 1, 2, 3, 1]; svc = 4;
      $('nPeople').value = 5; $('svcTime').value = 4; drawGantt();
    });
    $('reRun').addEventListener('click', reRun);
    ['nPeople', 'svcTime'].forEach(i => $(i).addEventListener('change', reRun));
    ['svc2', 'lanes'].forEach(i => $(i).addEventListener('input', () => {
      $('svc2V').textContent = $('svc2').value; $('lanesV').textContent = $('lanes').value;
    }));
    $('runMany').addEventListener('click', runMany);
    $('qNext').addEventListener('click', () => { qi++; renderQ(); });
    $('qReset').addEventListener('click', startQuiz);
    window.Terms.glossary($('glossBox'), ['待ち行列', '乱数', '確率的モデル', 'シミュレーション', '相対度数', '累積度数', '階級値', 'パラメータ']);
    drawArr(); drawMap(); drawGantt(); startQuiz();
    window.Terms.attach();
  }
  if (window.Predict) Predict.make('pdQ', {
    q: '店が「ぎりぎりさばけている」状態のとき、お客の来る間隔が<strong>ほんの少しだけ短く</strong>なりました。待ち時間はどうなるでしょう？',
    type: 'pick',
    ch: ['短くなった分だけ、少し増える', 'まったく変わらない', '急に何倍にもふくれあがることがある', '短くなる'],
    answer: function () { return 2; },
    show: function () {
      return '待ち行列は<strong>サービスが追いつくかどうかの境目</strong>で急に伸びます。' +
             '処理が間に合っているうちは列はほとんどできませんが、到着がサービスの速さに追いつくと、さばき切れなかった人が次々と積み上がっていきます。';
    },
    why: '混雑は<strong>比例では増えません</strong>。「少し混んだだけなのに待ち時間が倍以上になった」というのは、' +
         'レジ・道路・サーバーなど、どんな待ち行列でも起こります。STEP 4 で窓口を増やしたり処理時間を縮めたりすると、' +
         '<strong>境目から離すだけで待ちが大きく減る</strong>ことを確かめられます。'
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
