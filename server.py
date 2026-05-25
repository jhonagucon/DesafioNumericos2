"""
Biomecánica Matemática del Ave Alkamari — Backend Python
Servidor HTTP con API para cálculos de Splines Cúbicos y FFT
usando NumPy y SciPy para precisión científica.

Ave modelada:
Alkamari Andino de La Paz, Bolivia
"""

import http.server
import json
import os
import sys
import numpy as np
from scipy.interpolate import CubicSpline as ScipySpline

PORT = 8000


class BiomechanicsAPI(http.server.SimpleHTTPRequestHandler):
    """Servidor principal de biomecánica del Ave Alkamari."""

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
            self._json_response({
                "status": "ok",
                "engine": "numpy+scipy",
                "bird": "Alkamari Andino"
            })

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

        # =========================================================
        # PARÁMETROS DEL AVE ALKAMARI
        # =========================================================

        freq = params.get('frequency', 8)
        amp = params.get('amplitude', 42)

        duration = params.get('duration', 2.5)
        sample_rate = params.get('sampleRate', 512)

        ctrl_t = params.get('controlT', None)
        ctrl_y = params.get('controlY', None)

        period = 1.0 / freq
        omega = 2 * np.pi * freq

        # =========================================================
        # GENERACIÓN DE PUNTOS DE CONTROL
        # =========================================================

        if ctrl_t is None or ctrl_y is None:

            sample_fracs = [
                0.00,
                0.12,
                0.25,
                0.38,
                0.50,
                0.64,
                0.78,
                0.90,
                1.00
            ]

            ctrl_t = [f * period for f in sample_fracs]

            ctrl_y = []

            for t in ctrl_t:

                # Movimiento más suave y elegante
                raw = (
                    np.sin(omega * t)
                    + 0.22 * np.sin(2 * omega * t)
                    + 0.08 * np.sin(3 * omega * t)
                )

                ctrl_y.append(float(amp * raw / 1.30))

        ct = np.array(ctrl_t, dtype=np.float64)
        cy = np.array(ctrl_y, dtype=np.float64)

        # =========================================================
        # SPLINES CÚBICOS NATURALES
        # =========================================================

        cs = ScipySpline(ct, cy, bc_type='natural')

        n_curve = 500

        t_curve = np.linspace(ct[0], ct[-1], n_curve)

        y_curve = cs(t_curve)

        dy_curve = cs(t_curve, 1)
        ddy_curve = cs(t_curve, 2)

        # =========================================================
        # COEFICIENTES POLINÓMICOS
        # =========================================================

        n_seg = len(ct) - 1

        coefficients = []

        for i in range(n_seg):

            coefficients.append({
                "segment": i,

                "x0": float(ct[i]),
                "x1": float(ct[i + 1]),

                "a": float(cs.c[3, i]),
                "b": float(cs.c[2, i]),
                "c": float(cs.c[1, i]),
                "d": float(cs.c[0, i]),
            })

        # =========================================================
        # SEÑAL BIOMECÁNICA DEL AVE
        # =========================================================

        n_samples = int(duration * sample_rate)

        t_signal = np.linspace(
            0,
            duration,
            n_samples,
            endpoint=False
        )

        signal = amp * (
            np.sin(omega * t_signal)
            + 0.22 * np.sin(2 * omega * t_signal)
            + 0.08 * np.sin(3 * omega * t_signal)
        ) / 1.30

        # =========================================================
        # FFT — FOURIER
        # =========================================================

        fft_vals = np.fft.rfft(signal)

        freqs = np.fft.rfftfreq(
            n_samples,
            d=1.0 / sample_rate
        )

        magnitudes = (2.0 / n_samples) * np.abs(fft_vals)

        magnitudes[0] /= 2.0

        # Frecuencia dominante
        fund_idx = int(np.argmax(magnitudes[1:]) + 1)

        fund_freq = float(freqs[fund_idx])

        if fund_freq > 0:
            fund_period = 1.0 / fund_freq
        else:
            fund_period = float('inf')

        max_freq_display = 80

        freq_mask = freqs <= max_freq_display

        # =========================================================
        # RESULTADO JSON
        # =========================================================

        return {

            "engine": "scipy+numpy",

            "bird": {
                "commonName": "Ave Alkamari",
                "scientificName": "Alkamari andinus",
                "habitat": "Cordillera de La Paz",
                "flightType": "Planeo andino elegante",
                "wingbeatRange_Hz": "6 - 10 Hz"
            },

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

                "frequencies": [
                    float(v)
                    for v in freqs[freq_mask]
                ],

                "magnitudes": [
                    float(v)
                    for v in magnitudes[freq_mask]
                ],

                "fundamentalFreq": fund_freq,

                "fundamentalPeriod_ms": (
                    fund_period * 1000
                ),

                "fundamentalIndex": fund_idx,
            },
        }

    def log_message(self, format, *args):

        msg = format % args

        if '/api/' in msg:
            sys.stderr.write(
                f"\033[35m[ALKAMARI API]\033[0m {msg}\n"
            )

        elif '200' in msg or '304' in msg:
            pass

        else:
            sys.stderr.write(f"{msg}\n")


# =============================================================
# MAIN
# =============================================================

if __name__ == '__main__':

    os.chdir(
        os.path.dirname(
            os.path.abspath(__file__)
        )
    )

    print(f"""
╔══════════════════════════════════════════════════════════════╗
║         BIOMECÁNICA MATEMÁTICA DEL AVE ALKAMARI            ║
║--------------------------------------------------------------║
║  Motor Científico: NumPy {np.__version__} + SciPy               ║
║  Servidor HTTP Activo                                        ║
║  URL: http://localhost:{PORT}                                 ║
║--------------------------------------------------------------║
║  Simulación biomecánica andina de La Paz, Bolivia           ║
╚══════════════════════════════════════════════════════════════╝
""")

    with http.server.HTTPServer(
        ('', PORT),
        BiomechanicsAPI
    ) as httpd:

        try:
            httpd.serve_forever()

        except KeyboardInterrupt:

            print("\nServidor detenido.")