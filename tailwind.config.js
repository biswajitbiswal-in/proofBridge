/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', '-apple-system', 'sans-serif'],
      },
      colors: {
        pb: {
          bg: 'var(--color-background)',
          sidebar: 'var(--color-sidebar)',
          card: 'var(--color-card)',
          cardHover: 'var(--color-card-hover)',
          elevated: 'var(--color-elevated)',
          input: 'var(--color-input)',
          primary: 'var(--color-primary)',
          primaryHover: 'var(--color-primary-hover)',
          primaryMuted: 'var(--color-primary-muted)',
          accent: 'var(--color-accent)',
          textPrimary: 'var(--color-text-primary)',
          textSecondary: 'var(--color-text-secondary)',
          textMuted: 'var(--color-text-muted)',
          border: 'var(--color-border)',
          borderHover: 'var(--color-border-hover)',
          success: 'var(--color-success)',
          warning: 'var(--color-warning)',
          danger: 'var(--color-danger)',
          info: 'var(--color-info)',
        },
      },
      borderRadius: {
        control: '6px',
        card: '10px',
        panel: '12px',
      },
    },
  },
  plugins: [],
};
