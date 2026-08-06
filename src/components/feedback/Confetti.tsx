import { useEffect, useState } from 'react';

/** Reserved for genuine achievements: a perfect run or a mastered deck. */
export default function Confetti({ active }: { active: boolean }) {
  const [pieces, setPieces] = useState<number[]>([]);

  useEffect(() => {
    if (!active) return;
    setPieces(Array.from({ length: 40 }, (_unused, i) => i));
    const timer = window.setTimeout(() => setPieces([]), 1800);
    return () => window.clearTimeout(timer);
  }, [active]);

  if (pieces.length === 0) return null;

  const colours = ['#4d8dff', '#f2a03d', '#38cd85', '#f7f5ef'];

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((i) => (
        <i
          key={i}
          style={{
            left: (i * 2.5) % 100 + '%',
            background: colours[i % colours.length],
            animationDelay: (i % 10) * 60 + 'ms',
          }}
        />
      ))}
    </div>
  );
}
