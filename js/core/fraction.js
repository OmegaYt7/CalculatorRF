// ============================================================
// fraction.js — точные дроби (числитель/знаменатель на BigInt).
// Зачем: числа типа 0.1 + 0.2 в обычной арифметике дают 0.30000000000000004.
// С дробями 1/10 + 2/10 = 3/10 ровно, поэтому ответы всегда точные.
// ============================================================
(function () {
  const LA = (window.LA = window.LA || {});

  const abs = (x) => (x < 0n ? -x : x);
  // Алгоритм Евклида: наибольший общий делитель (для сокращения дроби)
  const gcd = (a, b) => { while (b) [a, b] = [b, a % b]; return a; };

  class Fraction {
    constructor(n, d = 1n) {
      if (d === 0n) throw new LA.MathError('деление на ноль');
      if (d < 0n) { n = -n; d = -d; }          // знак всегда хранится в числителе
      const g = gcd(abs(n), d);                 // сокращаем дробь
      this.n = n / g;
      this.d = d / g;
    }

    // ---- разбор текста из клетки ввода: "5", "-2.5", "3/4", "1,5" ----
    static parse(text) {
      const s = String(text).trim().replace('−', '-').replace(/,/g, '.').replace(/\s+/g, '');
      if (s === '') throw new LA.InputError('клетка пуста');
      if (s.length > 30) throw new LA.InputError('слишком длинное число');
      const parts = s.split('/');
      if (parts.length > 2) throw new LA.InputError(`«${text}» — не число`);
      const [a, b] = parts.map((p) => Fraction.parseDecimal(p, text));
      if (b === undefined) return a;
      if (b.isZero()) throw new LA.InputError('знаменатель равен нулю');
      return a.div(b);
    }

    // "−2.75" -> -275/100 -> -11/4
    static parseDecimal(p, original) {
      const m = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(p);
      if (!m) throw new LA.InputError(`«${original}» — не число`);
      const frac = m[3] || '';
      let n = BigInt(m[2] + frac);
      if (m[1] === '-') n = -n;
      return new Fraction(n, 10n ** BigInt(frac.length));
    }

    // ---- арифметика (всегда возвращает новую дробь) ----
    add(o) { return new Fraction(this.n * o.d + o.n * this.d, this.d * o.d); }
    sub(o) { return new Fraction(this.n * o.d - o.n * this.d, this.d * o.d); }
    mul(o) { return new Fraction(this.n * o.n, this.d * o.d); }
    div(o) {
      if (o.n === 0n) throw new LA.MathError('деление на ноль');
      return new Fraction(this.n * o.d, this.d * o.n);
    }
    neg() { return new Fraction(-this.n, this.d); }

    // ---- проверки ----
    isZero() { return this.n === 0n; }
    isNeg() { return this.n < 0n; }
    eq(o) { return this.n === o.n && this.d === o.d; }

    // ---- вывод ----
    toString() { return this.d === 1n ? `${this.n}` : `${this.n}/${this.d}`; }
    p() { return this.isNeg() ? `(${this})` : `${this}`; }   // отрицательные — в скобках
    toNumber() { return Number(this.n) / Number(this.d); }
  }

  Fraction.ZERO = new Fraction(0n);
  Fraction.ONE = new Fraction(1n);
  LA.Fraction = Fraction;
})();
