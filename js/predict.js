/* 「先に予想 → 実行して答え合わせ」の共通部品。
   Predict.make(boxId, cfg)
     cfg.q       質問文（HTML可）
     cfg.type    'num' | 'pick' | 'text'
     cfg.ch      pick のときの選択肢（配列）
     cfg.unit    num のときの単位（例 '回'）
     cfg.answer  () => 正解（num は数値、pick は添字、text は文字列）
     cfg.show    (正解) => 実行後に出す説明HTML
     cfg.why     いつでも出す補足
     cfg.label   ボタン文言（既定 '実行して確かめる'）
   返り値：{ reset() }  データを変えたときに呼ぶと予想からやり直せる。          */
(function (global) {
  'use strict';
  const $ = id => document.getElementById(id);
  const MARK = '⓪①②③④⑤⑥⑦⑧⑨';

  function make(boxId, cfg) {
    const box = $(boxId);
    let picked = null, done = false;

    function head() {
      return '<p class="pq">' +
        '<span class="pmark">予想</span>' + cfg.q + '</p>';
    }
    function body() {
      if (cfg.type === 'pick') {
        const long = cfg.ch.some(c => String(c).replace(/<[^>]+>/g, '').length > 14);
        return '<div class="choice4' + (long ? ' v' : '') + '" data-p="1">' + cfg.ch.map(function (c, j) {
          return '<button class="btn" data-c="' + j + '" style="text-align:' + (long ? 'left' : 'center') + '">' +
            MARK[j] + '　' + c + '</button>';
        }).join('') + '</div>';
      }
      return '<div class="btn-row" style="margin-top:6px">' +
        '<input type="' + (cfg.type === 'num' ? 'number' : 'text') + '" id="' + boxId + 'in" class="mono pin"' +
        (cfg.placeholder ? ' placeholder="' + cfg.placeholder + '"' : '') + '>' +
        (cfg.unit ? '<span class="unit">' + cfg.unit + '</span>' : '') + '</div>';
    }
    function draw() {
      box.innerHTML = head() + body() +
        '<div class="btn-row" style="margin-top:10px">' +
        '<button class="btn primary" id="' + boxId + 'go">' + (cfg.label || '実行して確かめる') + ' ▶</button>' +
        '<button class="btn ghost" id="' + boxId + 'again">予想し直す</button></div>' +
        '<div class="note" id="' + boxId + 'fb" hidden></div>';

      if (cfg.type === 'pick') {
        box.querySelectorAll('button[data-c]').forEach(function (b) {
          b.addEventListener('click', function () {
            if (done) return;
            picked = +b.dataset.c;
            [...box.querySelectorAll('button[data-c]')].forEach(x => x.classList.remove('on'));
            b.classList.add('on');
          });
        });
      }
      $(boxId + 'go').addEventListener('click', reveal);
      $(boxId + 'again').addEventListener('click', reset);
    }

    function reveal() {
      const real = cfg.answer();
      let mine = picked;
      if (cfg.type !== 'pick') {
        const el = $(boxId + 'in');
        mine = cfg.type === 'num' ? (el.value === '' ? null : Number(el.value)) : el.value.trim();
      }
      const fb = $(boxId + 'fb');
      fb.hidden = false;
      if (mine === null || mine === '' || (cfg.type === 'num' && isNaN(mine))) {
        fb.className = 'note warn';
        fb.innerHTML = '<strong>まず予想を入れてから</strong>押してください。あてずっぽうでもかまいません。' +
          '予想してから見ると、合っていても外れても記憶に残ります。';
        return;
      }
      done = true;
      const ok = cfg.type === 'text'
        ? String(mine).replace(/\s/g, '') === String(real).replace(/\s/g, '')
        : mine === real;
      if (cfg.type === 'pick') {
        const row = box.querySelector('.choice4');
        row.classList.add('locked');
        [...row.children].forEach(function (x) {
          if (+x.dataset.c === real) x.classList.add('correct');
          else if (+x.dataset.c === mine) x.classList.add('wrong');
        });
      }
      const shown = cfg.type === 'pick' ? MARK[real] + '　' + cfg.ch[real] : real + (cfg.unit || '');
      fb.className = 'note ' + (ok ? 'ok' : 'ng');
      fb.innerHTML = '<strong>' + (ok ? '予想どおりです。' : '予想は外れました。') + '</strong>' +
        '実際は <strong>' + shown + '</strong> でした。' +
        (cfg.show ? '<br>' + cfg.show(real) : '') + (cfg.why ? '<br>' + cfg.why : '');
    }

    function reset() { picked = null; done = false; draw(); }
    draw();
    return { reset: reset };
  }

  global.Predict = { make: make };
})(window);
