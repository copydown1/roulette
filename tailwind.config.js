/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:       '#0a0a0a',
        panel:    '#111214',
        border:   '#26262a',
        gold:     '#e6b450',
        'gold-dim': '#a07d30',
        win:      '#3a9e65',
        loss:     '#c53a3a',
        felt:     '#1e8a4e',
        'felt-dark': '#0f4d2e',
        'pocket-red': '#d03535',
        'pocket-red-dark': '#a82828',
        'pocket-black': '#1a1a1a',
        'pocket-green': '#1e8a4e',
        label:    '#9a9aa0',
        muted:    '#4a4a52',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      letterSpacing: {
        wide2: '0.2em',
        wide3: '0.3em',
      },
      animation: {
        pulse2: 'pulse 1.8s cubic-bezier(0.4,0,0.6,1) infinite',
      },
    },
  },
  plugins: [],
};
