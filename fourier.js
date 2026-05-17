/* ═══════════════════════════════════════════════════════════════
   DISCRETE FOURIER TRANSFORM (DFT) ENGINE
   Custom implementation — no external dependencies
   ═══════════════════════════════════════════════════════════════ */

class FourierAnalysis {
    /**
     * Compute the Discrete Fourier Transform of a real signal
     * X[k] = Σ x[n] * e^(-j2πkn/N)  for k = 0, 1, ..., N-1
     *
     * @param {number[]} signal - Real-valued time-domain signal
     * @param {number} sampleRate - Sampling rate in Hz
     * @returns {{ frequencies: number[], magnitudes: number[], phases: number[], fundamentalFreq: number, fundamentalPeriod: number }}
     */
    static dft(signal, sampleRate) {
        const N = signal.length;
        const halfN = Math.floor(N / 2);
        const real = new Float64Array(N);
        const imag = new Float64Array(N);

        // Compute DFT
        for (let k = 0; k < N; k++) {
            let sumReal = 0;
            let sumImag = 0;
            for (let n = 0; n < N; n++) {
                const angle = (2 * Math.PI * k * n) / N;
                sumReal += signal[n] * Math.cos(angle);
                sumImag -= signal[n] * Math.sin(angle);
            }
            real[k] = sumReal;
            imag[k] = sumImag;
        }

        // Compute magnitude spectrum (single-sided)
        const frequencies = new Float64Array(halfN);
        const magnitudes = new Float64Array(halfN);
        const phases = new Float64Array(halfN);

        for (let k = 0; k < halfN; k++) {
            frequencies[k] = (k * sampleRate) / N;
            magnitudes[k] = (2 / N) * Math.sqrt(real[k] * real[k] + imag[k] * imag[k]);
            phases[k] = Math.atan2(imag[k], real[k]);
        }
        // DC component doesn't need the 2x factor
        magnitudes[0] /= 2;

        // Find fundamental frequency (highest peak excluding DC)
        let maxMag = 0;
        let maxIdx = 1;
        for (let k = 1; k < halfN; k++) {
            if (magnitudes[k] > maxMag) {
                maxMag = magnitudes[k];
                maxIdx = k;
            }
        }

        const fundamentalFreq = frequencies[maxIdx];
        const fundamentalPeriod = fundamentalFreq > 0 ? 1 / fundamentalFreq : Infinity;

        return {
            frequencies: Array.from(frequencies),
            magnitudes: Array.from(magnitudes),
            phases: Array.from(phases),
            fundamentalFreq,
            fundamentalPeriod,
            fundamentalIndex: maxIdx,
            N,
            sampleRate
        };
    }

    /**
     * Fast Fourier Transform (Cooley-Tukey radix-2)
     * Input length must be a power of 2
     */
    static fft(signal, sampleRate) {
        // Pad to next power of 2
        let N = 1;
        while (N < signal.length) N <<= 1;
        const padded = new Float64Array(N);
        padded.set(signal);

        const real = new Float64Array(N);
        const imag = new Float64Array(N);
        for (let i = 0; i < N; i++) real[i] = padded[i];

        FourierAnalysis._fftRecursive(real, imag, N);

        const halfN = Math.floor(N / 2);
        const frequencies = new Float64Array(halfN);
        const magnitudes = new Float64Array(halfN);

        for (let k = 0; k < halfN; k++) {
            frequencies[k] = (k * sampleRate) / N;
            magnitudes[k] = (2 / N) * Math.sqrt(real[k] * real[k] + imag[k] * imag[k]);
        }
        magnitudes[0] /= 2;

        let maxMag = 0, maxIdx = 1;
        for (let k = 1; k < halfN; k++) {
            if (magnitudes[k] > maxMag) { maxMag = magnitudes[k]; maxIdx = k; }
        }

        return {
            frequencies: Array.from(frequencies),
            magnitudes: Array.from(magnitudes),
            fundamentalFreq: frequencies[maxIdx],
            fundamentalPeriod: frequencies[maxIdx] > 0 ? 1 / frequencies[maxIdx] : Infinity,
            fundamentalIndex: maxIdx,
            N,
            sampleRate
        };
    }

    static _fftRecursive(real, imag, N) {
        if (N <= 1) return;

        // Bit-reversal permutation
        const bits = Math.log2(N);
        for (let i = 0; i < N; i++) {
            const j = FourierAnalysis._reverseBits(i, bits);
            if (j > i) {
                [real[i], real[j]] = [real[j], real[i]];
                [imag[i], imag[j]] = [imag[j], imag[i]];
            }
        }

        // Iterative Cooley-Tukey
        for (let size = 2; size <= N; size *= 2) {
            const halfSize = size / 2;
            const angleStep = -2 * Math.PI / size;
            for (let i = 0; i < N; i += size) {
                for (let j = 0; j < halfSize; j++) {
                    const angle = angleStep * j;
                    const cos = Math.cos(angle);
                    const sin = Math.sin(angle);
                    const tReal = cos * real[i + j + halfSize] - sin * imag[i + j + halfSize];
                    const tImag = sin * real[i + j + halfSize] + cos * imag[i + j + halfSize];
                    real[i + j + halfSize] = real[i + j] - tReal;
                    imag[i + j + halfSize] = imag[i + j] - tImag;
                    real[i + j] += tReal;
                    imag[i + j] += tImag;
                }
            }
        }
    }

    static _reverseBits(val, bits) {
        let result = 0;
        for (let i = 0; i < bits; i++) {
            result = (result << 1) | (val & 1);
            val >>= 1;
        }
        return result;
    }

    /**
     * Reconstruct signal from first N harmonics
     */
    static reconstruct(result, numHarmonics, numSamples) {
        const signal = new Float64Array(numSamples);
        const { frequencies, magnitudes, N, sampleRate } = result;
        const duration = N / sampleRate;

        for (let i = 0; i < numSamples; i++) {
            const t = (i / numSamples) * duration;
            let val = 0;
            const limit = Math.min(numHarmonics + 1, frequencies.length);
            for (let k = 0; k < limit; k++) {
                val += magnitudes[k] * Math.cos(2 * Math.PI * frequencies[k] * t);
            }
            signal[i] = val;
        }
        return Array.from(signal);
    }
}
