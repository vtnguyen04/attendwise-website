
'use client';

import { motion } from 'framer-motion';
import { Icons } from '@/components/ui/icons';
import Link from 'next/link';
import Github from 'lucide-react/icons/github';
import Twitter from 'lucide-react/icons/twitter';
import Linkedin from 'lucide-react/icons/linkedin';
import Mail from 'lucide-react/icons/mail';
import Heart from 'lucide-react/icons/heart';

export default function MarketingFooter() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { name: 'Features', href: '/features' },
      { name: 'Pricing', href: '#' },
      { name: 'Use Cases', href: '#' },
      { name: 'Integrations', href: '#' },
    ],
    company: [
      { name: 'About', href: '#' },
      { name: 'Blog', href: '#' },
      { name: 'Careers', href: '#' },
      { name: 'Contact', href: '#' },
    ],
    resources: [
      { name: 'Documentation', href: '#' },
      { name: 'Help Center', href: '#' },
      { name: 'Community', href: '#' },
      { name: 'API Reference', href: '#' },
    ],
    legal: [
      { name: 'Privacy', href: '#' },
      { name: 'Terms', href: '#' },
      { name: 'Security', href: '#' },
      { name: 'Cookies', href: '#' },
    ],
  };

  const socialLinks = [
    { icon: Twitter, href: '#', label: 'Twitter', color: 'hover:text-blue-400' },
    { icon: Github, href: '#', label: 'GitHub', color: 'hover:text-gray-400' },
    { icon: Linkedin, href: '#', label: 'LinkedIn', color: 'hover:text-blue-500' },
    { icon: Mail, href: '#', label: 'Email', color: 'hover:text-purple-400' },
  ];

  const footerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.footer
      className="relative w-full overflow-hidden bg-slate-950 border-t border-white/5"
      variants={footerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
    >
      {/* Animated Wave Background - simplified for performance */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <svg className="absolute bottom-0 w-full h-auto" viewBox="0 0 1440 120">
          <path
            fill="#8B5CF6"
            d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,53.3C672,53,768,75,864,85.3C960,96,1056,96,1152,85.3C1248,75,1344,53,1392,42.7L1440,32L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"
          ></path>
        </svg>
      </div>

      <div className="container relative z-10 mx-auto px-4 py-12 sm:py-16 lg:py-20">
        {/* Top Section */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 lg:gap-12 mb-12"
          variants={footerVariants}
        >
          {/* Brand Section */}
          <motion.div className="lg:col-span-2 space-y-4" variants={itemVariants}>
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <motion.div whileHover={{ scale: 1.1, rotate: -10 }}>
                <Icons.logo className="h-8 w-8 text-purple-400 group-hover:text-purple-300 transition-colors" />
              </motion.div>
              <span className="text-2xl font-black tracking-tight text-white group-hover:text-purple-300 transition-colors">
                AttendWise
              </span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              The smartest way to manage events, check-ins, and build thriving communities.
            </p>

            {/* Social Links */}
            <div className="flex gap-3 pt-2">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  whileHover={{ scale: 1.2, y: -2 }}
                  className={`group relative p-2.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors duration-300 ${social.color}`}
                >
                  <social.icon className="w-5 h-5 text-gray-400 group-hover:text-current transition-colors" />
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Links Sections */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <motion.div key={category} variants={itemVariants}>
              <h3 className="text-white font-semibold mb-4 capitalize">{category}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="group inline-flex items-center text-sm text-gray-400 hover:text-purple-400 transition-colors duration-300"
                    >
                      <motion.span
                        className="relative"
                        whileHover={{ x: 2 }}
                      >
                        {link.name}
                        <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-400 to-pink-400 group-hover:w-full transition-all duration-300" />
                      </motion.span>
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom Section */}
        <motion.div className="pt-8 border-t border-white/5" variants={itemVariants}>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm flex items-center gap-2">
              © {currentYear} AttendWise, Inc. Made with
              <Heart className="w-4 h-4 text-red-500 fill-red-500 animate-pulse" />
              in Vietnam
            </p>

            <div className="flex gap-6 text-xs text-gray-500">
              <Link href="#" className="hover:text-gray-300 transition-colors">
                Privacy Policy
              </Link>
              <Link href="#" className="hover:text-gray-300 transition-colors">
                Terms of Service
              </Link>
              <Link href="#" className="hover:text-gray-300 transition-colors">
                Cookie Policy
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.footer>
  );
}