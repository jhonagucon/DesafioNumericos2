"""
Biomecánica del Colibrí Gigante — Backend Python
Servidor HTTP con API para cálculos de Splines Cúbicos y FFT
usando NumPy y SciPy para precisión científica.
"""
import http.server
import json
import os
import sys
import numpy as np
from scipy.interpolate import CubicSpline as ScipySpline

PORT = 8000

class BiomechanicsAPI(http.server.SimpleHTTPRequestHandler):
    """Serves static files + /api/* endpoints."""

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_POST(self):
        if self.path == '/api/compute':
            length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(length)) if length else {}
            result = self._compute(body)
            self._json_response(result)
        else:
            self.send_error(404)

    def do_GET(self):
        if self.path == '/api/health':
            self._json_response({"status": "ok", "engine": "numpy+scipy"})
        elif self.path.startswith('/api/'):
            self.send_error(405)
        else:
            super().do_GET()

    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def _json_response(self, data):
        payload = json.dumps(data).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self._cors()
        self.end_headers()
        self.wfile.write(payload)

    def _compute(self, params):
        freq = params.get('frequency', 13)
        amp = params.get('amplitude', 55)
        duration = params.get('duration', 2.0)
        sample_rate = params.get('sampleRate', 512)
        ctrl_t = params.get('controlT', None)
        ctrl_y = params.get('controlY', None)

        period = 1.0 / freq
        omega = 2 * np.pi * freq

        # --- Generate control points if not provided ---
        if ctrl_t is None or ctrl_y is None:
            sample_fracs = [0, 0.1, 0.2, 0.35, 0.5, 0.65, 0.75, 0.88, 1.0]
            ctrl_t = [f * period for f in sample_fracs]
            ctrl_y = []
            for t in ctrl_t:
                raw = np.sin(omega * t) + 0.15 * np.sin(2 * omega * t)
                ctrl_y.append(float(amp * raw / 1.15))

        ct = np.array(ctrl_t, dtype=np.float64)
        cy = np.array(ctrl_y, dtype=np.float64)

        # --- Cubic Spline (SciPy) with Natural BC ---
        cs = ScipySpline(ct, cy, bc_type='natural')

        # Sampled curve (one period)
        n_curve = 400
        t_curve = np.linspace(ct[0], ct[-1], n_curve)
        y_curve = cs(t_curve)
        dy_curve = cs(t_curve, 1)   # first derivative
        ddy_curve = cs(t_curve, 2)  # second derivative

        # Extract polynomial coefficients per segment
        # SciPy stores coefficients as c[order, segment] in descending order
        # S_i(x) = c[0,i]*(x-x_i)^3 + c[1,i]*(x-x_i)^2 + c[2,i]*(x-x_i) + c[3,i]
        n_seg = len(ct) - 1
        coefficients = []
        for i in range(n_seg):
            coefficients.append({
                "segment": i,
                "x0": float(ct[i]),
                "x1": float(ct[i + 1]),
                "a": float(cs.c[3, i]),  # constant term
                "b": float(cs.c[2, i]),  # linear
                "c": float(cs.c[1, i]),  # quadratic
                "d": float(cs.c[0, i]),  # cubic
            })

        # --- Wing signal for Fourier (multiple periods) ---
        n_samples = int(duration * sample_rate)
        t_signal = np.linspace(0, duration, n_samples, endpoint=False)
        signal = amp * (np.sin(omega * t_signal) + 0.15 * np.sin(2 * omega * t_signal)) / 1.15

        # --- FFT (NumPy) ---
        fft_vals = np.fft.rfft(signal)
        freqs = np.fft.rfftfreq(n_samples, d=1.0 / sample_rate)
        magnitudes = (2.0 / n_samples) * np.abs(fft_vals)
        magnitudes[0] /= 2.0

        # Find fundamental (skip DC)
        fund_idx = int(np.argmax(magnitudes[1:]) + 1)
        fund_freq = float(freqs[fund_idx])
        fund_period = 1.0 / fund_freq if fund_freq > 0 else float('inf')

        # Limit output size for JSON
        max_freq_display = 80
        freq_mask = freqs <= max_freq_display

        return {
            "engine": "scipy+numpy",
            "params": {
                "frequency": freq,
                "amplitude": amp,
                "period_ms": period * 1000,
            },
            "controlPoints": {
                "t": [float(v) for v in ct],
                "y": [float(v) for v in cy],
            },
            "spline": {
                "t": [float(v) for v in t_curve],
                "y": [float(v) for v in y_curve],
                "dy": [float(v) for v in dy_curve],
                "ddy": [float(v) for v in ddy_curve],
            },
            "coefficients": coefficients,
            "signal": {
                "t": [float(v) for v in t_signal[:1024]],
                "y": [float(v) for v in signal[:1024]],
            },
            "fourier": {
                "frequencies": [float(v) for v in freqs[freq_mask]],
                "magnitudes": [float(v) for v in magnitudes[freq_mask]],
                "fundamentalFreq": fund_freq,
                "fundamentalPeriod_ms": fund_period * 1000,
                "fundamentalIndex": fund_idx,
            },
        }

    def log_message(self, format, *args):
        msg = format % args
        if '/api/' in msg:
            sys.stderr.write(f"\033[36m[API]\033[0m {msg}\n")
        elif '200' in msg or '304' in msg:
            pass  # suppress static file noise
        else:
            sys.stderr.write(f"{msg}\n")


if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print(f"""
╔══════════════════════════════════════════════════════╗
║  Biomecánica del Colibrí Gigante — Servidor Python   ║
║  Motor: NumPy {np.__version__} + SciPy                         ║
║  URL: http://localhost:{PORT}                          ║
╚══════════════════════════════════════════════════════╝
""")
    with http.server.HTTPServer(('', PORT), BiomechanicsAPI) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor detenido.")
