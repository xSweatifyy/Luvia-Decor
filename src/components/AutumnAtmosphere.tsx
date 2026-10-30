import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';

/** Halloween overlay built entirely from CSS, gradients and emoji — no image assets. */
export const AutumnAtmosphere: React.FC = () => {
  const { page } = useApp();
  const spiders = useMemo(() => Array.from({ length: 5 }, (_, i) => ({
    id: i,
    top: `${12 + i * 17}%`,
    delay: `${-i * 3.7}s`,
    duration: `${18 + i * 4}s`,
    size: `${17 + (i % 3) * 5}px`,
    direction: i % 2 === 0 ? 'normal' : 'reverse',
  })), []);

  if (page === 'admin') return null;

  return (
    <div className="halloween-atmosphere" aria-hidden="true">
      <div className="halloween-web halloween-web-left" />
      <div className="halloween-web halloween-web-right" />
      <div className="halloween-web halloween-web-bottom-left" />
      <div className="halloween-mist halloween-mist-one" />
      <div className="halloween-mist halloween-mist-two" />
      <div className="halloween-bat-field">{Array.from({ length: 6 }, (_, i) => <span key={i} className="halloween-bat" style={{ top: `${8 + (i % 3) * 11}%`, animationDelay: `${-i * 4.3}s`, animationDuration: `${19 + i * 2.8}s`, fontSize: `${18 + (i % 3) * 7}px` }}>🦇</span>)}</div>
      <div className="halloween-spider-field">
        {spiders.map((spider) => (
          <span
            key={spider.id}
            className="halloween-spider"
            style={{
              top: spider.top,
              animationDelay: spider.delay,
              animationDuration: spider.duration,
              fontSize: spider.size,
              animationDirection: spider.direction,
            }}
          >
            <span className="halloween-spider-thread" />
            <span className="halloween-spider-emoji">🕷️</span>
          </span>
        ))}
      </div>
      <div className="halloween-candle halloween-candle-left">
        <span className="halloween-candle-flame"><i /></span>
        <span className="halloween-candle-wick" />
        <span className="halloween-candle-body" />
        <span className="halloween-candle-drip" />
        <span className="halloween-candle-glow" />
      </div>
      <div className="halloween-candle halloween-candle-right">
        <span className="halloween-candle-flame"><i /></span>
        <span className="halloween-candle-wick" />
        <span className="halloween-candle-body" />
        <span className="halloween-candle-drip" />
        <span className="halloween-candle-glow" />
      </div>
    </div>
  );
};
