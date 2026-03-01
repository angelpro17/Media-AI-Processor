/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            colors: {
                kick: {
                    green: '#53FC18',
                    'green-dark': '#2ECC00',
                    black: '#000000',
                    dark: '#111111',
                    surface: '#1E1E1E',
                    border: '#2A2A2A',
                    muted: '#6B7280',
                    white: '#FFFFFF',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                'green-sm': '0 0 12px rgba(83,252,24,0.25)',
                'green-md': '0 0 24px rgba(83,252,24,0.35)',
                'green-lg': '0 0 48px rgba(83,252,24,0.25)',
            },
            animation: {
                'pulse-green': 'pulseGreen 2s cubic-bezier(0.4,0,0.6,1) infinite',
                'bar': 'bar 1.2s ease-in-out infinite',
                'fade-up': 'fadeUp 0.4s ease both',
            },
            keyframes: {
                pulseGreen: {
                    '0%,100%': { opacity: '1' },
                    '50%': { opacity: '0.5' },
                },
                bar: {
                    '0%,100%': { transform: 'scaleY(0.3)' },
                    '50%': { transform: 'scaleY(1)' },
                },
                fadeUp: {
                    from: { opacity: '0', transform: 'translateY(16px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
            },
        },
    },
    plugins: [],
}
