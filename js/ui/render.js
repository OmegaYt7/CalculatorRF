// ============================================================
// render.js — рисует журнал решения (Log) и сообщения на странице.
// Везде используем textContent (а не innerHTML) — так введённый текст
// не может «сломать» страницу.
// ============================================================
(function () {
  const LA = (window.LA = window.LA || {});
  LA.ui = LA.ui || {};

  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };

  // Таблица-матрица со «скобками» (рисуются в CSS)
  function matrixTable(rows) {
    const t = el('table', 'mat');
    rows.forEach((r) => {
      const tr = el('tr');
      r.forEach((x) => tr.appendChild(el('td', '', String(x))));
      t.appendChild(tr);
    });
    return t;
  }

  // Подпись + матрица в одной строке
  function matrixBlock(label, rows, cls) {
    const box = el('div', cls || 'matbox');
    if (label) box.appendChild(el('span', 'label', label));
    box.appendChild(matrixTable(rows));
    return box;
  }

  LA.ui.render = function (container, log) {
    container.replaceChildren();
    log.items.forEach((it) => {
      if (it.type === 'title') container.appendChild(el('h4', '', it.text));
      else if (it.type === 'text') container.appendChild(el('p', 'step', it.text));
      else if (it.type === 'matrix') container.appendChild(matrixBlock(it.label, it.rows));
      else if (it.type === 'answer') container.appendChild(el('p', 'answer', it.text));
      else if (it.type === 'answerMatrix') container.appendChild(matrixBlock(it.label, it.rows, 'matbox answer'));
    });
  };

  // kind: 'warn' (математически невозможно), 'error' (ошибка ввода / сбой)
  LA.ui.message = function (container, kind, text) {
    container.replaceChildren(el('p', `msg ${kind}`, text));
  };
})();
