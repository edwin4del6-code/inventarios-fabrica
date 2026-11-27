/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'] },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: 'hsl(var(--card))',
        border: 'hsl(var(--border))',
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        primary: { DEFAULT: 'hsl(var(--primary))', soft: 'hsl(var(--primary-soft))', foreground: '#fff' },
        danger: { DEFAULT: 'hsl(var(--danger))', soft: 'hsl(var(--danger-soft))' },
        warning: { DEFAULT: 'hsl(var(--warning))', soft: 'hsl(var(--warning-soft))' },
        transit: { DEFAULT: 'hsl(var(--transit))', soft: 'hsl(var(--transit-soft))' },
        store: { DEFAULT: 'hsl(var(--store))', soft: 'hsl(var(--store-soft))' },
        sold: { DEFAULT: 'hsl(var(--sold))', soft: 'hsl(var(--sold-soft))' },
      },
      borderRadius: { lg: '12px', xl: '16px', '2xl': '20px' },
      boxShadow: {
        soft: '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.03)',
        lift: '0 4px 12px rgba(16,24,40,0.06), 0 2px 4px rgba(16,24,40,0.04)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'none' } },
        'overlay-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'dialog-in': { from: { opacity: '0', transform: 'translate(-50%,-48%) scale(.97)' }, to: { opacity: '1', transform: 'translate(-50%,-50%) scale(1)' } },
        'sheet-in': { from: { opacity: '0', transform: 'translateX(24px)' }, to: { opacity: '1', transform: 'none' } },
        'sheet-left-in': { from: { opacity: '0', transform: 'translateX(-24px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: {
        'fade-in': 'fade-in .25s ease-out',
        'overlay-in': 'overlay-in .2s ease-out',
        'dialog-in': 'dialog-in .2s ease-out',
        'sheet-in': 'sheet-in .25s ease-out',
        'sheet-left-in': 'sheet-left-in .25s ease-out',
      },
    },
  },
  plugins: [],
}
