'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import ArrowRight from 'lucide-react/icons/arrow-right';
import CalendarDays from 'lucide-react/icons/calendar-days';
import ShieldCheck from 'lucide-react/icons/shield-check';
import Users from 'lucide-react/icons/users';
import Sparkles from 'lucide-react/icons/sparkles';
import { useUser } from '@/context/user-provider';
import { useTranslation } from '@/hooks/use-translation';
import Link from 'next/link'; // Import Link for navigation

// Enhanced Aurora Background Component
function AuroraBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden z-0">
      <div
        className="absolute top-0 left-0 w-[200%] h-[200%] opacity-20" // Reduced opacity
        style={{
          backgroundImage: `
            radial-gradient(at 20% 30%, #581c87 0px, transparent 50%),
            radial-gradient(at 80% 70%, #1e40af 0px, transparent 50%),
            radial-gradient(at 50% 50%, #4c1d95 0px, transparent 50%)
          `,
          animation: 'aurora 20s infinite linear',
        }}
      />
      <style jsx>{`
        @keyframes aurora {
          from {
            transform: translate(-50%, -50%) rotate(0deg);
          }
          to {
            transform: translate(-50%, -50%) rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

export function HeroSection() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation('marketing');
  const { user } = useUser();
  const getStartedHref = user ? '/dashboard' : '/login';
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Mouse tracking for 3D parallax
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      setMousePosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const features = [
    {
      icon: Users,
      title: t('hero.feature1.title'),
      description: t('hero.feature1.description'),
      gradient: 'from-violet-600 to-purple-700', // Subtler gradient
    },
    {
      icon: CalendarDays,
      title: t('hero.feature2.title'),
      description: t('hero.feature2.description'),
      gradient: 'from-blue-600 to-cyan-700', // Subtler gradient
    },
    {
      icon: ShieldCheck,
      title: t('hero.feature3.title'),
      description: t('hero.feature3.description'),
      gradient: 'from-emerald-600 to-teal-700', // Subtler gradient
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: 'easeOut',
      },
    },
  };

  if (!mounted) {
    return (
      <section className="relative w-full min-h-screen overflow-hidden bg-white dark:bg-slate-950">
        <div className="h-screen w-full" />
      </section>
    );
  }

  return (
    <motion.section
      ref={heroRef}
      className="relative w-full min-h-screen overflow-hidden bg-white dark:bg-slate-950"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <AuroraBackground />

      {/* Grid Pattern Overlay */}
      <motion.div
        className="absolute inset-0 opacity-10" // Reduced opacity
        style={{
          backgroundImage: `
            linear-gradient(rgba(139, 92, 246, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          perspective: '500px',
          rotateX: `${mousePosition.y * 5}deg`,
          rotateY: `${mousePosition.x * 5}deg`,
        }}
      />

      <div className="container relative z-10 mx-auto px-4 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-32 lg:px-8 lg:pb-24 lg:pt-40">
        {/* Hero Content */}
        <motion.div
          className="max-w-4xl"
          style={{
            perspective: '1000px',
            rotateX: `${mousePosition.y * 2}deg`,
            rotateY: `${mousePosition.x * 2}deg`,
          }}
        >
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 px-3 py-1 mb-6 border border-white/10 bg-white/5 rounded-full"
          >
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {t('hero.tagline')}
            </span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-5xl font-black tracking-tight text-gray-900 dark:text-white sm:text-6xl md:text-7xl lg:text-8xl mb-6"
          >
            {t('hero.title_part1')}
            <br />
            <span className="inline-block relative">
              {t('hero.title_part2')}
              <motion.div
                className="absolute -bottom-2 left-0 w-full h-1 bg-violet-500 rounded-full" // Simpler underline
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1, delay: 0.5, ease: 'circOut' }}
              />
            </span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed mb-8 sm:text-xl"
          >
            {t('hero.description')}
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Link href={getStartedHref} passHref>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="group relative px-8 py-4 bg-violet-600 hover:bg-violet-700 transition-colors text-white rounded-xl font-semibold shadow-lg"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {t('button.get_started')}
                  <motion.span transition={{ type: 'spring', stiffness: 300 }}>
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </motion.span>
                </span>
              </motion.button>
            </Link>

            <Link href="/demo" passHref>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="group px-8 py-4 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 transition-colors text-gray-900 dark:text-white rounded-xl"
              >
                <span className="flex items-center justify-center gap-2">
                  {t('hero.watch_demo')}
                  <span className="w-2 h-2 bg-red-500 rounded-full" />
                </span>
              </motion.button>
            </Link>
          </motion.div>
        </motion.div>

        {/* 3D Feature Cards */}
        <motion.div
          className="mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="group relative"
              variants={itemVariants}
              style={{
                perspective: '1000px',
                rotateX: `${mousePosition.y * 3}deg`,
                rotateY: `${mousePosition.x * 3}deg`,
              }}
            >
              <div
                className={`absolute -inset-px bg-gradient-to-r ${feature.gradient} rounded-2xl opacity-20 group-hover:opacity-60 transition duration-500`}
              />
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="relative h-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-2xl p-6"
              >
                <motion.div
                  className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.gradient} shadow-lg mb-4`}
                >
                  <feature.icon className="w-6 h-6 text-white" />
                </motion.div>

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>

                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  {feature.description}
                </p>

                <motion.div
                  className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ArrowRight className="w-5 h-5 text-purple-400 transition-transform group-hover:translate-x-1" />
                </motion.div>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>

        {/* Floating Stats */}
        <motion.div
          className="mt-20 flex flex-wrap justify-center gap-12 opacity-80"
          variants={containerVariants}
        >
          {[{
            value: '50K+',
            label: t('hero.stat1.label'),
          },
          {
            value: '1M+',
            label: t('hero.stat2.label'),
          },
          {
            value: '99.9%',
            label: t('hero.stat3.label'),
          }].map((stat, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              className="text-center"
            >
              <div className="text-4xl font-black text-gray-900 dark:text-white">
                {stat.value}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Bottom Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white dark:from-slate-950 to-transparent" />
    </motion.section>
  );
}
