
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import ArrowRight from 'lucide-react/icons/arrow-right';
import CalendarDays from 'lucide-react/icons/calendar-days';
import ShieldCheck from 'lucide-react/icons/shield-check';
import Users from 'lucide-react/icons/users';
import Sparkles from 'lucide-react/icons/sparkles';

// Enhanced Aurora Background Component
function AuroraBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden z-0">
      <div
        className="absolute top-0 left-0 w-[200%] h-[200%] opacity-30"
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
      title: 'Event Creation',
      description: 'Easily create events with custom details',
      gradient: 'from-violet-500 to-purple-600',
    },
    {
      icon: CalendarDays,
      title: 'QR Code Check-in',
      description: 'Generate and scan QR codes for fast entry',
      gradient: 'from-blue-500 to-cyan-600',
    },
    {
      icon: ShieldCheck,
      title: 'Face ID Verification',
      description: 'Secure check-in with facial recognition',
      gradient: 'from-emerald-500 to-teal-600',
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

  return (
    <motion.section
      ref={heroRef}
      className="relative w-full min-h-screen overflow-hidden bg-slate-950 animate-liquid-morph-slow"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <AuroraBackground />

      {/* Grid Pattern Overlay */}
      <motion.div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(139, 92, 246, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.1) 1px, transparent 1px)
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
          <motion.div variants={itemVariants} className="liquid-glass-badge mb-6">
            <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
            <span className="text-sm font-medium text-white">Next-Gen Event Management</span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-white sm:text-6xl md:text-7xl lg:text-8xl mb-6"
          >
            Smarter Events,
            <br />
            <span className="inline-block relative">
              Seamless Check-ins
              <motion.div
                className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 rounded-full"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1, delay: 0.5, ease: 'circOut' }}
              />
            </span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-lg text-gray-300 max-w-2xl leading-relaxed mb-8 sm:text-xl"
          >
            Create, manage, and monitor your events with{' '}
            <span className="font-semibold text-purple-400">QR Code</span> and{' '}
            <span className="font-semibold text-blue-400">Face ID</span> check-in,
            real-time dashboards, and automated notifications.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0px 10px 30px rgba(138, 43, 226, 0.7)' }}
              whileTap={{ scale: 0.95 }}
              className="group relative px-8 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg shadow-purple-500/50 overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                Get Started
                <motion.span variants={{ hover: { x: 5 } }} transition={{ type: 'spring', stiffness: 300 }}>
                  <ArrowRight className="w-5 h-5" />
                </motion.span>
              </span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="group liquid-glass-button px-8 py-4 text-white"
            >
              <span className="flex items-center justify-center gap-2">
                Watch Demo
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              </span>
            </motion.button>
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
              <div className={`absolute -inset-0.5 bg-gradient-to-r ${feature.gradient} rounded-2xl blur opacity-30 group-hover:opacity-100 transition duration-500 animate-pulse`} />
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="relative h-full liquid-glass-card p-6"
              >
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 6 }}
                  className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.gradient} shadow-lg mb-4`}
                >
                  <feature.icon className="w-6 h-6 text-white" />
                </motion.div>

                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-purple-200 transition-all duration-300">
                  {feature.title}
                </h3>
                
                <p className="text-gray-400 text-sm leading-relaxed">
                  {feature.description}
                </p>

                <motion.div
                  className="mt-4"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: { opacity: 0 },
                  }}
                  whileHover={{ opacity: 1, x: 5 }}
                >
                  <ArrowRight className="w-5 h-5 text-purple-400" />
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
          {[
            { value: '50K+', label: 'Active Users' },
            { value: '1M+', label: 'Events Created' },
            { value: '99.9%', label: 'Uptime' },
          ].map((stat, i) => (
            <motion.div key={i} variants={itemVariants} className="text-center">
              <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                {stat.value}
              </div>
              <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Bottom Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-950 to-transparent" />
    </motion.section>
  );
}