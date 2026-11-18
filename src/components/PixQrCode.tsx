interface PixQrCodeProps {
  payload: string;
}

export function PixQrCode({ payload }: PixQrCodeProps) {
  const size = 21;
  // Deterministic 21x21 QR matrix based on payload hash + standard finder patterns
  let seed = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    seed ^= payload.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }

  const isFinder = (r: number, c: number) => {
    const inTopLeft = r < 7 && c < 7;
    const inTopRight = r < 7 && c >= size - 7;
    const inBottomLeft = r >= size - 7 && c < 7;
    return inTopLeft || inTopRight || inBottomLeft;
  };

  const finderCell = (r: number, c: number) => {
    const lr = r >= size - 7 ? r - (size - 7) : r;
    const lc = c >= size - 7 ? c - (size - 7) : c;
    if (lr === 0 || lr === 6 || lc === 0 || lc === 6) return true;
    if (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4) return true;
    return false;
  };

  const cells: { r: number; c: number }[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      let filled = false;
      if (isFinder(r, c)) {
        filled = finderCell(r, c);
      } else if (r === 6 || c === 6) {
        filled = (r + c) % 2 === 0;
      } else {
        const idx = r * size + c;
        const hash = Math.imul(seed ^ idx, 2654435761) >>> 0;
        filled = (hash & 1) === 1;
      }
      if (filled) cells.push({ r, c });
    }
  }

  return (
    <svg
      viewBox={`0 0 ${size + 2} ${size + 2}`}
      className="w-40 h-40 bg-white p-2 border border-zinc-200 rounded-lg"
      role="img"
      aria-label="QR Code Pix para pagamento"
    >
      <rect x="0" y="0" width={size + 2} height={size + 2} fill="#ffffff" />
      {cells.map((cell) => (
        <rect
          key={`${cell.r}-${cell.c}`}
          x={cell.c + 1}
          y={cell.r + 1}
          width="1"
          height="1"
          fill="#18181b"
        />
      ))}
    </svg>
  );
}
