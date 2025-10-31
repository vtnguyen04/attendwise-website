'use client';

import { memo, useEffect, useRef } from 'react';

export const FloatingOrb = memo(function FloatingOrb({
  delay = 0,
  size = 'w-96 h-96',
  color = 'purple',
  position,
  mouseX,
  mouseY
}: {
  delay?: number;
  size?: string;
  color?: string;
  position: { top: string; right?: string; left?: string; bottom?: string };
  mouseX: number;
  mouseY: number;
}) {
  const colorMap = {
    purple: 'bg-purple-500/10',
    blue: 'bg-blue-500/10',
    pink: 'bg-pink-500/10',
  };

  const orbRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>(0);
  const delayRef = useRef(delay);

  useEffect(() => {
    delayRef.current = delay;
  }, [delay]);

  useEffect(() => {
    let lastTime = 0;
    const updateScale = (currentTime: number) => {
      if (orbRef.current && currentTime - lastTime > 16) {
        const newScale = 1 + Math.sin(Date.now() / 2000 + delayRef.current) * 0.1;
        const newTransform = `translate(
          ${mouseX * (color === 'purple' ? 50 : -30)}px, 
          ${mouseY * (color === 'purple' ? 50 : -30)}px
        ) scale(${newScale})`;
        orbRef.current.style.transform = newTransform;
        lastTime = currentTime;
      }
      animationFrameRef.current = requestAnimationFrame(updateScale);
    };

    animationFrameRef.current = requestAnimationFrame(updateScale);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [mouseX, mouseY, color]);

  return (
    <div 
      ref={orbRef}
      className={`absolute ${size} ${colorMap[color as keyof typeof colorMap]} rounded-full blur-3xl transition-all duration-700 ease-out will-change-transform`}
      style={{
        top: position.top,
        right: position.right,
        left: position.left,
        bottom: position.bottom,
        filter: 'blur(64px)',
      }}
    />
  );
});
