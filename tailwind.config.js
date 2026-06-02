/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark theme colors
        dark: {
          bg: '#1e1e1e',
          sidebar: '#252526',
          panel: '#1e1e1e',
          border: '#3e3e42',
          text: '#cccccc',
          textDim: '#858585',
          accent: '#0078d4',
          hover: '#2a2d2e',
          active: '#37373d',
          tab: '#2d2d2d',
          tabActive: '#1e1e1e',
          statusBar: '#007acc',
        },
        // Light theme colors
        light: {
          bg: '#ffffff',
          sidebar: '#f3f3f3',
          panel: '#ffffff',
          border: '#e4e4e4',
          text: '#1e1e1e',
          textDim: '#717171',
          accent: '#0078d4',
          hover: '#e8e8e8',
          active: '#e0e0e0',
          tab: '#ececec',
          tabActive: '#ffffff',
          statusBar: '#007acc',
        },
      },
      fontFamily: {
        mono: ['Consolas', 'Monaco', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [
    // `light:` カスタムバリアントを定義する。
    // Tailwind 組み込みの `dark:` は .dark クラスが html に付いたときに適用されるが、
    // `light:` に相当するバリアントは存在しない。
    // `:root:not(.dark) &` = "html に .dark クラスがない（= ライトモードの）ときだけ適用"
    // という意味になり、dark: と light: が排他的に機能するようになる。
    function ({ addVariant }) {
      addVariant('light', ':root:not(.dark) &')
    },
  ],
}
