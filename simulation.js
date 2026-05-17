/* ═══ BIRD WING SIMULATION — Enhanced Rendering ═══ */
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
        this.flapFrequency = 13;
        this.flapAmplitude = 55;
        this.wingLength = 130;
        this.showGhost = true;
        this.showCtrlPts = true;
        this.showAngleArc = true;
        this.showParticles = true;
        this.showFeathers = true;
        this.particles = [];
        this.wingProfilePoints = { t:[0,.15,.3,.5,.7,.85,1], x:[0,.22,.45,.65,.82,.93,1], y:[0,.08,.12,.10,.06,.02,0] };
        this.wingSpline = new ParametricSpline(this.wingProfilePoints.t, this.wingProfilePoints.x, this.wingProfilePoints.y);
        this._resize();
        window.addEventListener('resize', () => this._resize());
        for (let i = 0; i < 25; i++) this.particles.push({ x: Math.random(), y: Math.random(), vx: (Math.random() - .5) * .2, vy: (Math.random() - .5) * .2, life: Math.random(), size: 1 + Math.random() * 2 });
    }
    _resize() {
        const r = this.canvas.getBoundingClientRect();
        this.canvas.width = r.width * this.dpr; this.canvas.height = r.height * this.dpr;
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        this.width = r.width; this.height = r.height;
    }
    start() { this.playing = true; this.lastTs = performance.now(); this._loop(this.lastTs); }
    stop() { this.playing = false; }
    reset() { this.time = 0; this.cycle = 0; this._draw(0); }
    setSpeed(s) { this.speed = s; }
    getWingAngle(t) {
        const w = 2 * Math.PI * this.flapFrequency;
        return this.flapAmplitude * (Math.sin(w * t) + .15 * Math.sin(2 * w * t)) / 1.15;
    }
    getWingVelocity(t) {
        const w = 2 * Math.PI * this.flapFrequency;
        return this.flapAmplitude * (w * Math.cos(w * t) + .3 * w * Math.cos(2 * w * t)) / 1.15;
    }
    getWingAccel(t) {
        const w = 2 * Math.PI * this.flapFrequency;
        return this.flapAmplitude * (-w * w * Math.sin(w * t) - .6 * w * w * Math.sin(2 * w * t)) / 1.15;
    }
    generateWingSignal(dur, sr) {
        const n = Math.floor(dur * sr), sig = new Float64Array(n), ts = new Float64Array(n);
        for (let i = 0; i < n; i++) { ts[i] = i / sr; sig[i] = this.getWingAngle(ts[i]); }
        return { signal: Array.from(sig), times: Array.from(ts), sampleRate: sr, duration: dur };
    }
    _loop(ts) {
        if (!this.playing) return;
        const dt = (ts - this.lastTs) / 1000; this.lastTs = ts;
        this.time += dt * this.speed;
        this.cycle = Math.floor(this.time * this.flapFrequency);
        this.frameCount++; this.fpsTime += dt;
        if (this.fpsTime >= .5) { this.currentFps = Math.round(this.frameCount / this.fpsTime); this.frameCount = 0; this.fpsTime = 0; }
        this._draw(this.time); this._updateUI();
        requestAnimationFrame(t => this._loop(t));
    }
    _draw(t) {
        const ctx = this.ctx, W = this.width, H = this.height;
        ctx.clearRect(0, 0, W, H);
        this._drawGrid(ctx, W, H);
        const cx = W * .5, cy = H * .46, angle = this.getWingAngle(t), aRad = angle * Math.PI / 180;
        if (this.showParticles) this._drawParticles(ctx, cx, cy, t);
        if (this.showGhost) this._drawGhosts(ctx, cx, cy, t);
        this._drawBird(ctx, cx, cy, aRad, t);
        if (this.showAngleArc) this._drawArc(ctx, cx, cy, aRad);
        this._drawOverlay(ctx, W, H, angle);
    }
    _drawGrid(ctx, W, H) {
        ctx.strokeStyle = 'rgba(148,163,184,.03)'; ctx.lineWidth = .5;
        for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    }
    _drawParticles(ctx, cx, cy, t) {
        this.particles.forEach(p => {
            p.x += p.vx * .003; p.y += p.vy * .003; p.life -= .002;
            if (p.life < 0) { p.x = .3 + Math.random() * .4; p.y = .3 + Math.random() * .4; p.life = 1; }
            const px = p.x * this.width, py = p.y * this.height;
            const glow = ctx.createRadialGradient(px, py, 0, px, py, p.size * 3);
            glow.addColorStop(0, `rgba(34,211,238,${p.life * .3})`); glow.addColorStop(1, 'transparent');
            ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(px, py, p.size * 3, 0, Math.PI * 2); ctx.fill();
        });
    }
    _drawGhosts(ctx, cx, cy, t) {
        for (let g = 5; g >= 1; g--) {
            const gt = t - g * .007, a = this.getWingAngle(gt) * Math.PI / 180, al = .025 * (6 - g) / 5;
            ctx.save(); ctx.globalAlpha = al;
            this._drawWingOutline(ctx, cx, cy, a, 1, 'rgba(34,211,238,.3)');
            this._drawWingOutline(ctx, cx, cy, a, -1, 'rgba(34,211,238,.3)');
            ctx.restore();
        }
    }
    _drawBird(ctx, cx, cy, aRad, t) {
        const bob = 2.5 * Math.sin(2 * Math.PI * this.flapFrequency * t * 2), by = cy + bob;
        this._drawWing(ctx, cx, by, aRad, t, 1);
        this._drawWing(ctx, cx, by, aRad, t, -1);
        this._drawBody(ctx, cx, by, t);
        this._drawTail(ctx, cx, by, t);
    }
    _drawBody(ctx, cx, cy, t) {
        ctx.save(); ctx.translate(cx, cy);
        // Glow aura
        const aura = ctx.createRadialGradient(0, -5, 8, 0, -5, 60);
        aura.addColorStop(0, 'rgba(34,211,238,.12)'); aura.addColorStop(1, 'transparent');
        ctx.fillStyle = aura; ctx.beginPath(); ctx.ellipse(0, -5, 60, 60, 0, 0, Math.PI * 2); ctx.fill();
        // Body
        const bg = ctx.createLinearGradient(-18, -40, 18, 40);
        bg.addColorStop(0, '#3dd8c5'); bg.addColorStop(.3, '#0fa896'); bg.addColorStop(.6, '#0d7d6d'); bg.addColorStop(1, '#065f46');
        ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(0, 0, 16, 38, 0, 0, Math.PI * 2); ctx.fill();
        // Iridescent gorget (throat)
        const shimmer = Math.sin(t * 8) * .15 + .5;
        const gg = ctx.createRadialGradient(0, 10, 2, 0, 10, 16);
        gg.addColorStop(0, `rgba(251,191,36,${shimmer})`); gg.addColorStop(.5, `rgba(244,63,94,${shimmer * .7})`); gg.addColorStop(1, 'transparent');
        ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(0, 10, 12, 16, 0, 0, Math.PI * 2); ctx.fill();
        // Belly scales (feather detail)
        if (this.showFeathers) {
            ctx.strokeStyle = 'rgba(255,255,255,.04)'; ctx.lineWidth = .5;
            for (let row = -20; row < 30; row += 6) {
                for (let col = -8; col < 8; col += 5) {
                    const ox = col + (row % 2 ? 2.5 : 0);
                    ctx.beginPath(); ctx.arc(ox, row, 2.5, 0, Math.PI, false); ctx.stroke();
                }
            }
        }
        // Head
        const hg = ctx.createRadialGradient(-2, -42, 3, 0, -38, 14);
        hg.addColorStop(0, '#2dd4bf'); hg.addColorStop(1, '#0f766e');
        ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, -42, 13, 0, Math.PI * 2); ctx.fill();
        // Crown iridescence
        const cg = ctx.createLinearGradient(-10, -55, 10, -42);
        cg.addColorStop(0, `rgba(139,92,246,${.3 + Math.sin(t * 6) * .1})`);
        cg.addColorStop(1, 'transparent');
        ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, -48, 8, Math.PI, 0); ctx.fill();
        // Eye
        ctx.fillStyle = '#1e1b4b'; ctx.beginPath(); ctx.ellipse(6, -44, 3.5, 4, .1, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.ellipse(6, -44, 2.8, 3.2, .1, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(6.5, -44, 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(7.5, -45.5, .6, 0, Math.PI * 2); ctx.fill();
        // Beak
        ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        ctx.strokeStyle = '#1e293b'; ctx.beginPath(); ctx.moveTo(9, -49); ctx.quadraticCurveTo(28, -55, 42, -57); ctx.stroke();
        ctx.lineWidth = 1.8; ctx.strokeStyle = '#475569'; ctx.beginPath(); ctx.moveTo(9, -48); ctx.quadraticCurveTo(27, -53.5, 41, -56); ctx.stroke();
        // Beak lower mandible
        ctx.lineWidth = 1.2; ctx.strokeStyle = '#334155'; ctx.beginPath(); ctx.moveTo(9, -47); ctx.quadraticCurveTo(25, -51, 39, -54); ctx.stroke();
        ctx.restore();
    }
    _drawWing(ctx, cx, cy, aRad, t, side) {
        ctx.save(); ctx.translate(cx, cy);
        const attach = -10, foreshorten = .7 + .3 * Math.cos(aRad), nPts = 24;
        const leading = [], trailing = [];
        for (let i = 0; i <= nPts; i++) {
            const tp = i / nPts, pt = this.wingSpline.evaluate(tp);
            const sx = pt.x * this.wingLength * side * foreshorten;
            const sy = attach + pt.y * this.wingLength * .4 * Math.cos(aRad) - pt.x * this.wingLength * Math.sin(aRad) * .4;
            leading.push({ x: sx, y: sy });
            const ty = attach + (pt.y * .15 + .1) * this.wingLength * Math.cos(aRad) - pt.x * this.wingLength * Math.sin(aRad) * .3;
            trailing.push({ x: sx, y: ty });
        }
        // Wing gradient
        const wg = ctx.createLinearGradient(0, attach, side * this.wingLength * .7, attach - 40);
        wg.addColorStop(0, 'rgba(13,148,136,.75)'); wg.addColorStop(.35, 'rgba(34,211,238,.55)');
        wg.addColorStop(.7, 'rgba(96,165,250,.4)'); wg.addColorStop(1, 'rgba(139,92,246,.25)');
        ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(0, attach);
        for (const p of leading) ctx.lineTo(p.x, p.y);
        for (let i = trailing.length - 1; i >= 0; i--) ctx.lineTo(trailing[i].x, trailing[i].y);
        ctx.closePath(); ctx.fill();
        // Wing edge glow
        ctx.strokeStyle = 'rgba(34,211,238,.35)'; ctx.lineWidth = 1.5; ctx.shadowColor = 'rgba(34,211,238,.2)'; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.moveTo(0, attach);
        for (const p of leading) ctx.lineTo(p.x, p.y);
        ctx.stroke(); ctx.shadowBlur = 0;
        // Primary feathers
        if (this.showFeathers) {
            ctx.strokeStyle = 'rgba(148,163,184,.08)'; ctx.lineWidth = .5;
            for (let i = 3; i < leading.length; i += 2) {
                ctx.beginPath(); ctx.moveTo(leading[i].x * .1, attach + (leading[i].y - attach) * .1);
                ctx.lineTo(leading[i].x, leading[i].y); ctx.stroke();
            }
            // Secondary feather texture
            ctx.strokeStyle = 'rgba(34,211,238,.05)'; ctx.lineWidth = .3;
            for (let i = 2; i < leading.length - 2; i += 3) {
                const lp = leading[i], tp = trailing[i];
                for (let f = .2; f < .9; f += .2) {
                    const fx = lp.x + (tp.x - lp.x) * f, fy = lp.y + (tp.y - lp.y) * f;
                    ctx.beginPath(); ctx.arc(fx, fy, 3, 0, Math.PI * side); ctx.stroke();
                }
            }
        }
        // Control points
        if (this.showCtrlPts) {
            for (let i = 0; i < this.wingProfilePoints.t.length; i++) {
                const tp = this.wingProfilePoints.t[i], pt = this.wingSpline.evaluate(tp);
                const rx = pt.x * this.wingLength * side * foreshorten;
                const ry = attach + pt.y * this.wingLength * .4 * Math.cos(aRad) - pt.x * this.wingLength * Math.sin(aRad) * .4;
                ctx.fillStyle = 'rgba(251,191,36,.25)'; ctx.beginPath(); ctx.arc(rx, ry, 7, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(rx, ry, 3.5, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = 'rgba(251,191,36,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(rx, ry, 3.5, 0, Math.PI * 2); ctx.stroke();
            }
        }
        ctx.restore();
    }
    _drawWingOutline(ctx, cx, cy, aRad, side, col) {
        const attach = -10, fore = .7 + .3 * Math.cos(aRad);
        ctx.save(); ctx.translate(cx, cy); ctx.strokeStyle = col; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, attach);
        for (let i = 0; i <= 16; i++) {
            const tp = i / 16, pt = this.wingSpline.evaluate(tp);
            ctx.lineTo(pt.x * this.wingLength * side * fore, attach + pt.y * this.wingLength * .4 * Math.cos(aRad) - pt.x * this.wingLength * Math.sin(aRad) * .4);
        }
        ctx.stroke(); ctx.restore();
    }
    _drawTail(ctx, cx, cy, t) {
        const sway = 3.5 * Math.sin(2 * Math.PI * this.flapFrequency * t), tl = 45;
        ctx.save(); ctx.translate(cx, cy);
        const tg = ctx.createLinearGradient(0, 32, sway, 32 + tl);
        tg.addColorStop(0, 'rgba(13,148,136,.85)'); tg.addColorStop(1, 'rgba(6,95,70,.2)');
        ctx.fillStyle = tg; ctx.beginPath();
        ctx.moveTo(-7, 32); ctx.quadraticCurveTo(-5 + sway * .5, 52, -12 + sway, 32 + tl);
        ctx.lineTo(sway * .3, 32 + tl * .65); ctx.lineTo(12 + sway, 32 + tl);
        ctx.quadraticCurveTo(5 + sway * .5, 52, 7, 32); ctx.closePath(); ctx.fill();
        if (this.showFeathers) {
            ctx.strokeStyle = 'rgba(255,255,255,.03)'; ctx.lineWidth = .4;
            for (let i = -5; i <= 5; i += 2.5) {
                ctx.beginPath(); ctx.moveTo(i, 34); ctx.lineTo(i + sway * .8, 32 + tl * .85); ctx.stroke();
            }
        }
        ctx.restore();
    }
    _drawArc(ctx, cx, cy, aRad) {
        ctx.save(); ctx.translate(cx, cy - 10);
        const r = 50, sa = -Math.PI / 2, ea = -Math.PI / 2 - aRad * .4;
        ctx.strokeStyle = 'rgba(167,139,250,.4)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.arc(0, 0, r, Math.min(sa, ea), Math.max(sa, ea)); ctx.stroke();
        ctx.setLineDash([]);
        const la = (sa + ea) / 2, lx = Math.cos(la) * (r + 18), ly = Math.sin(la) * (r + 18);
        ctx.font = '600 11px "JetBrains Mono"'; ctx.fillStyle = 'rgba(167,139,250,.75)'; ctx.textAlign = 'center';
        ctx.fillText(`${(aRad * 180 / Math.PI).toFixed(1)}°`, lx, ly);
        ctx.restore();
    }
    _drawOverlay(ctx, W, H, angle) {
        ctx.font = '600 12px Inter'; ctx.fillStyle = 'rgba(148,163,184,.25)'; ctx.textAlign = 'left';
        ctx.fillText('PATAGONA GIGAS', 16, 20);
        ctx.font = '400 10px "JetBrains Mono"'; ctx.fillStyle = 'rgba(148,163,184,.18)';
        ctx.fillText(`f=${this.flapFrequency}Hz  A=±${this.flapAmplitude}°  L=${this.wingLength}px`, 16, 36);
        ctx.textAlign = 'right';
        const st = angle > 0 ? 'UPSTROKE ▲' : 'DOWNSTROKE ▼';
        ctx.fillStyle = angle > 0 ? 'rgba(52,211,153,.35)' : 'rgba(251,113,133,.35)';
        ctx.fillText(st, W - 16, 20);
    }
    _updateUI() {
        const el = id => document.getElementById(id);
        const a = this.getWingAngle(this.time), v = this.getWingVelocity(this.time), acc = this.getWingAccel(this.time);
        el('sim-time').textContent = this.time.toFixed(3);
        el('sim-angle').textContent = a.toFixed(1);
        el('sim-cycle').textContent = this.cycle;
        el('sim-fps').textContent = this.currentFps;
        // Telemetry panel
        const ta = el('telem-angle'), tv = el('telem-vel'), tac = el('telem-acc'), tp = el('telem-phase'), tpe = el('telem-period'), te = el('telem-energy');
        if (ta) ta.textContent = a.toFixed(2) + '°';
        if (tv) tv.textContent = v.toFixed(0) + ' °/s';
        if (tac) tac.textContent = acc.toFixed(0) + ' °/s²';
        if (tp) { tp.textContent = a > 0 ? '▲ Upstroke' : '▼ Downstroke'; tp.style.color = a > 0 ? '#34d399' : '#fb7185'; }
        if (tpe) tpe.textContent = (1000 / this.flapFrequency).toFixed(1) + ' ms';
        if (te) te.textContent = (0.5 * v * v * 1e-4).toFixed(3) + ' J';
    }
}
