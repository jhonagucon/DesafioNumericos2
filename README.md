# 🦅 Biomecánica Matemática del Alkamari Andino (*Vanellus resplendens*)

## Desafío Final — Aves Andinas, La Paz, Bolivia

Simulación digital del ciclo de vuelo del **Alkamari Andino** (*Vanellus resplendens*), ave representativa del altiplano paceño y zonas altoandinas de Bolivia. El proyecto transforma datos de observación biomecánica en una simulación fluida y cinemáticamente coherente utilizando **Splines Cúbicos Naturales** y **Análisis de Frecuencia de Fourier**.

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
- **Analiza** la señal de vuelo mediante la **Transformada Discreta de Fourier (DFT/FFT)** para identificar la frecuencia fundamental
- **Simula** el movimiento del ave en tiempo real con animación Canvas 2D
- **Valida** los resultados contra datos biológicos reales del Alkamari Andino
- **Captura** datos en cada pausa para registro y análisis posterior

---

## 🏗 Arquitectura del Proyecto

```text
Biomecanica/
├── index.html          # Estructura principal de la aplicación
├── index.css           # Sistema de diseño dark mode
├── spline.js           # Motor de Splines Cúbicos Naturales
├── fourier.js          # Motor DFT/FFT
├── simulation.js       # Simulación del ave (Canvas 2D)
├── app.js              # Orquestador principal
├── server.py           # Backend Python
├── requirements.txt    # Dependencias
└── README.md           # Este documento
```

### Flujo de Datos

```text
Parámetros del Usuario (freq, amp, wing_len)
         │
         ▼
┌─────────────────────┐
│  Motor de Cálculo   │ ◄── Python ó JS
│  - Splines          │
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
```

---

## 📐 Fundamentos Matemáticos

### Interpolación por Splines Cúbicos Naturales

Dado un conjunto de `n` puntos de control `(x₀, y₀), (x₁, y₁), ..., (xₙ₋₁, yₙ₋₁)`, se construyen `n-1` polinomios cúbicos de la forma:

```math
Sᵢ(x) = aᵢ + bᵢ(x - xᵢ) + cᵢ(x - xᵢ)² + dᵢ(x - xᵢ)³
```

donde `i = 0, 1, ..., n-2`.

### Condiciones del spline

| Condición | Ecuación | Significado |
|-----------|----------|-------------|
| C⁰ | `Sᵢ(xᵢ₊₁)=Sᵢ₊₁(xᵢ₊₁)` | Continuidad |
| C¹ | `S'ᵢ(xᵢ₊₁)=S'ᵢ₊₁(xᵢ₊₁)` | Velocidad continua |
| C² | `S''ᵢ(xᵢ₊₁)=S''ᵢ₊₁(xᵢ₊₁)` | Aceleración continua |
| Natural BC | `S''(x₀)=0` y `S''(xₙ₋₁)=0` | Bordes suaves |

### Resolución del Sistema Tridiagonal

Se define:

```math
hᵢ = xᵢ₊₁ - xᵢ
```

y se resuelve:

```math
hᵢ₋₁cᵢ₋₁ + 2(hᵢ₋₁+hᵢ)cᵢ + hᵢcᵢ₊₁
=
3[(yᵢ₊₁-yᵢ)/hᵢ - (yᵢ-yᵢ₋₁)/hᵢ₋₁]
```

---

## 📊 Análisis de Fourier

### Transformada Discreta de Fourier

La señal de desplazamiento angular:

```math
X[k] = Σ(n=0→N-1) x[n] · e^(-j2πkn/N)
```

### FFT

Implementación optimizada O(N log N):

- Bit reversal
- Butterflies iterativas
- Padding a potencia de 2

### Espectro de Magnitud

```math
|X[k]| = (2/N) √(Re[X[k]]² + Im[X[k]]²)
```

### Frecuencia Fundamental

```math
f_fundamental = f[argmax(|X[k]|)]
```

---

## 🎬 Simulación Cinemática

### Modelo de Vuelo del Alkamari

La función angular del ala modela un aleteo más lento y amplio que el de un colibrí:

```math
θ(t) = A · [sin(ωt) + 0.08·sin(2ωt)] / 1.08
```

donde:

- `A` = amplitud angular (±35°)
- `ω = 2πf`
- `f` = frecuencia de vuelo (~5 Hz)

---

### Velocidad Angular

```math
θ'(t) = A · [ω·cos(ωt) + 0.16ω·cos(2ωt)] / 1.08
```

### Aceleración Angular

```math
θ''(t) = A · [-ω²·sin(ωt) - 0.32ω²·sin(2ωt)] / 1.08
```

---

## 🪽 Perfil del Ala

El ala del Alkamari es más ancha y estable que la de un colibrí.

| t | x | y |
|---|---|---|
| 0.00 | 0.00 | 0.00 |
| 0.15 | 0.20 | 0.12 |
| 0.30 | 0.42 | 0.18 |
| 0.50 | 0.65 | 0.16 |
| 0.70 | 0.83 | 0.10 |
| 0.85 | 0.94 | 0.04 |
| 1.00 | 1.00 | 0.00 |

---

## 🎨 Renderizado Canvas 2D

La simulación incluye:

- Plumaje blanco, gris y negro
- Alas anchas de ave andina
- Patas largas rojizas
- Pico corto oscuro
- Movimiento corporal oscilatorio
- Partículas ambientales
- Estela de movimiento
- Sombras dinámicas
- Arco angular

---

## 📸 Sistema de Captura de Datos

Cada vez que el usuario pausa la simulación se registra:

| Dato | Descripción |
|------|-------------|
| Timestamp | Hora actual |
| Tiempo de simulación | `t` |
| Ángulo actual | `θ(t)` |
| Velocidad angular | `θ'(t)` |
| Aceleración angular | `θ''(t)` |
| Ciclo actual | Número de ciclo |
| Frecuencia | Hz |
| Fase de vuelo | Ascenso / descenso |
| Fourier | Resultado FFT |

---

## 🐍 Backend Python

### Librerías utilizadas

- NumPy
- SciPy
- FFT NumPy
- CubicSpline SciPy

### API

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/health` | GET | Estado |
| `/api/compute` | POST | Cálculo spline + FFT |

### Request `/api/compute`

```json
{
  "frequency": 5,
  "amplitude": 35,
  "duration": 2.0,
  "sampleRate": 512
}
```

### Response

```json
{
  "engine": "scipy+numpy",
  "params": {
    "frequency": 5,
    "amplitude": 35
  },
  "fourier": {
    "fundamentalFreq": 5.0
  }
}
```

---

## 🖥 Interfaz de Usuario

### Layout de 3 Columnas

| Panel Izquierdo | Centro | Panel Derecho |
|-----------------|--------|---------------|
| Sliders y Toggles | Simulación Canvas | Telemetría |
| Datos biológicos | Controles | Fourier |
| Configuración | Tiempo real | Capturas |

---

## 🦅 Datos Biológicos — *Vanellus resplendens*

| Característica | Valor |
|---------------|-------|
| Nombre común | Alkamari Andino |
| Nombre científico | *Vanellus resplendens* |
| Familia | Charadriidae |
| Orden | Charadriiformes |
| Tamaño | 35–40 cm |
| Peso | 300–400 g |
| Frecuencia de vuelo | 4–6 Hz |
| Envergadura | ~75 cm |
| Velocidad máxima | ~60 km/h |
| Patrón de vuelo | Planeo corto y aleteo amplio |
| Altitud hábitat | 3000–4500 msnm |
| Distribución | Altiplano paceño |
| Estado de conservación | Preocupación menor |

---

## 🚀 Cómo Ejecutar

### Opción 1 — Solo Frontend

Abrir:

```text
index.html
```

---

### Opción 2 — Backend Python

```bash
python -m pip install numpy scipy

python server.py
```

Abrir en navegador:

```text
http://localhost:8000
```

---

## 🎮 Controles

| Acción | Efecto |
|--------|--------|
| Slider Frecuencia | Cambia Hz del vuelo |
| Slider Amplitud | Cambia ángulo |
| Slider Longitud | Tamaño del ala |
| Slider Velocidad | Velocidad simulación |
| Play/Pause | Inicia o pausa |
| Reset | Reinicia |
| Arrastrar puntos | Modifica spline |
| Toggle capas | Activa o desactiva elementos |

---

## 📚 Referencias

- De Boor, C. — *A Practical Guide to Splines*
- Cooley & Tukey — FFT
- Estudios biomecánicos de aves andinas
- Literatura de vuelo de aves altoandinas

---

*Universidad Mayor de San Andrés — Biomecánica Matemática — La Paz, Bolivia*