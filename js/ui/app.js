// ============================================================
// app.js — «склейка»: создаёт поля ввода, кнопки команд и вкладки.
// Каждая команда = подпись кнопки + какие данные нужны + какая функция считает.
// Нажатие кнопки: читаем данные -> вызываем математику -> рисуем журнал
// (или сообщение об ошибке).
// ============================================================
(function () {
  const LA = window.LA;
  const { MatrixGrid, ScalarInput, render, message, initKeypad } = LA.ui;
  const M = LA.matrix, V = LA.vector, S = LA.slau;
  const $ = (id) => document.getElementById(id);

  // ---------- выполнение команды (одно место для всех вкладок) ----------
  function execute(cmd, sources, out) {
    const t0 = performance.now();
    try {
      const data = {};
      cmd.needs.forEach((name) => { data[name] = sources[name].read(); }); // читаем только нужные данные
      const log = cmd.run(data);                                            // математика
      render(out, log);                                                     // показываем шаги и ответ
      const ms = performance.now() - t0;
      const note = document.createElement('p');
      note.className = 'time';
      note.textContent = `Время вычисления: ${ms.toFixed(1)} мс` + (ms > 10000 ? ' (больше 10 с!)' : '');
      out.appendChild(note);
    } catch (e) {
      if (e instanceof LA.MathError) message(out, 'warn', `Невозможно выполнить операцию: ${e.message}.`);
      else if (e instanceof LA.InputError) message(out, 'error', `Ошибка ввода — ${e.message}.`);
      else { console.error(e); message(out, 'error', `Сбой в ходе выполнения операции: ${e.message || e}.`); }
    }
  }

  function buildButtons(root, commands, sources, out) {
    commands.forEach((cmd) => {
      const b = document.createElement('button');
      b.className = 'cmd';
      b.textContent = cmd.label;
      b.addEventListener('click', () => execute(cmd, sources, out));
      root.appendChild(b);
    });
  }

  // ================= ВКЛАДКА «МАТРИЦЫ» =================
  const gA = new MatrixGrid($('gridA'), { name: 'Матрица A', rows: 3, cols: 3 });
  const gB = new MatrixGrid($('gridB'), { name: 'Матрица B', rows: 3, cols: 3 });
  const kM = new ScalarInput($('scalarM'), 'Число k', 'k =', '2');
  const matrixSources = { A: gA, B: gB, k: kM };
  buildButtons($('cmdMatrix'), [
    { label: 'A + B', needs: ['A', 'B'], run: (d) => M.add(d.A, d.B) },
    { label: 'A − B', needs: ['A', 'B'], run: (d) => M.sub(d.A, d.B) },
    { label: 'k·A', needs: ['A', 'k'], run: (d) => M.scale(d.A, d.k, 'A') },
    { label: 'k·B', needs: ['B', 'k'], run: (d) => M.scale(d.B, d.k, 'B') },
    { label: 'A · B', needs: ['A', 'B'], run: (d) => M.multiply(d.A, d.B) },
    { label: 'B · A', needs: ['A', 'B'], run: (d) => M.multiply(d.B, d.A) },
    { label: 'Aᵀ', needs: ['A'], run: (d) => M.transpose(d.A, 'A') },
    { label: 'Bᵀ', needs: ['B'], run: (d) => M.transpose(d.B, 'B') },
    { label: 'det A', needs: ['A'], run: (d) => M.det(d.A) },
    { label: 'det B', needs: ['B'], run: (d) => M.det(d.B) },
    { label: 'rang A', needs: ['A'], run: (d) => M.rank(d.A, 'A') },
    { label: 'rang B', needs: ['B'], run: (d) => M.rank(d.B, 'B') },
    { label: 'A⁻¹', needs: ['A'], run: (d) => M.inverse(d.A) },
  ], matrixSources, $('outMatrix'));
  $('exMatrix').addEventListener('click', () => {            // пример из лекции 1 (слайды 8 и 13)
    gA.fill([[2, 3, -4], [1, 0, 5]]);
    gB.fill([[2, 1, 0], [3, 2, 4], [4, -3, 1]]);
  });

  // ================= ВКЛАДКА «СЛАУ» =================
  const gS = new MatrixGrid($('gridS'), { name: 'Система', rows: 2, cols: 2, extraCols: 1, rowLabel: 'уравнений', colLabel: 'неизвестных' });
  gS.fill([[2, 3, -1], [3, 4, -1]]);                          // пример из лекции (слайд 45)
  const sysSource = {
    read() {                                                   // делим таблицу на A и столбец b
      const rows = gS.read();
      return { A: rows.map((r) => r.slice(0, -1)), b: rows.map((r) => r[r.length - 1]) };
    },
  };
  buildButtons($('cmdSlau'), [
    { label: 'Матричный метод', needs: ['s'], run: (d) => S.matrixMethod(d.s.A, d.s.b) },
    { label: 'Метод Крамера', needs: ['s'], run: (d) => S.cramer(d.s.A, d.s.b) },
    { label: 'Метод Гаусса', needs: ['s'], run: (d) => S.gauss(d.s.A, d.s.b) },
  ], { s: sysSource }, $('outSlau'));
  $('exSlau').addEventListener('click', () => gS.fill([[1, 1, 1, 6], [0, 2, 5, -4], [2, 5, -1, 27]])); // 3x3, ответ (5;3;-2)

  // ================= ВКЛАДКА «ВЕКТОРЫ» =================
  const gVa = new MatrixGrid($('vecA'), { name: 'Вектор a', rows: 1, cols: 3, controls: false });
  const gVb = new MatrixGrid($('vecB'), { name: 'Вектор b', rows: 1, cols: 3, controls: false });
  const gVc = new MatrixGrid($('vecC'), { name: 'Вектор c', rows: 1, cols: 3, controls: false });
  const kV = new ScalarInput($('scalarV'), 'Число k', 'k =', '2');
  const row = (g) => ({ read: () => g.read()[0] });            // вектор = единственная строка сетки
  const vecSources = { a: row(gVa), b: row(gVb), c: row(gVc), k: kV };
  $('vecDim').addEventListener('change', () => {               // размерность векторов
    const n = parseInt($('vecDim').value, 10);
    [gVa, gVb, gVc].forEach((g) => g.setSize(1, n));
  });
  buildButtons($('cmdVector'), [
    { label: 'a + b', needs: ['a', 'b'], run: (d) => V.add(d.a, d.b) },
    { label: 'a − b', needs: ['a', 'b'], run: (d) => V.sub(d.a, d.b) },
    { label: 'k·a', needs: ['a', 'k'], run: (d) => V.scale(d.a, d.k) },
    { label: '(a, b) скалярное', needs: ['a', 'b'], run: (d) => V.dotProduct(d.a, d.b) },
    { label: '[a, b] векторное', needs: ['a', 'b'], run: (d) => V.cross(d.a, d.b) },
    { label: '(a, b, c) смешанное', needs: ['a', 'b', 'c'], run: (d) => V.mixed(d.a, d.b, d.c) },
    { label: '|a| длина', needs: ['a'], run: (d) => V.length(d.a) },
    { label: 'угол (a, b)', needs: ['a', 'b'], run: (d) => V.angle(d.a, d.b) },
    { label: 'проекция a на b', needs: ['a', 'b'], run: (d) => V.projection(d.a, d.b) },
    { label: 'a ∥ b ?', needs: ['a', 'b'], run: (d) => V.collinear(d.a, d.b) },
    { label: 'a, b, c компланарны?', needs: ['a', 'b', 'c'], run: (d) => V.coplanar(d.a, d.b, d.c) },
  ], vecSources, $('outVector'));
  $('exVector').addEventListener('click', () => {
    $('vecDim').value = 3;
    gVa.fill([[1, 2, 3]]); gVb.fill([[4, 5, 6]]); gVc.fill([[7, 8, 10]]);
  });

  // ================= ВКЛАДКИ И КЛАВИАТУРА =================
  document.querySelectorAll('nav button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('nav button').forEach((b) => b.classList.toggle('on', b === btn));
      document.querySelectorAll('.panel').forEach((p) => { p.hidden = p.id !== btn.dataset.tab; });
    });
  });
  initKeypad($('keypad'));
})();
