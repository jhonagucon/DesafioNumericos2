/* ═══════════════════════════════════════════════════════════════
   SIMULACIÓN DEL CÓNDOR ANDINO (Alkamari) — Vultur gryphus
   Biomecánica Matemática · UMSA · La Paz, Bolivia
   ═══════════════════════════════════════════════════════════════ */

class BirdSimulation {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        this.dpr = window.devicePixelRatio || 1;
        this.playing = false;

        this.time = 0;
        this.speed = 1.0;
        this.cycle = 0;

        this.lastTs = 0;
        this.frameCount = 0;
        this.fpsTime = 0;
        this.currentFps = 60;

        // ─── PARÁMETROS DEL CÓNDOR ANDINO ───
        this.flapFrequency = 1.2;    // Hz — aleteo lento y majestuoso
        this.flapAmplitude = 120;    // ° — amplitud amplia
        this.wingLength = 220;       // px — alas grandes

        this.showGhost = true;
        this.showCtrlPts = true;
        this.showAngleArc = true;
        this.showParticles = true;
        this.showFeathers = true;

        this.particles = [];

        this._resize();
        window.addEventListener('resize', () => this._resize());

        // Partículas de corrientes de aire
        for (let i = 0; i < 30; i++) {
            this.particles.push({
                x: Math.random(),
                y: Math.random(),
                vx: (Math.random() - .5) * .15,
                vy: (Math.random() - .5) * .15,
                life: Math.random(),
                size: 1.5 + Math.random() * 2.5
            });
        }
    }

    _resize() {
        const r = this.canvas.getBoundingClientRect();
        this.canvas.width = r.width * this.dpr;
        this.canvas.height = r.height * this.dpr;
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        this.width = r.width;
        this.height = r.height;
    }

    start() {
        this.playing = true;
        this.lastTs = performance.now();
        this._loop(this.lastTs);
    }

    stop() { this.playing = false; }

    reset() {
        this.time = 0;
        this.cycle = 0;
        this._draw(0);
    }

    setSpeed(s) { this.speed = s; }

    // ─── CINEMÁTICA DEL ALA — Con armónicos del cóndor ───
    getWingAngle(t) {
        const w = 2 * Math.PI * this.flapFrequency;
        // Cóndor: armónico fundamental dominante, 2do armónico suave
        return this.flapAmplitude *
            (Math.sin(w * t) + .08 * Math.sin(2 * w * t)) / 1.08;
    }

    getWingVelocity(t) {
        const w = 2 * Math.PI * this.flapFrequency;
        return this.flapAmplitude *
            (w * Math.cos(w * t) + .16 * w * Math.cos(2 * w * t)) / 1.08;
    }

    getWingAccel(t) {
        const w = 2 * Math.PI * this.flapFrequency;
        return this.flapAmplitude *
            (-w * w * Math.sin(w * t) - .32 * w * w * Math.sin(2 * w * t)) / 1.08;
    }

    generateWingSignal(dur, sr) {
        const n = Math.floor(dur * sr);
        const sig = new Float64Array(n);
        const ts = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            ts[i] = i / sr;
            sig[i] = this.getWingAngle(ts[i]);
        }
        return {
            signal: Array.from(sig),
            times: Array.from(ts),
            sampleRate: sr,
            duration: dur
        };
    }

    _loop(ts) {
        if (!this.playing) return;

        const dt = Math.min((ts - this.lastTs) / 1000, 0.05);
        this.lastTs = ts;

        this.time += dt * this.speed;
        this.cycle = Math.floor(this.time * this.flapFrequency);

        this.frameCount++;
        this.fpsTime += dt;

        if (this.fpsTime >= .5) {
            this.currentFps = Math.round(this.frameCount / this.fpsTime);
            this.frameCount = 0;
            this.fpsTime = 0;
        }

        this._draw(this.time);
        this._updateUI();

        requestAnimationFrame(t => this._loop(t));
    }

    _draw(t) {
        const ctx = this.ctx;
        const W = this.width;
        const H = this.height;

        ctx.clearRect(0, 0, W, H);

        // Fondo con gradiente atmosférico andino
        const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
        bgGrad.addColorStop(0, '#06080f');
        bgGrad.addColorStop(0.5, '#0c0e14');
        bgGrad.addColorStop(1, '#080a10');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        this._drawGrid(ctx, W, H);

        const cx = W * .5;
        const cy = H * .46;

        const angle = this.getWingAngle(t);
        const aRad = angle * Math.PI / 180;

        if (this.showParticles) this._drawParticles(ctx, cx, cy, t);
        if (this.showGhost)    this._drawGhosts(ctx, cx, cy, t);

        this._drawBird(ctx, cx, cy, aRad, t);

        if (this.showAngleArc) this._drawArc(ctx, cx, cy, aRad);
        this._drawOverlay(ctx, W, H, angle);
    }

    _drawGrid(ctx, W, H) {
        ctx.strokeStyle = 'rgba(148,163,184,.025)';
        ctx.lineWidth = .5;
        for (let x = 0; x < W; x += 50) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        }
        for (let y = 0; y < H; y += 50) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        }

        // Línea horizonte
        ctx.strokeStyle = 'rgba(234,179,8,.06)';
        ctx.lineWidth = 1;
        ctx.setLineDash([8, 12]);
        ctx.beginPath();
        ctx.moveTo(0, H * .46);
        ctx.lineTo(W, H * .46);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    _drawParticles(ctx, cx, cy, t) {
        this.particles.forEach(p => {
            p.x += p.vx * .002;
            p.y += p.vy * .002;
            p.life -= .0015;

            if (p.life < 0) {
                p.x = .2 + Math.random() * .6;
                p.y = .25 + Math.random() * .5;
                p.life = 1;
            }

            const px = p.x * this.width;
            const py = p.y * this.height;
            const alpha = p.life * .25;

            // Partículas doradas (corrientes andinas)
            const glow = ctx.createRadialGradient(px, py, 0, px, py, p.size * 4);
            glow.addColorStop(0, `rgba(234,179,8,${alpha})`);
            glow.addColorStop(1, 'transparent');

            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(px, py, p.size * 4, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    _drawGhosts(ctx, cx, cy, t) {
        for (let g = 6; g >= 1; g--) {
            const gt = t - g * .04; // Más espaciado (cóndor lento)
            const a = this.getWingAngle(gt) * Math.PI / 180;
            const al = .018 * (7 - g) / 6;

            ctx.save();
            ctx.globalAlpha = al;
            this._drawWingOutline(ctx, cx, cy, a, 1, 'rgba(234,179,8,.4)');
            this._drawWingOutline(ctx, cx, cy, a, -1, 'rgba(234,179,8,.4)');
            ctx.restore();
        }
    }

    // ─── CONTORNO DEL ALA (para fantasmas) ───
    _drawWingOutline(ctx, cx, cy, aRad, side, color) {
        const L = this.wingLength;
        ctx.save();
        ctx.translate(cx, cy);

        const tipX = side * L * 0.95;
        const tipY = -Math.sin(aRad) * L;

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        // Borde de ataque
        ctx.bezierCurveTo(
            side * L * 0.25, -L * 0.08 * Math.sin(aRad),
            side * L * 0.55, -L * 0.22 * Math.sin(aRad),
            tipX * 0.88, tipY * 0.92
        );
        ctx.lineTo(tipX, tipY);
        // Borde trasero
        ctx.bezierCurveTo(
            side * L * 0.6, -L * 0.02 * Math.sin(aRad) + L * 0.1,
            side * L * 0.3, L * 0.14,
            0, 0
        );
        ctx.stroke();
        ctx.restore();
    }

    // ─── PÁJARO COMPLETO ───
    _drawBird(ctx, cx, cy, aRad, t) {
        // Balanceo vertical suave (cóndor: oscilación lenta)
        const bob = 3 * Math.sin(2 * Math.PI * this.flapFrequency * t);
        const by = cy + bob;

        // Dibujar alas detrás del cuerpo
        this._drawWing(ctx, cx, by, aRad, t, -1); // Ala izquierda (detrás)
        this._drawWing(ctx, cx, by, aRad, t, 1);  // Ala derecha
        this._drawBody(ctx, cx, by, t);
        this._drawTail(ctx, cx, by, t);
        this._drawHead(ctx, cx, by, t);
    }

    // ─── ALA DEL CÓNDOR ───
    _drawWing(ctx, cx, cy, aRad, t, side) {
        this._drawWingInternal(ctx, cx, cy, aRad, side);
    }

    _drawWingInternal(ctx, cx, cy, aRad, side) {
        const L = this.wingLength;
        ctx.save();
        ctx.translate(cx, cy);

        const wingY = -Math.sin(aRad) * L;
        const tipX  = side * L * 0.95;
        const tipY  = wingY;

        // ── Superficie principal del ala ──
        const grad = ctx.createLinearGradient(0, 0, tipX, tipY);
        if (side > 0) {
            grad.addColorStop(0, 'rgba(28,30,38,0.95)');
            grad.addColorStop(0.4, 'rgba(40,42,55,0.9)');
            grad.addColorStop(0.75, 'rgba(35,37,48,0.85)');
            grad.addColorStop(1, 'rgba(22,24,32,0.7)');
        } else {
            grad.addColorStop(0, 'rgba(20,22,30,0.7)');
            grad.addColorStop(1, 'rgba(15,17,25,0.5)');
        }

        // Puntos del ala del cóndor (forma característica)
        const progress = Math.sin(aRad);
        const sweep = progress * L * 0.15; // Flexión en punta

        ctx.beginPath();
        ctx.moveTo(0, 0); // Raíz

        // Borde de ataque (leading edge) - recto y rígido
        ctx.bezierCurveTo(
            side * L * 0.25, -L * 0.08 * Math.sin(aRad),
            side * L * 0.55, -L * 0.22 * Math.sin(aRad) - sweep * 0.3,
            tipX * 0.82, tipY * 0.85 - sweep
        );

        // Punta del ala — dedos del cóndor
        ctx.lineTo(tipX * 0.88, tipY * 0.95 - sweep * 1.1);
        ctx.lineTo(tipX * 0.93, tipY * 1.0  - sweep * 1.15);
        ctx.lineTo(tipX,        tipY * 1.02 - sweep * 1.2); // punta final
        ctx.lineTo(tipX * 0.96, tipY * 0.98 - sweep * 1.1);

        // Borde trasero (trailing edge) - cóncavo
        ctx.bezierCurveTo(
            side * L * 0.65, -L * 0.04 * Math.sin(aRad) + L * 0.12,
            side * L * 0.35,  L * 0.16,
            side * L * 0.12,  L * 0.08
        );

        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // Borde brillante (leading edge highlight)
        if (side > 0) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(
                side * L * 0.25, -L * 0.08 * Math.sin(aRad),
                side * L * 0.55, -L * 0.22 * Math.sin(aRad),
                tipX * 0.82, tipY * 0.85 - sweep
            );
            ctx.strokeStyle = 'rgba(234,179,8,0.12)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // ── Cálamos / plumas primarias del cóndor ──
        if (this.showFeathers) {
            this._drawPrimaryFeathers(ctx, side, L, aRad, sweep);
            this._drawSecondaryFeathers(ctx, side, L, aRad);
            this._drawCoverts(ctx, side, L, aRad);
        }

        // Contorno del ala
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(
            side * L * 0.25, -L * 0.08 * Math.sin(aRad),
            side * L * 0.55, -L * 0.22 * Math.sin(aRad) - sweep * 0.3,
            tipX * 0.82, tipY * 0.85 - sweep
        );
        ctx.strokeStyle = side > 0 ? 'rgba(234,179,8,0.08)' : 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        ctx.restore();
    }

    // ── Plumas primarias (dedos) del cóndor ──
    _drawPrimaryFeathers(ctx, side, L, aRad, sweep) {
        const numPrimaries = 7; // Cóndor: 7 primarias visibles
        for (let i = 0; i < numPrimaries; i++) {
            const t = 0.55 + i * (0.45 / numPrimaries);
            const tx = side * L * t * Math.cos(aRad * 0.15);
            const ty = -L * t * Math.sin(aRad) - sweep * (t - 0.55) / 0.45;

            // Separación entre plumas
            const sep = (i / numPrimaries) * 6;
            const ex = tx + side * L * 0.08 * (1 + i * 0.02);
            const ey = ty - L * 0.04 * (1 + i * 0.05) - sep;

            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.quadraticCurveTo(
                tx + side * 8, ty - 3 - sep * 0.5,
                ex, ey
            );
            ctx.strokeStyle = `rgba(18,20,28,${0.7 + i * 0.04})`;
            ctx.lineWidth = 2.5 - i * 0.2;
            ctx.stroke();

            // Brillo de la pluma
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.quadraticCurveTo(tx + side * 4, ty - 1.5 - sep * 0.3, ex - side * 2, ey + 1);
            ctx.strokeStyle = `rgba(234,179,8,${0.04 + i * 0.01})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
        }
    }

    // ── Plumas secundarias ──
    _drawSecondaryFeathers(ctx, side, L, aRad) {
        const numSec = 5;
        for (let i = 0; i < numSec; i++) {
            const t = 0.2 + i * (0.35 / numSec);
            const tx = side * L * t * 0.95;
            const ty = -L * t * Math.sin(aRad) * 0.9;

            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.quadraticCurveTo(tx + side * 4, ty + 6, tx + side * 2, ty + 14);
            ctx.strokeStyle = 'rgba(30,32,42,0.6)';
            ctx.lineWidth = 1.8;
            ctx.stroke();
        }
    }

    // ── Cobertoras del ala ──
    _drawCoverts(ctx, side, L, aRad) {
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const t = i / 7;
            const tx = side * L * t * 0.7;
            const ty = -L * t * Math.sin(aRad) * 0.8;
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx, ty + 8 - t * 3);
        }
        ctx.strokeStyle = 'rgba(50,52,65,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // ─── CUERPO DEL CÓNDOR ───
    _drawBody(ctx, cx, cy, t) {
        ctx.save();
        ctx.translate(cx, cy);

        const bob = 3 * Math.sin(2 * Math.PI * this.flapFrequency * t);

        // Cuerpo principal — negro con collar blanco
        const bodyGrad = ctx.createLinearGradient(-30, -20, 30, 30);
        bodyGrad.addColorStop(0, '#2a2c3a');
        bodyGrad.addColorStop(0.3, '#1a1c28');
        bodyGrad.addColorStop(0.7, '#141620');
        bodyGrad.addColorStop(1, '#0c0d14');

        // Torso
        ctx.beginPath();
        ctx.ellipse(0, 5, 28, 42, 0, 0, Math.PI * 2);
        ctx.fillStyle = bodyGrad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(234,179,8,0.08)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Collar blanco característico del cóndor
        const collarGrad = ctx.createLinearGradient(-22, -30, 22, -10);
        collarGrad.addColorStop(0, 'rgba(240,240,235,0.9)');
        collarGrad.addColorStop(0.5, 'rgba(255,255,250,0.95)');
        collarGrad.addColorStop(1, 'rgba(220,220,215,0.8)');

        ctx.beginPath();
        ctx.ellipse(0, -28, 18, 10, 0, 0, Math.PI * 2);
        ctx.fillStyle = collarGrad;
        ctx.fill();

        // Textura plumas del cuerpo
        for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            ctx.ellipse(
                (Math.sin(i * 1.2) * 12),
                -5 + i * 10,
                8, 4, 0, 0, Math.PI * 2
            );
            ctx.fillStyle = 'rgba(255,255,255,0.02)';
            ctx.fill();
        }

        ctx.restore();
    }

    // ─── CABEZA DEL CÓNDOR ───
    _drawHead(ctx, cx, cy, t) {
        ctx.save();
        ctx.translate(cx, cy);

        const bob = 3 * Math.sin(2 * Math.PI * this.flapFrequency * t);
        const headY = -56 + bob * 0.3;

        // Cresta / carúncula (tejido rojo en la cabeza)
        ctx.beginPath();
        ctx.ellipse(0, headY - 10, 7, 9, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#8b1a1a';
        ctx.fill();

        // Cabeza roja característica
        const headGrad = ctx.createRadialGradient(2, headY - 2, 2, 0, headY, 14);
        headGrad.addColorStop(0, '#c04040');
        headGrad.addColorStop(0.5, '#a03030');
        headGrad.addColorStop(1, '#701818');
        ctx.beginPath();
        ctx.ellipse(0, headY, 14, 16, 0, 0, Math.PI * 2);
        ctx.fillStyle = headGrad;
        ctx.fill();

        // Pico ganchudo del cóndor
        ctx.beginPath();
        ctx.moveTo(-4, headY + 6);
        ctx.bezierCurveTo(4, headY + 2, 18, headY + 8, 20, headY + 14);
        ctx.bezierCurveTo(18, headY + 16, 8, headY + 12, 6, headY + 14);
        ctx.bezierCurveTo(2, headY + 18, -2, headY + 14, -4, headY + 12);
        ctx.closePath();
        ctx.fillStyle = '#d4c06a'; // Color marfil-amarillo
        ctx.fill();
        ctx.strokeStyle = 'rgba(180,160,60,0.4)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Ojo
        ctx.beginPath();
        ctx.arc(5, headY - 4, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#f4a824';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(5.5, headY - 4, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1208';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(6.5, headY - 5, 1, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fill();

        // Cuello
        ctx.beginPath();
        ctx.moveTo(-10, headY + 12);
        ctx.quadraticCurveTo(-12, headY + 28, -14, -40);
        ctx.moveTo(10, headY + 12);
        ctx.quadraticCurveTo(12, headY + 28, 14, -40);
        ctx.strokeStyle = 'rgba(20,22,30,0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
    }

    // ─── COLA DEL CÓNDOR ───
    _drawTail(ctx, cx, cy, t) {
        ctx.save();
        ctx.translate(cx, cy);

        // Oscilación suave de la cola
        const tailWag = Math.sin(2 * Math.PI * this.flapFrequency * t * 0.5) * 4;
        const tailBase = 44;

        const tailGrad = ctx.createLinearGradient(0, tailBase, 0, tailBase + 38);
        tailGrad.addColorStop(0, 'rgba(28,30,40,0.95)');
        tailGrad.addColorStop(0.5, 'rgba(20,22,32,0.9)');
        tailGrad.addColorStop(1, 'rgba(12,14,22,0.7)');

        // Cola en abanico — característica del cóndor
        const numTail = 8;
        for (let i = 0; i < numTail; i++) {
            const angle = (-20 + i * (40 / (numTail - 1))) * Math.PI / 180;
            const len = 36 + (i === Math.floor(numTail / 2) ? 4 : 0);
            const tx = Math.sin(angle) * len + tailWag * 0.3;
            const ty = tailBase + Math.cos(angle) * len;

            ctx.beginPath();
            ctx.moveTo(0, tailBase - 2);
            ctx.quadraticCurveTo(tx * 0.4 + tailWag * 0.1, tailBase + len * 0.4, tx + tailWag * 0.3, ty);
            ctx.strokeStyle = `rgba(20,22,32,${0.8 + i * 0.02})`;
            ctx.lineWidth = 4 - Math.abs(i - numTail / 2) * 0.3;
            ctx.stroke();

            // Brillo de pluma
            ctx.beginPath();
            ctx.moveTo(tx * 0.1, tailBase);
            ctx.quadraticCurveTo(tx * 0.3, tailBase + len * 0.3, tx + tailWag * 0.2, ty - 2);
            ctx.strokeStyle = 'rgba(234,179,8,0.04)';
            ctx.lineWidth = 0.8;
            ctx.stroke();
        }

        // Base de la cola
        ctx.beginPath();
        ctx.ellipse(tailWag * 0.2, tailBase + 2, 16, 8, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(24,26,36,0.9)';
        ctx.fill();

        ctx.restore();
    }

    // ─── ARCO DE ÁNGULO ───
    _drawArc(ctx, cx, cy, aRad) {
        if (Math.abs(aRad) < 0.01) return;
        const R = 70;

        ctx.save();
        ctx.translate(cx, cy);

        // Arco derecho
        ctx.beginPath();
        ctx.arc(0, 0, R, -Math.PI / 2, -Math.PI / 2 - aRad, aRad > 0);
        ctx.strokeStyle = 'rgba(234,179,8,0.25)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Arco izquierdo (simétrico)
        ctx.beginPath();
        ctx.arc(0, 0, R, -Math.PI / 2, -Math.PI / 2 + aRad, aRad < 0);
        ctx.strokeStyle = 'rgba(234,179,8,0.25)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Etiqueta del ángulo
        const deg = (aRad * 180 / Math.PI).toFixed(1);
        ctx.font = '600 11px "JetBrains Mono"';
        ctx.fillStyle = 'rgba(234,179,8,0.55)';
        ctx.textAlign = 'center';
        ctx.fillText(`${deg}°`, 0, -R - 10);

        ctx.restore();
    }

    // ─── OVERLAY DE INFORMACIÓN ───
    _drawOverlay(ctx, W, H, angle) {
        // Nombre del ave
        ctx.font = '600 12px Inter';
        ctx.fillStyle = 'rgba(234,179,8,0.35)';
        ctx.textAlign = 'left';
        ctx.fillText('CÓNDOR ANDINO — Vultur gryphus', 16, 22);

        ctx.font = '400 10px "JetBrains Mono"';
        ctx.fillStyle = 'rgba(148,163,184,0.3)';
        ctx.fillText(
            `f=${this.flapFrequency}Hz  A=±${this.flapAmplitude}°  L=${this.wingLength}px`,
            16, 38
        );

        // Fase del aleteo
        ctx.textAlign = 'right';
        const st = angle > 0 ? 'UPSTROKE ▲' : angle < 0 ? 'DOWNSTROKE ▼' : 'NEUTRAL ─';
        ctx.fillStyle = angle > 0
            ? 'rgba(52,211,153,.4)'
            : angle < 0
                ? 'rgba(251,113,133,.4)'
                : 'rgba(148,163,184,.3)';
        ctx.fillText(st, W - 16, 22);

        // Línea central de referencia
        ctx.strokeStyle = 'rgba(234,179,8,0.08)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 8]);
        ctx.beginPath();
        ctx.moveTo(W * .2, H * .46);
        ctx.lineTo(W * .8, H * .46);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // ─── ACTUALIZAR UI ───
    _updateUI() {
        const el = id => document.getElementById(id);

        const a = this.getWingAngle(this.time);
        const v = this.getWingVelocity(this.time);
        const acc = this.getWingAccel(this.time);
        const period = 1 / this.flapFrequency;

        if (el('sim-time'))  el('sim-time').textContent  = this.time.toFixed(3);
        if (el('sim-angle')) el('sim-angle').textContent = a.toFixed(1);
        if (el('sim-cycle')) el('sim-cycle').textContent = this.cycle;
        if (el('sim-fps'))   el('sim-fps').textContent   = this.currentFps;

        // Telemetría extendida
        if (el('telem-angle'))  el('telem-angle').textContent  = a.toFixed(1) + '°';
        if (el('telem-vel'))    el('telem-vel').textContent    = v.toFixed(1) + ' °/s';
        if (el('telem-acc'))    el('telem-acc').textContent    = acc.toFixed(1) + ' °/s²';
        if (el('telem-phase'))  el('telem-phase').textContent  = a > 2 ? 'Upstroke ▲' : a < -2 ? 'Downstroke ▼' : 'Neutro';
        if (el('telem-period')) el('telem-period').textContent = (period * 1000).toFixed(0) + ' ms';
        if (el('telem-energy')) {
            const Ek = 0.5 * (v * Math.PI / 180) ** 2;
            el('telem-energy').textContent = Ek.toFixed(4) + ' J·m⁻²';
        }
    }
}
