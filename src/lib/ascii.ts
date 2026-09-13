// A deterministic parametric signal: an original toroidal form rendered as text.
// This is generated markup, not a downloaded bitmap or another artist's portrait.
export function signalArt(width = 100, height = 48): string {
  const chars = ' .,:;+=xX$@';
  const pixels = Array<string>(width * height).fill(' ');
  const depth = Array<number>(width * height).fill(-Infinity);
  const a = 0.72, b = -0.42;
  for (let v = 0; v < Math.PI * 2; v += 0.025) {
    for (let u = 0; u < Math.PI * 2; u += 0.014) {
      const ripple = 0.065 * Math.sin(u * 9 + v * 3);
      const radius = 1.62 + (0.64 + ripple) * Math.cos(v);
      const x = radius * Math.cos(u);
      const y = radius * Math.sin(u);
      const z = 0.72 * Math.sin(v);
      const yr = y * Math.cos(a) - z * Math.sin(a);
      const zr = y * Math.sin(a) + z * Math.cos(a);
      const xr = x * Math.cos(b) - yr * Math.sin(b);
      const yy = x * Math.sin(b) + yr * Math.cos(b);
      const perspective = 5.5 / (6 - zr);
      const px = Math.round(width / 2 + xr * perspective * width / 5.5);
      const py = Math.round(height / 2 + yy * perspective * height / 4.4);
      const i = py * width + px;
      if (px < 0 || py < 0 || px >= width || py >= height || zr <= depth[i]) continue;
      depth[i] = zr;
      const light = Math.max(0.05, Math.min(1, 0.45 + 0.38 * Math.cos(u + 1.3) * Math.cos(v) + 0.28 * Math.sin(v)));
      pixels[i] = chars[Math.min(chars.length - 1, Math.floor(light * chars.length))];
    }
  }
  return Array.from({ length: height }, (_, row) => pixels.slice(row * width, (row + 1) * width).join('')).join('\n');
}
