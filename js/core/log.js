// ============================================================
// log.js — «журнал решения». Каждая операция не просто считает ответ,
// а записывает сюда промежуточные действия (требование задания).
// Затем ui/render.js рисует журнал на странице.
// ============================================================
(function () {
  const LA = (window.LA = window.LA || {});

  class Log {
    constructor() {
      this.items = [];   // записи журнала по порядку
      this.value = null; // «сырой» результат (нужен тестам)
    }
    title(s) { this.items.push({ type: 'title', text: s }); return this; }
    text(s) { this.items.push({ type: 'text', text: s }); return this; }
    // rows копируем, т.к. дальше алгоритм продолжит менять матрицу
    matrix(label, rows) { this.items.push({ type: 'matrix', label, rows: rows.map((r) => r.slice()) }); return this; }
    answer(s) { this.items.push({ type: 'answer', text: s }); return this; }
    answerMatrix(label, rows) { this.items.push({ type: 'answerMatrix', label, rows: rows.map((r) => r.slice()) }); return this; }
  }

  LA.Log = Log;
})();
