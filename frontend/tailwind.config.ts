import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

const config = {
  darkMode: ['class'],
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1.5rem',
        lg: '2rem',
        xl: '3rem',
        '2xl': '4rem',
      },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        'xs': ['clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem)', { lineHeight: '1.5' }],
        'sm': ['clamp(0.875rem, 0.825rem + 0.25vw, 1rem)', { lineHeight: '1.5' }],
        'base': ['clamp(1rem, 0.95rem + 0.25vw, 1.125rem)', { lineHeight: '1.6' }],
        'lg': ['clamp(1.125rem, 1.05rem + 0.375vw, 1.25rem)', { lineHeight: '1.6' }],
        'xl': ['clamp(1.25rem, 1.15rem + 0.5vw, 1.5rem)', { lineHeight: '1.4' }],
        '2xl': ['clamp(1.5rem, 1.35rem + 0.75vw, 1.875rem)', { lineHeight: '1.3' }],
        '3xl': ['clamp(1.875rem, 1.65rem + 1.125vw, 2.25rem)', { lineHeight: '1.2' }],
        '4xl': ['clamp(2.25rem, 1.95rem + 1.5vw, 3rem)', { lineHeight: '1.1' }],
        '5xl': ['clamp(3rem, 2.55rem + 2.25vw, 3.75rem)', { lineHeight: '1' }],
      },
      spacing: {
        'fluid-xs': 'clamp(0.5rem, 0.45rem + 0.25vw, 0.75rem)',
        'fluid-sm': 'clamp(1rem, 0.9rem + 0.5vw, 1.5rem)',
        'fluid-md': 'clamp(1.5rem, 1.35rem + 0.75vw, 2.25rem)',
        'fluid-lg': 'clamp(2rem, 1.8rem + 1vw, 3rem)',
        'fluid-xl': 'clamp(3rem, 2.7rem + 1.5vw, 4.5rem)',
        'fluid-2xl': 'clamp(4rem, 3.6rem + 2vw, 6rem)',
      },
      maxWidth: {
        'container-sm': '640px',
        'container-md': '768px',
        'container-lg': '1024px',
        'container-xl': '1280px',
        'container-2xl': '1400px',
        'prose': '65ch',
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '40px',
        '3xl': '64px',
      },
      backdropSaturate: {
        120: '1.2',
        150: '1.5',
        180: '1.8',
        200: '2',
      },
      backgroundSize: {
        'blob': '140% 140%',
      },
      transitionTimingFunction: {
        'emphasized': 'var(--easing-emphasized)',
        'emphasized-out': 'var(--easing-emphasized-out)',
      },
      transformOrigin: {
        'center': 'center',
        'top': 'top',
        'bottom': 'bottom',
        'left': 'left',
        'right': 'right',
        'top-left': 'top left',
        'top-right': 'top right',
        'bottom-left': 'bottom left',
        'bottom-right': 'bottom right',
      },
      perspective: {
        '500': '500px',
        '800': '800px',
        '1000': '1000px',
        '1200': '1200px',
        '1500': '1500px',
        '2000': '2000px',
      },
      scale: {
        '102': '1.02',
        '103': '1.03',
        '115': '1.15',
        '120': '1.2',
        '125': '1.25',
        '130': '1.3',
        '140': '1.4',
        '150': '1.5',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
      boxShadow: {
        // 🌊 LIQUID GLASS SHADOWS
        'liquid-sm': '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'liquid': '0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
        'liquid-lg': '0 16px 48px rgba(0, 0, 0, 0.16), 0 8px 24px rgba(0, 0, 0, 0.12), inset 0 2px 0 rgba(255, 255, 255, 0.2)',
        'liquid-xl': '0 24px 64px rgba(0, 0, 0, 0.2), 0 12px 32px rgba(0, 0, 0, 0.16), inset 0 2px 0 rgba(255, 255, 255, 0.25)',
        
        // 🔍 MAGNIFYING GLASS SHADOWS
        'magnify': '0 0 0 4px rgba(139, 92, 246, 0.1), 0 8px 24px rgba(139, 92, 246, 0.3)',
        'magnify-lg': '0 0 0 6px rgba(139, 92, 246, 0.15), 0 12px 36px rgba(139, 92, 246, 0.4)',
        'magnify-glow': '0 0 20px rgba(139, 92, 246, 0.5), 0 0 40px rgba(139, 92, 246, 0.3), 0 0 60px rgba(139, 92, 246, 0.2)',
        
        // ✨ GLASS SHADOWS
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'glass-lg': '0 16px 48px rgba(0, 0, 0, 0.4), inset 0 2px 0 rgba(255, 255, 255, 0.15)',
        'glass-hover': '0 20px 60px rgba(0, 0, 0, 0.35), inset 0 2px 0 rgba(255, 255, 255, 0.2)',
        
        // 🎨 GLOW SHADOWS
        'glow-sm': '0 0 20px rgba(139, 92, 246, 0.3)',
        'glow': '0 0 30px rgba(139, 92, 246, 0.4)',
        'glow-lg': '0 0 50px rgba(139, 92, 246, 0.5)',
        'glow-xl': '0 0 80px rgba(139, 92, 246, 0.6)',
        
        // 3D SHADOWS
        '3d-sm': '0 4px 8px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(0, 0, 0, 0.05)',
        '3d': '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        '3d-lg': '0 20px 40px -10px rgba(0, 0, 0, 0.2), 0 15px 20px -10px rgba(0, 0, 0, 0.1)',
        '3d-xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 20px 30px -15px rgba(0, 0, 0, 0.15)',
        '3d-inner': 'inset 0 2px 4px rgba(0, 0, 0, 0.05), inset 0 4px 8px rgba(0, 0, 0, 0.05)',
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
        'glass-gradient-dark': 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
        'liquid-gradient': 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(99, 102, 241, 0.1) 50%, rgba(139, 92, 246, 0.1) 100%)',
        'mesh-gradient': 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(236, 72, 153, 0.18) 100%)',
        'glass-radial': 'radial-gradient(circle at center, rgba(255, 255, 255, 0.35) 0%, transparent 60%)',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
} satisfies Config;

export default config;
