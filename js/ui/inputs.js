// ============================================================
// inputs.js — поля ввода: сетка-матрица, одно число и экранная клавиатура.
// Ввод с клавиатуры — обычные <input>. Ввод мышью — кнопки экранной клавиатуры:
// они вставляют символ в ту клетку, где стоит курсор.
// ============================================================
(function () {
  const LA = (window.LA = window.LA || {});
  LA.ui = LA.ui || {};

  let active = null; // клетка, в которую сейчас «пишет» экранная клавиатура

  // Любая клетка калькулятора помечена классом .cell — запоминаем, какая в фокусе
  document.addEventListener('focusin', (e) => {
    if (e.target.classList && e.target.classList.contains('cell')) active = e.target;
  });

  function makeCell(value) {
    const inp = document.createElement('input');
    inp.className = 'cell';
    inp.type = 'text';
    inp.inputMode = 'decimal';
    inp.autocomplete = 'off';
    inp.value = value;
    // Подсвечиваем красным, если текст нельзя разобрать как число
    inp.addEventListener('input', () => {
      try { LA.Fraction.parse(inp.value); inp.classList.remove('bad'); } catch (e) { inp.classList.add('bad'); }
    });
    return inp;
  }

  // ---------- сетка-матрица ----------
  class MatrixGrid {
    // opts: name (для сообщений), rows, cols, extraCols (столбец свободных членов), controls, max
    constructor(root, opts) {
      this.root = root;
      this.name = opts.name;
      this.rows = opts.rows;
      this.cols = opts.cols;
      this.extra = opts.extraCols || 0;
      this.max = opts.max || 8;
      this.cells = [];
      if (opts.controls !== false) this.buildControls(opts.rowLabel || 'строк', opts.colLabel || 'столбцов');
      this.table = document.createElement('div');
      this.table.className = 'grid';
      root.appendChild(this.table);
      this.build();
    }

    buildControls(rowLabel, colLabel) {
      const bar = document.createElement('div');
      bar.className = 'sizebar';
      const mk = (label, key) => {
        const lab = document.createElement('label');
        lab.textContent = label + ' ';
        const inp = document.createElement('input');
        inp.type = 'number'; inp.min = 1; inp.max = this.max; inp.value = this[key];
        inp.addEventListener('change', () => {
          const v = Math.max(1, Math.min(this.max, parseInt(inp.value, 10) || 1)); // размер от 1 до max
          inp.value = v;
          this[key] = v;
          this.build();
        });
        lab.appendChild(inp);
        bar.appendChild(lab);
      };
      mk(rowLabel, 'rows');
      mk(colLabel, 'cols');
      this.root.appendChild(bar);
    }

    // Перестраиваем сетку; старые значения сохраняем, новые клетки = 0
    build() {
      const old = this.cells.map((r) => r.map((c) => c.value));
      const totalCols = this.cols + this.extra;
      this.table.replaceChildren();
      this.table.style.gridTemplateColumns = `repeat(${totalCols}, 3.6rem)`;
      this.cells = [];
      for (let i = 0; i < this.rows; i++) {
        const row = [];
        for (let j = 0; j < totalCols; j++) {
          const c = makeCell(old[i] && old[i][j] !== undefined ? old[i][j] : '0');
          if (this.extra && j === this.cols) c.classList.add('free');   // столбец свободных членов
          c.addEventListener('keydown', (e) => this.onKey(e, i, j, totalCols));
          this.table.appendChild(c);
          row.push(c);
        }
        this.cells.push(row);
      }
    }

    // Enter/стрелки — перемещение между клетками
    onKey(e, i, j, totalCols) {
      const go = (di, dj) => { const t = this.cells[i + di] && this.cells[i + di][j + dj]; if (t) { e.preventDefault(); t.focus(); t.select(); } };
      const c = this.cells[i][j];
      if (e.key === 'Enter') {
        if (j + 1 < totalCols) go(0, 1); else go(1, -(totalCols - 1));
      } else if (e.key === 'ArrowDown') go(1, 0);
      else if (e.key === 'ArrowUp') go(-1, 0);
      else if (e.key === 'ArrowRight' && c.selectionStart === c.value.length) go(0, 1);
      else if (e.key === 'ArrowLeft' && c.selectionStart === 0) go(0, -1);
    }

    setSize(rows, cols) { this.rows = rows; this.cols = cols; this.build(); this.syncControls(); }
    syncControls() {
      const ins = this.root.querySelectorAll('.sizebar input');
      if (ins[0]) ins[0].value = this.rows;
      if (ins[1]) ins[1].value = this.cols;
    }
    fill(values) { // values — массив строк; используется кнопками «пример»
      this.setSize(values.length, values[0].length - this.extra);
      values.forEach((r, i) => r.forEach((v, j) => { this.cells[i][j].value = String(v); this.cells[i][j].classList.remove('bad'); }));
    }

    // Читаем все клетки в матрицу дробей. Ошибка указывает точное место.
    read() {
      return this.cells.map((row, i) => row.map((c, j) => {
        try { return LA.Fraction.parse(c.value); } catch (e) {
          if (e instanceof LA.InputError) throw new LA.InputError(`${this.name}, строка ${i + 1}, столбец ${j + 1}: ${e.message}`);
          throw e;
        }
      }));
    }
  }

  // ---------- одно число (например, множитель k) ----------
  class ScalarInput {
    constructor(root, name, label, value) {
      this.name = name;
      const lab = document.createElement('label');
      lab.textContent = label + ' ';
      this.cell = makeCell(value);
      lab.appendChild(this.cell);
      root.appendChild(lab);
    }
    read() {
      try { return LA.Fraction.parse(this.cell.value); } catch (e) {
        if (e instanceof LA.InputError) throw new LA.InputError(`${this.name}: ${e.message}`);
        throw e;
      }
    }
  }

  // ---------- экранная клавиатура ----------
  function initKeypad(root) {
    const press = (key) => {
      if (!active) return;
      const inp = active;
      if (key === 'back') {
        const s = inp.selectionStart, e = inp.selectionEnd;
        if (s !== e) inp.setRangeText('', s, e, 'end');
        else if (s > 0) inp.setRangeText('', s - 1, s, 'end');
      } else if (key === 'clear') inp.value = '';
      else if (key === 'left') inp.setSelectionRange(Math.max(0, inp.selectionStart - 1), Math.max(0, inp.selectionStart - 1));
      else if (key === 'right') inp.setSelectionRange(inp.selectionStart + 1, inp.selectionStart + 1);
      else if (key === 'next') {                                     // следующая клетка по порядку на странице
        const all = [...document.querySelectorAll('.panel:not([hidden]) .cell')];
        const t = all[all.indexOf(inp) + 1];
        if (t) { t.focus(); t.select(); }
        return;
      } else inp.setRangeText(key, inp.selectionStart, inp.selectionEnd, 'end');
      inp.dispatchEvent(new Event('input'));                         // чтобы сработала подсветка ошибок
      inp.focus();
    };
    root.querySelectorAll('button[data-key]').forEach((b) => {
      b.addEventListener('mousedown', (e) => e.preventDefault());   // кнопка не должна отнимать фокус у клетки
      b.addEventListener('click', () => press(b.dataset.key));
    });
  }

  LA.ui.MatrixGrid = MatrixGrid;
  LA.ui.ScalarInput = ScalarInput;
  LA.ui.initKeypad = initKeypad;
})();
