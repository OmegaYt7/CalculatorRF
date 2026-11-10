// ============================================================
// vector.js — ВСЕ ОПЕРАЦИИ С ВЕКТОРАМИ.
// Вектор = массив дробей: [ax, ay, az].
// Лекции: 1 (линейные операции), 2 (координаты, коллинеарность),
//         3 (скалярное и векторное произведение), 4 (смешанное, проекция, косинус).
// ============================================================
(function () {
  const LA = (window.LA = window.LA || {});
  const { Fraction, MathError, Log } = LA;
  const ZERO = Fraction.ZERO;

  // ---------- вспомогательное ----------
  const str = (v) => `(${v.join('; ')})`;                                   // вектор -> "(1; 2; 3)"
  const dot = (a, b) => a.reduce((s, x, i) => s.add(x.mul(b[i])), ZERO);    // сумма aᵢ·bᵢ
  const isZeroVec = (v) => v.every((x) => x.isZero());

  function sameDim(a, b) {
    if (a.length !== b.length) throw new MathError('векторы должны иметь одинаковую размерность');
  }
  function need3(what, ...vs) {
    if (vs.some((v) => v.length !== 3)) {
      throw new MathError(`${what} определено только для трёхмерных векторов (сейчас размерность ${vs[0].length})`);
    }
  }
  // √S: если S — точный квадрат, даём точное значение, иначе корень и приближение
  function sqrtText(S) {
    const root = (x) => { const q = BigInt(Math.round(Math.sqrt(Number(x)))); return q * q === x ? q : null; };
    const a = root(S.n), b = root(S.d);
    if (a !== null && b !== null) return `${new Fraction(a, b)}`;
    const inner = S.d === 1n ? `${S}` : `(${S})`;
    return `√${inner} ≈ ${+Math.sqrt(S.toNumber()).toFixed(4)}`;
  }

  // ---------- 1. сложение / вычитание ----------
  function addSub(a, b, sign) {
    sameDim(a, b);
    const op = sign > 0 ? '+' : '−';
    const log = new Log();
    log.text(`Операция по координатам: (a ${op} b)ᵢ = aᵢ ${op} bᵢ.`);
    log.text(`${str(a.map((x, i) => `${x.p()} ${op} ${b[i].p()}`))}`);
    const c = a.map((x, i) => (sign > 0 ? x.add(b[i]) : x.sub(b[i])));
    log.answer(`a ${op} b = ${str(c)}`);
    log.value = c;
    return log;
  }

  // ---------- 2. умножение на число ----------
  function scale(a, k) {
    const log = new Log();
    log.text('Каждая координата умножается на число: (k·a)ᵢ = k·aᵢ.');
    log.text(str(a.map((x) => `${k.p()}·${x.p()}`)));
    const c = a.map((x) => x.mul(k));
    log.answer(`k·a (k = ${k}) = ${str(c)}`);
    log.value = c;
    return log;
  }

  // ---------- 3. скалярное произведение ----------
  function dotProduct(a, b) {
    sameDim(a, b);
    const log = new Log();
    log.text('(a, b) = a₁b₁ + a₂b₂ + … (сумма произведений соответствующих координат).');
    log.text(`(a, b) = ${a.map((x, i) => `${x.p()}·${b[i].p()}`).join(' + ')}`);
    const d = dot(a, b);
    log.answer(`(a, b) = ${d}`);
    if (d.isZero() && !isZeroVec(a) && !isZeroVec(b)) log.text('Скалярное произведение равно 0 → векторы ортогональны (критерий ортогональности).');
    log.value = d;
    return log;
  }

  // ---------- 4. векторное произведение ----------
  function crossValue(a, b) {
    return [a[1].mul(b[2]).sub(a[2].mul(b[1])), a[2].mul(b[0]).sub(a[0].mul(b[2])), a[0].mul(b[1]).sub(a[1].mul(b[0]))];
  }

  function cross(a, b) {
    need3('Векторное произведение', a, b);
    const log = new Log();
    log.text('Раскрываем определитель по первой строке:');
    log.matrix('[a, b] =', [['i', 'j', 'k'], a, b]);
    log.text(`x = a₂b₃ − a₃b₂ = ${a[1].p()}·${b[2].p()} − ${a[2].p()}·${b[1].p()}`);
    log.text(`y = a₃b₁ − a₁b₃ = ${a[2].p()}·${b[0].p()} − ${a[0].p()}·${b[2].p()}   (минус перед j уже учтён)`);
    log.text(`z = a₁b₂ − a₂b₁ = ${a[0].p()}·${b[1].p()} − ${a[1].p()}·${b[0].p()}`);
    const c = crossValue(a, b);
    log.answer(`[a, b] = ${str(c)}`);
    if (isZeroVec(c)) {
      log.text('Векторное произведение — нулевой вектор → векторы коллинеарны.');
    } else {
      const S = dot(c, c);
      log.text(`Площадь параллелограмма S = |[a, b]| = ${sqrtText(S)}; площадь треугольника = S/2.`);
    }
    log.value = c;
    return log;
  }

  // ---------- 5. смешанное произведение ----------
  function mixed(a, b, c) {
    need3('Смешанное произведение', a, b, c);
    const log = new Log();
    log.text('(a, b, c) = ([a, b], c): сначала векторное произведение, затем скалярное на c.');
    const ab = crossValue(a, b);
    log.text(`1) [a, b] = ${str(ab)}`);
    const v = dot(ab, c);
    log.text(`2) ([a, b], c) = ${ab.map((x, i) => `${x.p()}·${c[i].p()}`).join(' + ')} = ${v}`);
    // Самопроверка: то же число даёт определитель из координат трёх векторов
    if (!LA.matrix.detValue([a, b, c]).eq(v)) throw new Error('внутренняя проверка (определитель) не совпала');
    log.answer(`(a, b, c) = ${v}`);
    if (v.isZero()) {
      log.text('Смешанное произведение равно 0 → векторы компланарны (лемма о компланарности).');
    } else {
      const abs = v.isNeg() ? v.neg() : v;
      log.text(`Объём параллелепипеда V = |(a, b, c)| = ${abs}; объём пирамиды = V/6 = ${abs.div(new Fraction(6n))}.`);
      log.text(v.isNeg() ? 'Знак «−»: тройка a, b, c левая.' : 'Знак «+»: тройка a, b, c правая.');
    }
    log.value = v;
    return log;
  }

  // ---------- дополнительно из лекций ----------
  function length(a) {
    const S = dot(a, a);
    const log = new Log();
    log.text(`|a|² = ${a.map((x) => `${x.p()}²`).join(' + ')} = ${S}`);
    log.answer(`|a| = ${sqrtText(S)}`);
    log.value = Math.sqrt(S.toNumber());
    return log;
  }

  // Косинус угла: cos φ = (a, b) / (|a|·|b|)  (лекция 3; «косинусная близость», лекция 4)
  function angle(a, b) {
    sameDim(a, b);
    if (isZeroVec(a) || isZeroVec(b)) throw new MathError('угол с нулевым вектором не определён');
    const log = new Log();
    const d = dot(a, b), S1 = dot(a, a), S2 = dot(b, b);
    log.text(`(a, b) = ${d};  |a| = ${sqrtText(S1)};  |b| = ${sqrtText(S2)}`);
    log.text('cos φ = (a, b) / (|a|·|b|)');
    const cos = Math.max(-1, Math.min(1, d.toNumber() / Math.sqrt(S1.mul(S2).toNumber()))); // защита от 1.0000000002
    const deg = (Math.acos(cos) * 180) / Math.PI;
    log.answer(`cos φ ≈ ${+cos.toFixed(6)},  φ ≈ ${+deg.toFixed(4)}°`);
    if (d.isZero()) log.text('Скалярное произведение равно 0 → векторы ортогональны.');
    log.value = cos;
    return log;
  }

  // Проекция a на b (лекция 4, задача 2): c = ((a,b)/(b,b))·b, остаток r = a − c
  function projection(a, b) {
    sameDim(a, b);
    if (isZeroVec(b)) throw new MathError('проекция на нулевой вектор не определена');
    const log = new Log();
    const lambda = dot(a, b).div(dot(b, b));
    log.text(`Коэффициент λ = (a, b) / (b, b) = ${dot(a, b)} / ${dot(b, b)} = ${lambda}`);
    const c = b.map((x) => x.mul(lambda));
    log.answer(`Проекция a на b: c = λ·b = ${str(c)}`);
    const r = a.map((x, i) => x.sub(c[i]));
    log.text(`Остаток r = a − c = ${str(r)}`);
    const chk = dot(r, b);
    log.text(`Проверка: (r, b) = ${chk} ${chk.isZero() ? '→ остаток перпендикулярен b ✓' : '— не ноль!'}`);
    log.text(`Скалярная проекция пр_b a = (a, b)/|b| = ${+(dot(a, b).toNumber() / Math.sqrt(dot(b, b).toNumber())).toFixed(4)}`);
    log.value = c;
    return log;
  }

  // Коллинеарность: ранг матрицы из двух векторов ≤ 1 (координаты пропорциональны)
  function collinear(a, b) {
    sameDim(a, b);
    const r = LA.matrix.rankValue([a, b]);
    const log = new Log();
    log.matrix('Составляем матрицу из векторов:', [a, b]);
    log.text(`Ранг матрицы = ${r}.`);
    log.answer(r <= 1 ? 'Векторы коллинеарны (координаты пропорциональны).' : 'Векторы НЕ коллинеарны.');
    log.value = r <= 1;
    return log;
  }

  // Компланарность: смешанное произведение равно нулю
  function coplanar(a, b, c) {
    need3('Проверка компланарности', a, b, c);
    const log = new Log();
    log.text('Три вектора компланарны тогда и только тогда, когда их смешанное произведение равно 0.');
    const ab = crossValue(a, b);
    const v = dot(ab, c);
    log.text(`[a, b] = ${str(ab)};  ([a, b], c) = ${v}`);
    log.answer(v.isZero() ? 'Векторы компланарны.' : 'Векторы НЕ компланарны.');
    log.value = v.isZero();
    return log;
  }

  LA.vector = {
    add: (a, b) => addSub(a, b, 1),
    sub: (a, b) => addSub(a, b, -1),
    scale, dotProduct, cross, mixed, length, angle, projection, collinear, coplanar,
  };
})();
