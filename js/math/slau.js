// ============================================================
// slau.js — РЕШЕНИЕ СИСТЕМ ЛИНЕЙНЫХ УРАВНЕНИЙ AX = B тремя методами.
// A — матрица коэффициентов (m×n), b — столбец свободных членов (массив длины m).
// Лекции: «Лекции_ЛА_Все», §5 (матричный метод, Крамер, Гаусс, Кронекер–Капелли).
// ============================================================
(function () {
  const LA = (window.LA = window.LA || {});
  const { Fraction, MathError, Log } = LA;
  const ZERO = Fraction.ZERO;
  const mx = () => LA.matrix; // обращаемся лениво: matrix.js уже загружен

  // ---------- вспомогательное ----------
  function showSystem(log, A, b) {
    log.title('Система уравнений:');
    A.forEach((row, i) => {
      log.text(row.map((x, j) => `${x.p()}·x${j + 1}`).join(' + ') + ` = ${b[i]}`);
    });
  }

  function requireSquare(A, method) {
    if (A.length !== A[0].length) {
      throw new MathError(`${method} применим только если число уравнений равно числу неизвестных (сейчас ${A.length} уравн., ${A[0].length} неизв.)`);
    }
  }

  // Самопроверка: подставляем найденное решение обратно в A·x = b
  function verify(A, b, x) {
    A.forEach((row, i) => {
      const s = row.reduce((acc, a, j) => acc.add(a.mul(x[j])), ZERO);
      if (!s.eq(b[i])) throw new Error('внутренняя проверка A·x = b не прошла');
    });
  }

  const solutionText = (x) => x.map((v, i) => `x${i + 1} = ${v}`).join(',  ');

  // ---------- 1. метод Гаусса (работает для любых m×n) ----------
  function gauss(A, b) {
    const m = A.length, n = A[0].length;
    const log = new Log();
    showSystem(log, A, b);
    const M = A.map((row, i) => [...row, b[i]]);              // расширенная матрица (A | b)
    log.matrix('Расширенная матрица (A | b):', M);

    log.title('Прямой ход (приведение к ступенчатому виду):');
    const { pivots } = mx().eliminate(M, n, log);
    const rA = pivots.length;

    // Есть ли строка вида 0 0 … 0 | β, где β ≠ 0?  Тогда r(A|b) = r(A) + 1
    const bad = M.some((row) => row.slice(0, n).every((x) => x.isZero()) && !row[n].isZero());
    const rAug = rA + (bad ? 1 : 0);
    log.text(`r(A) = ${rA},  r(A|b) = ${rAug},  число неизвестных n = ${n}.`);
    if (bad) {
      log.text('Теорема Кронекера–Капелли: r(A) ≠ r(A|b) — система несовместна. (В ступенчатой матрице есть строка 0 … 0 | β, β ≠ 0.)');
      log.answer('Решений нет (система несовместна).');
      log.value = null;
      return log;
    }

    log.title('Обратный ход:');
    for (let i = rA - 1; i >= 0; i--) {
      const c = pivots[i];
      const p = M[i][c];
      M[i] = M[i].map((x) => x.div(p));                          // делаем опорный элемент равным 1
      for (let k = 0; k < i; k++) {                              // обнуляем столбец над ним
        const f = M[k][c];
        if (!f.isZero()) M[k] = M[k].map((x, j) => x.sub(f.mul(M[i][j])));
      }
    }
    log.matrix('Приведённая матрица:', M);

    const free = [];                                             // свободные переменные
    for (let j = 0; j < n; j++) if (!pivots.includes(j)) free.push(j);

    if (free.length === 0) {
      const x = pivots.map((_, i) => M[i][n]);
      verify(A, b, x);
      log.text(`r(A) = r(A|b) = n = ${n} → решение единственно.`);
      log.answer(solutionText(x));
      log.value = x;
      return log;
    }

    // Бесконечно много решений: выражаем зависимые переменные через свободные
    log.text(`r(A) = r(A|b) = ${rA} < n = ${n} → решений бесконечно много. Свободные переменные: ${free.map((j) => `x${j + 1}`).join(', ')}.`);
    const particular = Array(n).fill(ZERO);
    const lines = [];
    pivots.forEach((c, i) => {
      particular[c] = M[i][n];
      let expr = `${M[i][n]}`;
      free.forEach((f) => {
        const k = M[i][f];
        if (k.isZero()) return;
        expr += k.isNeg() ? ` + ${k.neg()}·x${f + 1}` : ` − ${k}·x${f + 1}`;
      });
      lines.push(`x${c + 1} = ${expr}`);
    });
    verify(A, b, particular);                                    // частное решение (свободные = 0)
    log.answer('Общее решение:');
    lines.forEach((l) => log.answer(l));
    log.answer(`(свободные переменные ${free.map((j) => `x${j + 1}`).join(', ')} — любые числа)`);
    log.value = { particular, free };
    return log;
  }

  // ---------- 2. метод Крамера ----------
  function cramer(A, b) {
    requireSquare(A, 'Метод Крамера');
    const n = A.length;
    const D = mx().detValue(A);
    if (D.isZero()) throw new MathError('определитель матрицы системы Δ = 0, метод Крамера неприменим (система либо несовместна, либо имеет бесконечно много решений — используйте метод Гаусса)');
    const log = new Log();
    showSystem(log, A, b);
    log.text('Теорема Крамера: если Δ = |A| ≠ 0, то xᵢ = Δᵢ / Δ, где Δᵢ — определитель, полученный заменой i-го столбца на столбец свободных членов.');
    log.text(`Δ = ${D}`);
    const x = [];
    for (let i = 0; i < n; i++) {
      const Ai = A.map((row, r) => row.map((v, c) => (c === i ? b[r] : v)));
      const Di = mx().detValue(Ai);
      log.matrix(`Матрица для Δ${i + 1} (столбец ${i + 1} заменён на b):`, Ai);
      x.push(Di.div(D));
      log.text(`Δ${i + 1} = ${Di},   x${i + 1} = Δ${i + 1}/Δ = ${Di}/${D} = ${x[i]}`);
    }
    verify(A, b, x);
    log.answer(solutionText(x));
    log.value = x;
    return log;
  }

  // ---------- 3. матричный метод: X = A⁻¹·B ----------
  function matrixMethod(A, b) {
    requireSquare(A, 'Матричный метод');
    const D = mx().detValue(A);
    if (D.isZero()) throw new MathError('матрица системы вырождена (|A| = 0), A⁻¹ не существует — матричный метод неприменим (используйте метод Гаусса)');
    const log = new Log();
    showSystem(log, A, b);
    log.text('Записываем систему как AX = B. Если |A| ≠ 0, то X = A⁻¹·B.');
    const inv = mx().inverse(A);
    log.items.push(...inv.items);                                // шаги вычисления A⁻¹
    log.title('Умножаем A⁻¹ на столбец B:');
    const x = inv.value.map((row, i) => row.reduce((s, a, j) => s.add(a.mul(b[j])), ZERO));
    inv.value.forEach((row, i) => log.text(`x${i + 1} = ${row.map((a, j) => `${a.p()}·${b[j].p()}`).join(' + ')} = ${x[i]}`));
    verify(A, b, x);
    log.answer(solutionText(x));
    log.value = x;
    return log;
  }

  LA.slau = { gauss, cramer, matrixMethod };
})();
