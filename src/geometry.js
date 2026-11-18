// Curves in screen space (px, y down). A curve is a straight segment or a circular arc; a self-loop is a
// full circle. All are parametrised by t in [0, 1] proportional to arc length, which keeps waves and
// zigzags even. "Left" always means the viewer's left of the direction of travel, so a positive bend on a
// left-to-right line bulges upwards, as in the EPP primer.

export const TAU = 2 * Math.PI;

export const line = (a, b) => ({ type: 'line', a, b });
export const circ = (cx, cy, R, th0, span) => ({ type: 'circ', cx, cy, R, th0, span });

/** Arc from a to b whose sagitta is bend x chord (|bend| = 0.5 is a half circle). bend = 0 gives a line. */
export function arc(a, b, bend) {
  const dx = b[0] - a[0], dy = b[1] - a[1], c = Math.hypot(dx, dy);
  if (!bend || c < 1e-9) return line(a, b);
  const s = bend * c;
  const R = (c * c / 4 + s * s) / (2 * Math.abs(s));
  const nx = dy / c, ny = -dx / c; // screen-left unit normal
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const k = s - Math.sign(s) * R;
  const cx = mx + nx * k, cy = my + ny * k;
  const th0 = Math.atan2(a[1] - cy, a[0] - cx);
  const th1 = Math.atan2(b[1] - cy, b[0] - cx);
  const thp = Math.atan2(my + ny * s - cy, mx + nx * s - cx);
  const norm = (x) => ((x % TAU) + TAU) % TAU;
  let span = norm(th1 - th0);
  if (norm(thp - th0) > span) span -= TAU;
  return circ(cx, cy, R, th0, span);
}

/** Self-loop at p: a circle of diameter d whose centre lies in screen direction `dir` (radians) from p. */
export function loop(p, dir, d, cw = false) {
  const R = d / 2;
  const cx = p[0] + R * Math.cos(dir), cy = p[1] + R * Math.sin(dir);
  // increasing screen angle turns clockwise on screen (y points down)
  return circ(cx, cy, R, dir + Math.PI, cw ? TAU : -TAU);
}

export function at(c, t) {
  if (c.type === 'line') return [c.a[0] + (c.b[0] - c.a[0]) * t, c.a[1] + (c.b[1] - c.a[1]) * t];
  const th = c.th0 + c.span * t;
  return [c.cx + c.R * Math.cos(th), c.cy + c.R * Math.sin(th)];
}

export function tan(c, t) {
  if (c.type === 'line') {
    const dx = c.b[0] - c.a[0], dy = c.b[1] - c.a[1], L = Math.hypot(dx, dy) || 1;
    return [dx / L, dy / L];
  }
  const th = c.th0 + c.span * t, sg = Math.sign(c.span) || 1;
  return [-Math.sin(th) * sg, Math.cos(th) * sg];
}

export const length = (c) => (c.type === 'line' ? Math.hypot(c.b[0] - c.a[0], c.b[1] - c.a[1]) : Math.abs(c.span) * c.R);

export function sub(c, t0, t1) {
  if (c.type === 'line') return line(at(c, t0), at(c, t1));
  return circ(c.cx, c.cy, c.R, c.th0 + c.span * t0, c.span * (t1 - t0));
}

/** n + 1 samples { x, y, tx, ty } including both ends. */
export function sample(c, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, p = at(c, t), d = tan(c, t);
    pts.push({ x: p[0], y: p[1], tx: d[0], ty: d[1] });
  }
  return pts;
}

/** Point offset by o along the screen-left normal of a sample. */
export const offset = (p, o) => [p.x + p.ty * o, p.y - p.tx * o];

// ---------- shapes that lines stop at ----------
/** The two circles whose overlap is a lens: [[cx, cy], ...] and their radius. */
export function lensCircles(shape) {
  // a = half the thickness, c = half the length (tip to tip)
  const a = (shape.horiz ? shape.h : shape.w) / 2, c = (shape.horiz ? shape.w : shape.h) / 2;
  const R = (a * a + c * c) / (2 * a), k = R - a;
  const centres = shape.horiz ? [[shape.x, shape.y + k], [shape.x, shape.y - k]] : [[shape.x + k, shape.y], [shape.x - k, shape.y]];
  return { centres, R, a, c };
}

/** How far a lens reaches from its centre towards the unit direction (dx, dy): its support function. */
export function lensReach(shape, dx, dy) {
  const { R, a, c } = lensCircles(shape), k = R - a;
  const across = Math.abs(shape.horiz ? dy : dx), along = Math.abs(shape.horiz ? dx : dy);
  let best = 0;
  // at s along the axis the lens is sqrt(R² − s²) − k thick on either side
  for (let i = 0; i <= 96; i++) { const s = (c * i) / 96; best = Math.max(best, across * (Math.sqrt(Math.max(0, R * R - s * s)) - k) + along * s); }
  return best;
}

export function inside(shape, p) {
  if (!shape) return false;
  const dx = p[0] - shape.x, dy = p[1] - shape.y;
  if (shape.kind === 'rect') return Math.abs(dx) < shape.w / 2 - 1e-6 && Math.abs(dy) < shape.h / 2 - 1e-6;
  if (shape.kind === 'lens') {
    const { centres, R } = lensCircles(shape);
    return centres.every(([cx, cy]) => (p[0] - cx) ** 2 + (p[1] - cy) ** 2 < R * R - 1e-6);
  }
  return dx * dx + dy * dy < shape.r * shape.r - 1e-6;
}

/** Trim the parts of a curve that run inside the shapes at its two ends. */
export function trim(c, startShape, endShape) {
  let t0 = 0, t1 = 1;
  const bisect = (lo, hi, isInsideAtLo) => {
    for (let k = 0; k < 40; k++) {
      const mid = (lo + hi) / 2;
      if (isInsideAtLo(mid)) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  };
  // a self-loop (a full circle on one shape) is searched half by half, one end in each half; any other curve over
  // its whole length, so that a line whose middle lies inside a large shape still keeps the part outside it
  const hs = c.type === 'circ' && Math.abs(c.span) > TAU - 1e-6 ? 0.5 : 1;
  if (startShape && inside(startShape, at(c, 0))) {
    if (inside(startShape, at(c, hs))) return null;
    t0 = bisect(0, hs, (t) => inside(startShape, at(c, t)));
  }
  if (endShape && inside(endShape, at(c, 1))) {
    if (inside(endShape, at(c, 1 - hs))) return null;
    t1 = 1 - bisect(0, hs, (t) => inside(endShape, at(c, 1 - t)));
  }
  if (t1 - t0 < 1e-3) return null;
  // remember which part of the original survived, so that its midpoint can still be found
  const out = t0 === 0 && t1 === 1 ? { ...c } : sub(c, t0, t1);
  out.t0 = t0; out.t1 = t1;
  return out;
}

/** Boundary point of a shape in screen direction (ux, uy) from its centre. */
export function boundary(shape, ux, uy) {
  if (shape.kind === 'lens') {
    // along the ray from the centre: the last point still inside
    let lo = 0, hi = Math.max(shape.w, shape.h);
    for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (inside(shape, [shape.x + ux * m, shape.y + uy * m])) lo = m; else hi = m; }
    return [shape.x + ux * lo, shape.y + uy * lo];
  }
  if (shape.kind === 'rect') {
    const sx = ux ? (shape.w / 2) / Math.abs(ux) : Infinity, sy = uy ? (shape.h / 2) / Math.abs(uy) : Infinity;
    const k = Math.min(sx, sy);
    return [shape.x + ux * k, shape.y + uy * k];
  }
  return [shape.x + ux * shape.r, shape.y + uy * shape.r];
}
