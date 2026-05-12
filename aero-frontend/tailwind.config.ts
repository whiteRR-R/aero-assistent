import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Bricolage Grotesque', 'sans-serif'],
        sans:    ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono:    ['Fira Code', 'monospace'],
      },
      colors: {
        bg: {
          base:     'var(--bg-base)',
          surface:  'var(--bg-surface)',
          elevated: 'var(--bg-elevated)',
          overlay:  'var(--bg-overlay)',
          card:     'var(--bg-card)',
        },
        accent:  'var(--accent)',
        accent2: 'var(--accent-2)',
        accent3: 'var(--accent-3)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger:  'var(--danger)',
        info:    'var(--info)',
        txt: {
          primary:   'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted:     'var(--text-muted)',
        },
        bdr: {
          DEFAULT: 'var(--border)',
          strong:  'var(--border-strong)',
          accent:  'var(--border-accent)',
        },
      },
      borderRadius: {
        sm: '4px', md: '8px', lg: '10px', xl: '14px', '2xl': '20px',
      },
      boxShadow: {
        card:      '0 1px 4px rgba(0,0,0,0.18), 0 1px 2px rgba(0,0,0,0.12)',
        md:        '0 4px 16px rgba(0,0,0,0.22)',
        lg:        '0 8px 32px rgba(0,0,0,0.28)',
        glow:      '0 0 0 3px var(--accent-muted)',
        'glow-lg': '0 0 0 3px var(--accent-muted)',
      },
      backgroundImage: {
        'gradient-accent': 'linear-gradient(135deg, var(--accent), var(--accent-dim))',
        'gradient-vivid':  'linear-gradient(135deg, var(--accent), var(--accent-dim))',
        'gradient-mesh':   'none',
      },
      animation: {
        'fade-up':   'fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) forwards',
        'scale-in':  'scaleIn 0.2s ease forwards',
        'shimmer':   'shimmer 1.6s infinite linear',
        'spin-slow': 'spin-slow 8s linear infinite',
        'pulse-dot': 'pulse-dot 1.5s ease-in-out infinite',
        'glow-pulse':'none',
        'float':     'none',
        'gradient':  'none',
      },
    },
  },
  plugins: [],
} satisfies Config
