/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none', // 取消最大宽度限制，利用整个窗口
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'), // 需要安装这个插件
  ],
}
