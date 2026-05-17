# 🐦 Biomecánica Matemática del Colibrí Gigante (*Patagona gigas*)

## Desafío Final — Aves Paceñas, La Paz, Bolivia

Simulación digital del ciclo de aleteo del **Colibrí Gigante** (*Patagona gigas*), especie nativa de la ciudad de La Paz. El proyecto transforma datos de observación biomecánica en una simulación fluida y cinemáticamente coherente utilizando **Splines Cúbicos Naturales** y **Análisis de Frecuencia de Fourier**.

---

## 📋 Índice

1. [Descripción General](#descripción-general)
2. [Arquitectura del Proyecto](#arquitectura-del-proyecto)
3. [Fundamentos Matemáticos](#fundamentos-matemáticos)
4. [Motor de Splines Cúbicos](#motor-de-splines-cúbicos)
5. [Análisis de Fourier](#análisis-de-fourier)
6. [Simulación Cinemática](#simulación-cinemática)
7. [Sistema de Captura de Datos](#sistema-de-captura-de-datos)
8. [Backend Python](#backend-python)
9. [Interfaz de Usuario](#interfaz-de-usuario)
10. [Datos Biológicos](#datos-biológicos)
11. [Cómo Ejecutar](#cómo-ejecutar)

---

## 📖 Descripción General

Este proyecto implementa un sistema completo de modelado biomecánico que:

- **Interpola** la trayectoria del ala usando **Splines Cúbicos Naturales** con continuidad C⁰, C¹ y C²
- **Analiza** la señal de aleteo mediante la **Transformada Discreta de Fourier (DFT/FFT)** para identificar la frecuencia fundamental
- **Simula** el movimiento del ala en tiempo real con animación Canvas 2D
- **Valida** los resultados contra datos biológicos reales (12–15 Hz para *Patagona gigas*)
- **Captura** datos en cada pausa para registro y análisis posterior

---

## 🏗 Arquitectura del Proyecto

```
Biomecanica/
├── index.html          # Estructura principal de la aplicación
├── index.css           # Sistema de diseño (dark mode premium)
├── spline.js           # Motor de Splines Cúbicos Naturales (JS)
├── fourier.js          # Motor DFT/FFT (JS)
├── simulation.js       # Simulación cinemática del ave (Canvas 2D)
├── app.js              # Orquestador reactivo principal
├── server.py           # Backend Python (NumPy + SciPy)
├── requirements.txt    # Dependencias Python
└── README.md           # Este documento
```

### Flujo de Datos

```
Parámetros del Usuario (freq, amp, wing_len)
         │
         ▼
┌─────────────────────┐
│  Motor de Cálculo    │ ◄── Python (SciPy) ó JS (fallback)
│  - Splines Cúbicos  │
│  - FFT              │
└────────┬────────────┘
         │
    ┌────┴────┐
    ▼         ▼
 Gráficas   Simulación
 Animadas   Canvas 2D
    │         │
    └────┬────┘
         ▼
  Captura al Pausar
  (Snapshot de datos)
```

---

## 📐 Fundamentos Matemáticos

### Interpolación por Splines Cúbicos Naturales

Dado un conjunto de `n` puntos de control `(x₀, y₀), (x₁, y₁), ..., (xₙ₋₁, yₙ₋₁)`, se construyen `n-1` polinomios cúbicos de la forma:

```
Sᵢ(x) = aᵢ + bᵢ(x - xᵢ) + cᵢ(x - xᵢ)² + dᵢ(x - xᵢ)³
```

donde `i = 0, 1, ..., n-2`.

#### Condiciones que se satisfacen:

| Condición | Ecuación | Significado |
|-----------|----------|-------------|
| **C⁰ (Continuidad)** | `Sᵢ(xᵢ₊₁) = Sᵢ₊₁(xᵢ₊₁)` | Sin saltos en la curva |
| **C¹ (Velocidad)** | `S'ᵢ(xᵢ₊₁) = S'ᵢ₊₁(xᵢ₊₁)` | Velocidad continua |
| **C² (Aceleración)** | `S''ᵢ(xᵢ₊₁) = S''ᵢ₊₁(xᵢ₊₁)` | Aceleración continua |
| **Natural BC** | `S''(x₀) = 0, S''(xₙ₋₁) = 0` | Condición de frontera natural |

#### Resolución del Sistema Tridiagonal (Algoritmo de Thomas)

Se define `hᵢ = xᵢ₊₁ - xᵢ` y se resuelve el sistema:

```
hᵢ₋₁·cᵢ₋₁ + 2(hᵢ₋₁ + hᵢ)·cᵢ + hᵢ·cᵢ₊₁ = 3·[(yᵢ₊₁ - yᵢ)/hᵢ - (yᵢ - yᵢ₋₁)/hᵢ₋₁]
```

para `i = 1, 2, ..., n-2`, con `c₀ = 0` y `cₙ₋₁ = 0`.

Una vez obtenidos los `cᵢ`, se calculan:

```
aᵢ = yᵢ
bᵢ = (yᵢ₊₁ - yᵢ)/hᵢ - hᵢ·(2cᵢ + cᵢ₊₁)/3
dᵢ = (cᵢ₊₁ - cᵢ)/(3hᵢ)
```

#### Implementación

El archivo `spline.js` implementa:
- **Clase `CubicSpline`**: Resuelve el sistema tridiagonal, almacena coeficientes
- **Método `evaluate(x)`**: Evalúa `S(x)` en cualquier punto
- **Método `derivative(x)`**: Evalúa `S'(x)` — velocidad angular
- **Método `secondDerivative(x)`**: Evalúa `S''(x)` — aceleración angular
- **Clase `ParametricSpline`**: Spline 2D para el perfil del ala

---

## 📊 Análisis de Fourier

### Transformada Discreta de Fourier (DFT)

La señal de desplazamiento angular del ala `x[n]` se transforma al dominio frecuencial:

```
X[k] = Σ(n=0 a N-1) x[n] · e^(-j·2π·k·n/N)
```

para `k = 0, 1, ..., N-1`.

### FFT (Cooley-Tukey Radix-2)

Implementación optimizada O(N·log N) con:
- Permutación bit-reversal
- Mariposas iterativas (butterflies)
- Padding a potencia de 2

### Espectro de Magnitud

```
|X[k]| = (2/N) · √(Re[X[k]]² + Im[X[k]]²)
```

### Frecuencia Fundamental

Se identifica el pico máximo en el espectro (excluyendo DC):

```
f_fundamental = f[argmax(|X[k]|)]  para k ≥ 1
```

### Parámetros de Análisis

| Parámetro | Valor |
|-----------|-------|
| Duración de señal | 2.0 s |
| Tasa de muestreo | 512 Hz |
| Resolución frecuencial | 0.5 Hz |
| Rango analizado | 0–60 Hz |

### Validación Biológica

- **Resultado del modelo**: 13.0 Hz (configurable 5–30 Hz)
- **Rango biológico real**: 12–15 Hz para *Patagona gigas*
- **Verificación**: ✓ El modelo coincide con la realidad biológica

---

## 🎬 Simulación Cinemática

### Modelo de Aleteo

La función angular del ala combina armónicos para simular asimetría biológica (downstroke más rápido que upstroke):

```
θ(t) = A · [sin(ωt) + 0.15·sin(2ωt)] / 1.15
```

donde:
- `A` = amplitud angular (default: ±55°)
- `ω = 2πf` = frecuencia angular
- `f` = frecuencia de aleteo (default: 13 Hz)
- El término `0.15·sin(2ωt)` introduce la asimetría biológica

### Velocidad Angular

```
θ'(t) = A · [ω·cos(ωt) + 0.3ω·cos(2ωt)] / 1.15
```

### Aceleración Angular

```
θ''(t) = A · [-ω²·sin(ωt) - 0.6ω²·sin(2ωt)] / 1.15
```

### Perfil del Ala (Spline Paramétrico)

El perfil del ala se define por 7 puntos de control:

| t | x (normalizado) | y (normalizado) |
|---|-----------------|-----------------|
| 0.00 | 0.00 | 0.00 |
| 0.15 | 0.22 | 0.08 |
| 0.30 | 0.45 | 0.12 |
| 0.50 | 0.65 | 0.10 |
| 0.70 | 0.82 | 0.06 |
| 0.85 | 0.93 | 0.02 |
| 1.00 | 1.00 | 0.00 |

### Renderizado Canvas 2D

La simulación incluye:
- **Cuerpo** con gradientes iridiscentes y gorguera (garganta brillante)
- **Alas** con perfil spline, gradientes multi-color y efecto de perspectiva 3D
- **Plumas** detalladas (primarias, secundarias, textura de escamas)
- **Cola** bifurcada con movimiento ondulante
- **Ojo** detallado con iris, pupila y punto de brillo
- **Pico** largo curvo (característico de colibríes)
- **Partículas ambientales** luminosas
- **Estela fantasma** (ghost trails) que muestra posiciones anteriores
- **Arco angular** que visualiza el ángulo instantáneo

---

## 📸 Sistema de Captura de Datos

### Funcionamiento

Cada vez que el usuario **pausa la simulación**, el sistema captura automáticamente un snapshot con:

| Dato | Descripción |
|------|-------------|
| Timestamp | Hora del sistema al momento de pausar |
| Tiempo de simulación | `t` en segundos |
| Ángulo actual | `θ(t)` en grados |
| Velocidad angular | `θ'(t)` en °/s |
| Aceleración angular | `θ''(t)` en °/s² |
| Ciclo actual | Número de ciclo completado |
| Frecuencia configurada | Hz del slider |
| Fase de vuelo | Upstroke o Downstroke |
| Frecuencia Fourier | Resultado del análisis FFT |

Los snapshots se muestran en el **panel derecho** de la interfaz, acumulándose como un registro histórico de la sesión.

### Interactividad

- **Cambiar sliders** → recalcula TODO (spline, FFT, gráficas, tabla) en tiempo real
- **Arrastrar puntos** en la gráfica spline → modifica la curva y recalcula coeficientes
- **Toggle de capas** → muestra/oculta puntos, tangentes, curvatura, partículas, plumas
- **Gráficas animadas** → se dibujan progresivamente al calcular datos nuevos

---

## 🐍 Backend Python

### Descripción

El archivo `server.py` implementa un servidor HTTP que proporciona cálculos de alta precisión usando:

- **SciPy** `CubicSpline(bc_type='natural')` para splines cúbicos exactos
- **NumPy** `np.fft.rfft()` para FFT optimizada

### API

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/health` | GET | Estado del servidor |
| `/api/compute` | POST | Cálculo completo (spline + FFT) |

### Request `/api/compute`

```json
{
  "frequency": 13,
  "amplitude": 55,
  "duration": 2.0,
  "sampleRate": 512
}
```

### Response

```json
{
  "engine": "scipy+numpy",
  "params": { "frequency": 13, "amplitude": 55, "period_ms": 76.92 },
  "controlPoints": { "t": [...], "y": [...] },
  "spline": { "t": [...], "y": [...], "dy": [...], "ddy": [...] },
  "coefficients": [
    { "segment": 0, "x0": 0.0, "x1": 0.0077, "a": 0.0, "b": 1234.5, "c": 0.0, "d": -5678.9 }
  ],
  "fourier": {
    "frequencies": [...],
    "magnitudes": [...],
    "fundamentalFreq": 13.0,
    "fundamentalPeriod_ms": 76.92
  }
}
```

### Fallback

Si el servidor Python no está activo, la aplicación funciona con el motor JavaScript integrado (`spline.js` + `fourier.js`), que implementa los mismos algoritmos.

---

## 🖥 Interfaz de Usuario

### Layout de 3 Columnas

| Panel Izquierdo | Centro | Panel Derecho |
|-----------------|--------|---------------|
| Sliders: Frecuencia, Amplitud, Longitud, Velocidad | Canvas de animación en tiempo real | Telemetría: Ángulo, Velocidad, Aceleración |
| Toggles: Estela, Puntos, Arco, Partículas, Plumas | Controles: Play/Pause/Reset | Resumen Fourier + Validación |
| Datos biológicos de la especie | Barra de info: t, θ, ciclo, FPS | Estado del motor + Capturas |

### Secciones

1. **Hero** — Presentación con estadísticas animadas
2. **Simulación** — Canvas interactivo con paneles laterales
3. **Splines Cúbicos** — Gráfica interactiva + derivadas + tabla de coeficientes
4. **Fourier** — Señal temporal + espectro de frecuencia + resultados
5. **Ficha Biológica** — Taxonomía, biomecánica, hábitat

---

## 🐦 Datos Biológicos — *Patagona gigas*

| Característica | Valor |
|---------------|-------|
| **Nombre común** | Colibrí Gigante |
| **Nombre científico** | *Patagona gigas* |
| **Familia** | Trochilidae |
| **Orden** | Apodiformes |
| **Tamaño** | 21–23 cm (el colibrí más grande del mundo) |
| **Peso** | 18–24 g |
| **Frecuencia de aleteo** | 12–15 Hz |
| **Envergadura** | ~21 cm |
| **Velocidad máxima** | ~50 km/h |
| **Ángulo de aleteo** | ±60° |
| **Patrón de vuelo** | Figura de 8 invertida |
| **Altitud hábitat** | 2,500–4,200 msnm |
| **Distribución** | Valles interandinos (La Paz: Mallasa, Cota Cota) |
| **Estado de conservación** | Preocupación menor (LC) |

---

## 🚀 Cómo Ejecutar

### Opción 1: Solo Frontend (sin Python)

Abrir `index.html` directamente en el navegador. Usa motor JavaScript.

### Opción 2: Con Backend Python (recomendado)

```bash
# 1. Instalar dependencias
python -m pip install numpy scipy

# 2. Iniciar servidor
python server.py

# 3. Abrir en navegador
# http://localhost:8000
```

### Controles

| Acción | Efecto |
|--------|--------|
| **Slider Frecuencia** | Cambia Hz del aleteo → recalcula todo |
| **Slider Amplitud** | Cambia ángulo máximo → recalcula todo |
| **Slider Longitud** | Cambia tamaño del ala en la animación |
| **Slider Velocidad** | Acelera/desacelera la simulación |
| **Play/Pause** | Inicia/pausa simulación + **captura datos al pausar** |
| **Reset** | Reinicia tiempo a t=0 |
| **Arrastrar puntos** | Modifica puntos de control del spline interactivamente |
| **Botón Puntos** | Muestra/oculta puntos de control en la gráfica |
| **Botón Tangentes** | Muestra/oculta vectores tangentes (S'(t)) |
| **Botón Curvatura** | Muestra/oculta círculos de curvatura (S''(t)) |
| **Recalcular Todo** | Fuerza recálculo completo con el motor activo |

---

## 📚 Referencias

- De Boor, C. (1978). *A Practical Guide to Splines*. Springer.
- Cooley, J.W. & Tukey, J.W. (1965). "An algorithm for the machine calculation of complex Fourier series". *Mathematics of Computation*.
- Altshuler, D.L. & Dudley, R. (2003). "Kinematics of hovering hummingbird flight". *Journal of Experimental Biology*.
- Clark, C.J. (2009). "Kinematic control of male Allen's hummingbird wing trill". *Journal of Experimental Biology*.

---

*Universidad Mayor de San Andrés — Biomecánica Matemática — La Paz, Bolivia*
