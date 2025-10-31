'use client';

import dynamic from 'next/dynamic';
import { useRef } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

// Dynamically import the entire component to disable SSR
const AnimatedStatCard = dynamic(() => Promise.resolve(AnimatedStatCardImpl), { ssr: false });

interface AnimatedStatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description: string;
}

function AnimatedStatCardImpl({ title, value, icon: Icon, description }: AnimatedStatCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Motion values for tracking mouse position
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const { left, top, width, height } = cardRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - left - width / 2);
    mouseY.set(e.clientY - top - height / 2);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  // Create transform values that react to mouse position
  const rotateX = useSpring(useTransform(mouseY, [-100, 100], [10, -10]), { stiffness: 400, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-100, 100], [-10, 10]), { stiffness: 400, damping: 20 });

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transformStyle: 'preserve-3d',
        transform: 'perspective(1000px)',
        rotateX,
        rotateY,
      }}
      className="relative h-full w-full"
    >
      <Card className="h-full bg-white/30 dark:bg-gray-900/30 backdrop-blur-lg border border-white/20 dark:border-gray-800/50 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-gray-900 dark:text-white">{value}</div>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default AnimatedStatCard;