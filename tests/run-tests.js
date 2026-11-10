// ============================================================
// Автотесты математического ядра (без браузера).
// Запуск:  node tests/run-tests.js
// Файлы js/core и js/math загружаются в «песочницу» vm, где window = сама песочница.
// ============================================================
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = {};
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ['core/errors', 'core/fraction', 'core/log', 'math/matrix', 'math/vector', 'math/slau']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f + '.js'), 'utf8'), ctx, { filename: f });
}
const { Fraction, MathError, InputError, matrix: M, vector: V, slau: S } = ctx.LA;

// ---------- мини-фреймворк ----------
let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) passed++; else { failed++; console.log('  ПРОВАЛ:', name); }
}
const F = (s) => Fraction.parse(s);
const mat = (rows) => rows.map((r) => r.map(F));
const same = (X, Y) => JSON.stringify(X.map((r) => r.map(String))) === JSON.stringify(Y.map((r) => r.map(String)));
const throwsMath = (fn) => { try { fn(); } catch (e) { return e instanceof MathError; } return false; };
const throwsInput = (fn) => { try { fn(); } catch (e) { return e instanceof InputError; } return false; };

// ---------- дроби и разбор ввода ----------
check('0.1+0.2 = 0.3 точно', F('0.1').add(F('0.2')).eq(F('0.3')));
check('"1,5" = 3/2', String(F('1,5')) === '3/2');
check('"-6/4" = -3/2', String(F('-6/4')) === '-3/2');
check('пустая клетка -> InputError', throwsInput(() => F('')));
check('"abc" -> InputError', throwsInput(() => F('abc')));
check('"1/0" -> InputError', throwsInput(() => F('1/0')));

// ---------- матрицы: примеры из лекции 1 ----------
const A1 = mat([[2, 3, -4], [1, 0, 5]]);
const B1 = mat([[1, 2, 6], [-2, 3, 0]]);
check('A+B (слайд 8)', same(M.add(A1, B1).value, mat([[3, 5, 2], [-1, 3, 5]])));
check('A−B (слайд 10)', same(M.sub(A1, B1).value, mat([[1, 1, -10], [3, -3, 5]])));
check('2B (слайд 9)', same(M.scale(B1, F('2')).value, mat([[2, 4, 12], [-4, 6, 0]])));
check('A·B (слайд 13)', same(M.multiply(A1, mat([[2, 1, 0], [3, 2, 4], [4, -3, 1]])).value, mat([[-3, 20, 8], [22, -14, 5]])));
check('Aᵀ (слайд 16)', same(M.transpose(A1).value, mat([[2, 1], [3, 0], [-4, 5]])));
check('A+B разных размеров -> MathError', throwsMath(() => M.add(A1, mat([[1, 2], [3, 4]]))));
check('A·B несогласованные -> MathError', throwsMath(() => M.multiply(A1, A1)));
check('det неквадратной -> MathError', throwsMath(() => M.det(A1)));

// ---------- определитель / ранг ----------
check('det 2x2', M.det(mat([[1, 2], [3, 4]])).value.eq(F('-2')));
check('det 3x3', M.det(mat([[2, 1, 0], [3, 2, 4], [4, -3, 1]])).value.eq(F('41')));
const L4 = mat([[1, 2, 3, 4], [-1, 2, 1, -2], [-1, 1, 3, -4], [2, 3, 1, 1]]); // матрица со слайда 9 (лекция 3)
check('det 4x4 (слайд 9) совпал с независимым методом', M.det(L4).value.eq(detCofactor(L4)));
check('rang [[1,4,7],[2,5,8],[3,6,9]] = 2', M.rank(mat([[1, 4, 7], [2, 5, 8], [3, 6, 9]])).value === 2);
check('rang нулевой = 0', M.rank(mat([[0, 0], [0, 0]])).value === 0);

// независимая реализация det: разложение по первой строке (рекурсия)
function detCofactor(A) {
  if (A.length === 1) return A[0][0];
  let s = Fraction.ZERO;
  A[0].forEach((x, j) => {
    const t = x.mul(detCofactor(M.minor(A, 0, j)));
    s = j % 2 ? s.sub(t) : s.add(t);
  });
  return s;
}

// ---------- обратная матрица ----------
const inv = M.inverse(mat([[2, 1], [5, 3]])).value;
check('A⁻¹ 2x2', same(inv, mat([[3, -1], [-5, 2]])));
check('вырожденная -> MathError', throwsMath(() => M.inverse(mat([[1, 2], [2, 4]]))));

// ---------- СЛАУ: пример из лекции (слайд 45) ----------
const As = mat([[2, 3], [3, 4]]), bs = mat([[-1], [-1]]).map((r) => r[0]);
for (const [name, fn] of [['Гаусс', S.gauss], ['Крамер', S.cramer], ['Матричный', S.matrixMethod]]) {
  const x = fn(As, bs).value;
  check(`${name}: x1=1, x2=-1`, x[0].eq(F('1')) && x[1].eq(F('-1')));
}
check('несовместная система (Гаусс)', S.gauss(mat([[1, 1], [2, 2]]), mat([[1], [3]]).map((r) => r[0])).value === null);
check('бесконечно много решений (Гаусс)', S.gauss(mat([[1, 1], [2, 2]]), mat([[1], [2]]).map((r) => r[0])).value.free.length === 1);
check('Крамер при Δ=0 -> MathError', throwsMath(() => S.cramer(mat([[1, 1], [2, 2]]), mat([[1], [2]]).map((r) => r[0]))));
check('Матричный при Δ=0 -> MathError', throwsMath(() => S.matrixMethod(mat([[1, 1], [2, 2]]), mat([[1], [2]]).map((r) => r[0]))));
check('Крамер для неквадратной -> MathError', throwsMath(() => S.cramer(mat([[1, 2, 3]]), [F('1')])));

// ---------- векторы ----------
const a = mat([[1, 2, 3]])[0], b = mat([[4, 5, 6]])[0], c = mat([[7, 8, 10]])[0];
check('a+b', V.add(a, b).value.join() === '5,7,9');
check('a−b', V.sub(a, b).value.join() === '-3,-3,-3');
check('3a', V.scale(a, F('3')).value.join() === '3,6,9');
check('(a,b) = 32', V.dotProduct(a, b).value.eq(F('32')));
check('[a,b] = (-3,6,-3)', V.cross(a, b).value.join() === '-3,6,-3');
check('(a,b,c) = -3', V.mixed(a, b, c).value.eq(F('-3')));
check('компланарные 1,2,3 / 4,5,6 / 7,8,9', V.coplanar(a, b, mat([[7, 8, 9]])[0]).value === true);
check('коллинеарные (2,4,0) и (1,2,0) (лекция 2)', V.collinear(mat([[2, 4, 0]])[0], mat([[1, 2, 0]])[0]).value === true);
check('cross в 2D -> MathError', throwsMath(() => V.cross(mat([[1, 2]])[0], mat([[3, 4]])[0])));
check('угол с нулевым вектором -> MathError', throwsMath(() => V.angle(mat([[0, 0, 0]])[0], a)));
// Лекция 4, задача 1: u=(3,4,0), m=(1,2,2): cos = 11/15 ≈ 0.7333 < 0.8
check('косинус (лекция 4, задача 1)', Math.abs(V.angle(mat([[3, 4, 0]])[0], mat([[1, 2, 2]])[0]).value - 11 / 15) < 1e-12);
// Лекция 4, задача 2: a=(6,2), b=(1,1): проекция (4,4), остаток (2,-2)
check('проекция (лекция 4, задача 2)', V.projection(mat([[6, 2]])[0], mat([[1, 1]])[0]).value.join() === '4,4');

// ---------- случайные проверки (много прогонов — «надёжность ≥ 98%») ----------
let seed = 12345;
const rnd = (lo, hi) => { seed = (seed * 1103515245 + 12345) % 2147483648; return lo + (seed % (hi - lo + 1)); };
const randMat = (r, c) => Array.from({ length: r }, () => Array.from({ length: c }, () => F(String(rnd(-9, 9)))));
const TRIALS = 300;
let bad = 0;
for (let t = 0; t < TRIALS; t++) {
  const n = rnd(1, 6);
  const A = randMat(n, n), B = randMat(n, n), x0 = randMat(n, 1).map((r) => r[0]);
  const d = M.detValue(A);
  if (!d.eq(detCofactor(A))) bad++;                                              // det: Гаусс = разложение
  if (!M.detValue(M.multiply(A, B).value).eq(d.mul(M.detValue(B)))) bad++;       // |AB| = |A|·|B|
  if (!M.detValue(M.transpose(A).value).eq(d)) bad++;                            // |Aᵀ| = |A|
  if (!d.isZero()) {
    if (!same(M.multiply(A, M.inverse(A).value).value, identity(n))) bad++;      // A·A⁻¹ = E
    const b = A.map((row) => row.reduce((s, v, j) => s.add(v.mul(x0[j])), Fraction.ZERO));
    for (const fn of [S.gauss, S.cramer, S.matrixMethod]) {
      if (!fn(A, b).value.every((v, i) => v.eq(x0[i]))) bad++;                   // все три метода находят x0
    }
  }
  if (M.rankValue(A) !== M.rankValue(M.transpose(A).value)) bad++;               // rang A = rang Aᵀ
  const u = randMat(1, 3)[0], v = randMat(1, 3)[0], w = randMat(1, 3)[0];
  const uv = V.cross(u, v).value;
  if (!V.dotProduct(uv, u).value.isZero() || !V.dotProduct(uv, v).value.isZero()) bad++;  // [u,v] ⟂ u, v
  if (!V.mixed(u, v, w).value.eq(M.detValue([u, v, w]))) bad++;                  // (u,v,w) = det
}
function identity(n) { return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? Fraction.ONE : Fraction.ZERO))); }
check(`случайные проверки: ${TRIALS} прогонов без расхождений`, bad === 0);
if (bad) console.log('  расхождений:', bad);

console.log(`\nТесты: пройдено ${passed}, провалено ${failed}`);
process.exit(failed ? 1 : 0);
