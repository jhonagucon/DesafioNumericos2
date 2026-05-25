class CubicSpline {
    constructor(xs, ys) {
        if (xs.length !== ys.length || xs.length < 2) {
            throw new Error('Se requieren al menos 2 puntos con igual cantidad de x e y.');
        }

        // 🔧 FIX 1: asegurar que estén ordenados (evita errores silenciosos)
        for (let i = 1; i < xs.length; i++) {
            if (xs[i] <= xs[i - 1]) {
                throw new Error('xs deben estar estrictamente ordenados y sin duplicados.');
            }
        }

        this.n = xs.length;
        this.xs = Float64Array.from(xs);
        this.ys = Float64Array.from(ys);
        this.coefficients = [];

        this._computeCoefficients();
    }

    _computeCoefficients() {
        const n = this.n;
        const x = this.xs;
        const y = this.ys;

        const h = new Float64Array(n - 1);

        for (let i = 0; i < n - 1; i++) {
            h[i] = x[i + 1] - x[i];

            // 🔧 FIX 2: evita división por cero silenciosa
            if (h[i] === 0) throw new Error('x duplicado detectado (h = 0).');
        }

        const c = new Float64Array(n);

        if (n > 2) {
            const size = n - 2;
            const lower = new Float64Array(size);
            const diag = new Float64Array(size);
            const upper = new Float64Array(size);
            const rhs = new Float64Array(size);

            for (let i = 0; i < size; i++) {
                const idx = i + 1;
                diag[i] = 2 * (h[idx - 1] + h[idx]);
                rhs[i] = 3 * (
                    (y[idx + 1] - y[idx]) / h[idx] -
                    (y[idx] - y[idx - 1]) / h[idx - 1]
                );

                if (i > 0) lower[i] = h[idx - 1];
                if (i < size - 1) upper[i] = h[idx];
            }

            for (let i = 1; i < size; i++) {
                const m = lower[i] / diag[i - 1];
                diag[i] -= m * upper[i - 1];
                rhs[i] -= m * rhs[i - 1];
            }

            const sol = new Float64Array(size);
            sol[size - 1] = rhs[size - 1] / diag[size - 1];

            for (let i = size - 2; i >= 0; i--) {
                sol[i] = (rhs[i] - upper[i] * sol[i + 1]) / diag[i];
            }

            for (let i = 0; i < size; i++) {
                c[i + 1] = sol[i];
            }
        }

        this.coefficients = [];

        for (let i = 0; i < n - 1; i++) {
            const a = y[i];
            const b = (y[i + 1] - y[i]) / h[i] - h[i] * (2 * c[i] + c[i + 1]) / 3;
            const d = (c[i + 1] - c[i]) / (3 * h[i]);

            this.coefficients.push({
                a,
                b,
                c: c[i],
                d,
                x0: x[i],
                x1: x[i + 1]
            });
        }
    }

    _findSegment(xVal) {
        const x = this.xs;

        // 🔧 FIX 3: clamp más limpio
        if (xVal <= x[0]) return 0;
        if (xVal >= x[this.n - 1]) return this.n - 2;

        let lo = 0, hi = this.n - 2;

        while (lo <= hi) {
            const mid = (lo + hi) >> 1;

            if (xVal < x[mid]) hi = mid - 1;
            else if (xVal > x[mid + 1]) lo = mid + 1;
            else return mid;
        }

        return Math.max(0, Math.min(lo, this.n - 2));
    }

    evaluate(xVal) {
        const i = this._findSegment(xVal);
        const seg = this.coefficients[i];
        const dx = xVal - seg.x0;

        return seg.a + seg.b * dx + seg.c * dx * dx + seg.d * dx * dx * dx;
    }

    derivative(xVal) {
        const i = this._findSegment(xVal);
        const seg = this.coefficients[i];
        const dx = xVal - seg.x0;

        return seg.b + 2 * seg.c * dx + 3 * seg.d * dx * dx;
    }

    secondDerivative(xVal) {
        const i = this._findSegment(xVal);
        const seg = this.coefficients[i];
        const dx = xVal - seg.x0;

        return 2 * seg.c + 6 * seg.d * dx;
    }

    sample(numPoints = 300) {
        const xMin = this.xs[0];
        const xMax = this.xs[this.n - 1];
        const step = (xMax - xMin) / (numPoints - 1);

        const result = { x: [], y: [], dy: [], ddy: [] };

        for (let i = 0; i < numPoints; i++) {
            const xv = xMin + i * step;
            result.x.push(xv);
            result.y.push(this.evaluate(xv));
            result.dy.push(this.derivative(xv));
            result.ddy.push(this.secondDerivative(xv));
        }

        return result;
    }
}

/* ParametricSpline SIN cambios (está bien) */
class ParametricSpline {
    constructor(t, px, py) {
        this.splineX = new CubicSpline(t, px);
        this.splineY = new CubicSpline(t, py);
        this.tMin = t[0];
        this.tMax = t[t.length - 1];
    }

    evaluate(tVal) {
        return {
            x: this.splineX.evaluate(tVal),
            y: this.splineY.evaluate(tVal)
        };
    }

    derivative(tVal) {
        return {
            dx: this.splineX.derivative(tVal),
            dy: this.splineY.derivative(tVal)
        };
    }

    sample(numPoints = 300) {
        const step = (this.tMax - this.tMin) / (numPoints - 1);
        const pts = [];

        for (let i = 0; i < numPoints; i++) {
            const tv = this.tMin + i * step;
            pts.push(this.evaluate(tv));
        }

        return pts;
    }
}