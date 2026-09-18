import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';

const LEAF_TYPES = ['🍂','🍁','🌿','🍃'];

export const AutumnAtmosphere: React.FC = () => {
  const { page } = useApp();
  if (page === 'admin') return null;
  const leaves = useMemo(() => Array.from({ length: 22 }, (_, i) => ({
    id: i,
    left: `${(i * 47) % 101}%`,
    delay: `${-((i * 1.73) % 14)}s`,
    duration: `${9 + (i % 7)}s`,
    size: `${16 + (i % 5) * 3}px`,
    drift: `${-90 + (i % 9) * 24}px`,
    rotate: `${180 + (i % 6) * 45}deg`,
    type: LEAF_TYPES[i % LEAF_TYPES.length],
  })), []);

  return (
    <>
      <div className="autumn-sun-glow" aria-hidden="true" />
      <div className="autumn-leaf-field" aria-hidden="true">
        {leaves.map((leaf) => (
          <span
            key={leaf.id}
            className="autumn-leaf"
            style={{
              left: leaf.left,
              animationDelay: leaf.delay,
              animationDuration: leaf.duration,
              fontSize: leaf.size,
              ['--leaf-drift' as string]: leaf.drift,
              ['--leaf-rotate' as string]: leaf.rotate,
            }}
          >
            {leaf.type}
          </span>
        ))}
      </div>
      <div className="autumn-season-pill" aria-hidden="true">
        <span>🍁</span>
        <span>Podzim v Luvia Decor</span>
      </div>
    </>
  );
};