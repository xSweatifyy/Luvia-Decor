import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';

export const AutumnAtmosphere: React.FC = () => {
  const { page } = useApp();
  const snowflakes = useMemo(() => Array.from({ length: 38 }, (_, i) => ({
    id: i,
    left: `${(i * 37 + 7) % 100}%`,
    delay: `-${(i * 1.37) % 18}s`,
    duration: `${12 + (i % 9) * 1.7}s`,
    size: `${9 + (i % 5) * 3}px`,
    drift: `${-65 + (i % 11) * 13}px`,
    opacity: .42 + (i % 5) * .11,
  })), []);
  if (page === 'admin') return null;

  return (
    <div className="winter-atmosphere" aria-hidden="true">
      <div className="winter-snow-field">
        {snowflakes.map((flake) => (
          <span key={flake.id} className="winter-snowflake" style={{
            left: flake.left, animationDelay: flake.delay, animationDuration: flake.duration,
            fontSize: flake.size, opacity: flake.opacity,
            ['--snow-drift' as string]: flake.drift,
          }}>❄</span>
        ))}
      </div>
      <div className="winter-edge winter-edge-left">
        <span className="winter-hanging-ball ball-red">✦</span>
        <span className="winter-hanging-ball ball-gold">❄</span>
        <span className="winter-hanging-ball ball-blue">✦</span>
        <span className="winter-hanging-ball ball-red">❄</span>
      </div>
      <div className="winter-edge winter-edge-right">
        <span className="winter-hanging-ball ball-gold">❄</span>
        <span className="winter-hanging-ball ball-red">✦</span>
        <span className="winter-hanging-ball ball-blue">❄</span>
        <span className="winter-hanging-ball ball-gold">✦</span>
      </div>
      <div className="winter-tree" role="img" aria-label="Vánoční stromek s českými tradičními ozdobami">
        <div className="winter-tree-star">★</div>
        <div className="winter-tree-top"></div>
        <div className="winter-tree-middle"></div>
        <div className="winter-tree-bottom"></div>
        <span className="tree-bauble bauble-a"></span><span className="tree-bauble bauble-b"></span>
        <span className="tree-bauble bauble-c"></span><span className="tree-bauble bauble-d"></span>
        <span className="tree-bauble bauble-e"></span><span className="tree-bauble bauble-f"></span>
        <span className="tree-bauble bauble-g"></span><span className="tree-bauble bauble-h"></span>
        <span className="tree-garland garland-one"></span><span className="tree-garland garland-two"></span>
        <span className="winter-tree-trunk"></span>
        <span className="winter-tree-gifts">🎁 🎁</span>
      </div>
    </div>
  );
};
