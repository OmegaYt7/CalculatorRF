// ============================================================
// matrix.js — ВСЕ ОПЕРАЦИИ С МАТРИЦАМИ.
// Матрица = массив строк, строка = массив дробей: [[a11,a12],[a21,a22]].
// Каждая функция возвращает Log (журнал шагов + ответ).
// Лекции: 1 (действия над матрицами), 3 (определители, миноры, алг. дополнения),
//         «Лекции_ЛА_Все» (обратная матрица, ранг).
// ============================================================
(function () {
  const LA = (window.LA = window.LA || {});
  const { Fraction, MathError, Log } = LA;
  const ZERO = Fraction.ZERO, ONE = Fraction.ONE;

  // ---------- вспомогательное ----------
  const size = (A) => `${A.length}×${A[0].length}`;
  const clone = (A) => A.map((r) => r.slice());
  const sameSize = (A, B) => A.length === B.length && A[0].length === B[0].length;
  function requireSquare(A, what) {
    if (A.length !== A[0].length) throw new MathError(`${what} определён только для квадратной матрицы (сейчас ${size(A)})`);
  }
  // Минор: матрица без i-й строки и j-го столбца (лекция 3)
  const minor = (A, i, j) => A.filter((_, r) => r !== i).map((row) => row.filter((_, c) => c !== j));

  // ---------- 1. сложение / вычитание (поэлементно) ----------
  function addSub(A, B, sign) {
    const op = sign > 0 ? '+' : '−';
    if (!sameSize(A, B)) {
      throw new MathError(`${sign > 0 ? 'сложение' : 'вычитание'} возможно только для матриц одинакового размера (A — ${size(A)}, B — ${size(B)})`);
    }
    const log = new Log();
    log.text(`Операция выполняется поэлементно: c[i][j] = a[i][j] ${op} b[i][j].`);
    log.matrix('Подставляем элементы:', A.map((r, i) => r.map((x, j) => `${x.p()} ${op} ${B[i][j].p()}`)));
    const C = A.map((r, i) => r.map((x, j) => (sign > 0 ? x.add(B[i][j]) : x.sub(B[i][j]))));
    log.answerMatrix(`A ${op} B =`, C);
    log.value = C;
    return log;
  }

  // ---------- 2. умножение на число ----------
  function scale(A, k, name = 'A') {
    const log = new Log();
    log.text('Каждый элемент матрицы умножается на число k.');
    log.matrix('Подставляем:', A.map((r) => r.map((x) => `${k.p()}·${x.p()}`)));
    const C = A.map((r) => r.map((x) => x.mul(k)));
    log.answerMatrix(`k·${name} (k = ${k}) =`, C);
    log.value = C;
    return log;
  }

  // ---------- 3. умножение матриц ----------
  function multiply(A, B) {
    if (A[0].length !== B.length) {
      throw new MathError(`умножение A·B невозможно: число столбцов A (${A[0].length}) должно равняться числу строк B (${B.length})`);
    }
    const log = new Log();
    log.text(`Размер A — ${size(A)}, B — ${size(B)}, значит A·B будет ${A.length}×${B[0].length}.`);
    log.text('c[i][j] = сумма a[i][k]·b[k][j] (строка i матрицы A на столбец j матрицы B).');
    log.matrix('Подставляем:', A.map((row, i) => B[0].map((_, j) => row.map((x, k) => `${x.p()}·${B[k][j].p()}`).join(' + '))));
    const C = A.map((row) => B[0].map((_, j) => row.reduce((s, x, k) => s.add(x.mul(B[k][j])), ZERO)));
    log.answerMatrix('A·B =', C);
    log.value = C;
    return log;
  }

  // ---------- 4. транспонирование ----------
  function transpose(A, name = 'A') {
    const log = new Log();
    log.text('Строки становятся столбцами: элемент [i][j] переходит на место [j][i].');
    const T = A[0].map((_, j) => A.map((row) => row[j]));
    log.answerMatrix(`${name}ᵀ =`, T);
    log.value = T;
    return log;
  }

  // ---------- ядро: метод Гаусса (приведение к ступенчатому виду) ----------
  // Меняет M «на месте». Исключение ищется только в первых ncols столбцах
  // (остальные — например, столбец свободных членов — просто едут вместе со строкой).
  // Возвращает { pivots: номера опорных столбцов, swaps: число перестановок строк }.
  function eliminate(M, ncols, log) {
    const rows = M.length;
    const pivots = [];
    let swaps = 0;
    let r = 0; // текущая строка, в которую ставим опорный элемент
    for (let c = 0; c < ncols && r < rows; c++) {
      let p = r;
      while (p < rows && M[p][c].isZero()) p++;      // ищем ненулевой элемент в столбце
      if (p === rows) continue;                       // в столбце одни нули — идём дальше
      if (p !== r) {
        [M[p], M[r]] = [M[r], M[p]];                  // перестановка строк
        swaps++;
        if (log) log.text(`Меняем местами строки ${r + 1} и ${p + 1}.`);
      }
      for (let i = r + 1; i < rows; i++) {            // обнуляем всё под опорным элементом
        if (M[i][c].isZero()) continue;
        const f = M[i][c].div(M[r][c]);
        for (let k = c; k < M[i].length; k++) M[i][k] = M[i][k].sub(f.mul(M[r][k]));
        if (log) log.text(`R${i + 1} ← R${i + 1} − (${f})·R${r + 1}`);
      }
      pivots.push(c);
      r++;
      if (log) log.matrix(`После обработки столбца ${c + 1}:`, M);
    }
    return { pivots, swaps };
  }

  // ---------- 5. определитель ----------
  // Без журнала: по Гауссу det = (−1)^(перестановки) · произведение диагонали
  function detValue(A) {
    const n = A.length;
    const M = clone(A);
    const { pivots, swaps } = eliminate(M, n, null);
    if (pivots.length < n) return ZERO;
    let d = ONE;
    for (let i = 0; i < n; i++) d = d.mul(M[i][i]);
    return swaps % 2 ? d.neg() : d;
  }

  function det(A) {
    requireSquare(A, 'Определитель');
    const n = A.length;
    const log = new Log();
    let value;
    if (n === 1) {
      value = A[0][0];
      log.text('Определитель первого порядка: |A| = a11.');
    } else if (n === 2) {
      const [[a, b], [c, d]] = A;
      value = a.mul(d).sub(b.mul(c));
      log.text('Определитель второго порядка: |A| = a11·a22 − a12·a21.');
      log.text(`|A| = ${a.p()}·${d.p()} − ${b.p()}·${c.p()}`);
    } else if (n === 3) {
      // Разложение по первой строке: |A| = Σ a1j · A1j, где A1j = (−1)^(1+j) · M1j
      log.text('Разложение по первой строке: |A| = a11·A11 + a12·A12 + a13·A13, где Aij = (−1)^(i+j)·Mij.');
      value = ZERO;
      const parts = [];
      for (let j = 0; j < 3; j++) {
        const m = minor(A, 0, j);
        const mv = detValue(m);
        const sign = j % 2 === 0 ? 1 : -1;
        const alg = sign > 0 ? mv : mv.neg();
        log.matrix(`Минор M(1,${j + 1}) = ${mv}`, m);
        log.text(`A(1,${j + 1}) = (−1)^(1+${j + 1})·M(1,${j + 1}) = ${alg}`);
        value = value.add(A[0][j].mul(alg));
        parts.push(`${A[0][j].p()}·${alg.p()}`);
      }
      log.text(`|A| = ${parts.join(' + ')}`);
    } else {
      // Порядок 4 и выше: приводим к треугольному виду (свойства определителей, лекция 3):
      // прибавление строки, умноженной на число, определитель не меняет; перестановка строк меняет знак.
      log.text('Порядок ≥ 4: приводим матрицу к треугольному виду. Прибавление к строке другой строки, умноженной на число, определитель не меняет; перестановка двух строк меняет знак.');
      const M = clone(A);
      const { pivots, swaps } = eliminate(M, n, log);
      if (pivots.length < n) {
        value = ZERO;
        log.text('В треугольной матрице на диагонали появился нуль, поэтому |A| = 0.');
      } else {
        value = M.reduce((p, row, i) => p.mul(row[i]), ONE);
        if (swaps % 2) value = value.neg();
        log.text(`|A| = (−1)^${swaps} · произведение диагонали = ${value}`);
      }
    }
    log.answer(`|A| = ${value}`);
    log.value = value;
    return log;
  }

  // ---------- 6. ранг ----------
  function rankValue(A) {
    return eliminate(clone(A), A[0].length, null).pivots.length;
  }

  function rank(A, name = 'A') {
    const log = new Log();
    log.text('Приводим матрицу к ступенчатому виду элементарными преобразованиями строк. Ранг = число ненулевых строк.');
    const M = clone(A);
    const { pivots } = eliminate(M, A[0].length, log);
    log.answer(`rang(${name}) = ${pivots.length}`);
    log.value = pivots.length;
    return log;
  }

  // ---------- 7. обратная матрица (через присоединённую) ----------
  function inverse(A) {
    requireSquare(A, 'Обратная матрица');
    const n = A.length;
    const d = detValue(A);
    if (d.isZero()) throw new MathError('матрица вырождена (|A| = 0), обратной матрицы не существует');
    const log = new Log();
    log.text(`|A| = ${d} ≠ 0, значит обратная матрица существует: A⁻¹ = (1/|A|)·(присоединённая матрица), где присоединённая матрица — это транспонированная матрица алгебраических дополнений.`);
    const C = A.map((row, i) => row.map((_, j) => {
      if (n === 1) return ONE;
      const mv = detValue(minor(A, i, j));
      return (i + j) % 2 === 0 ? mv : mv.neg();         // (−1)^(i+j)·Mij
    }));
    log.matrix('Матрица алгебраических дополнений Aij:', C);
    const adj = C[0].map((_, j) => C.map((row) => row[j]));
    log.matrix('Транспонируем её (присоединённая матрица):', adj);
    const inv = adj.map((row) => row.map((x) => x.div(d)));
    log.answerMatrix('A⁻¹ =', inv);
    log.value = inv;
    return log;
  }

  LA.matrix = {
    add: (A, B) => addSub(A, B, 1),
    sub: (A, B) => addSub(A, B, -1),
    scale, multiply, transpose,
    det, detValue, rank, rankValue, inverse, eliminate, minor,
  };
})();
