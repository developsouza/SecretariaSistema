/** @type {import('tailwindcss').Config} */
export default {
    darkMode: "class",
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: "#4f6ef7",
                    50: "#eef2ff",
                    100: "#e0e7ff",
                    200: "#c7d2fe",
                    300: "#a5b4fc",
                    400: "#818cf8",
                    500: "#6366f1",
                    600: "#4f6ef7",
                    700: "#4338ca",
                    800: "#3730a3",
                    900: "#312e81",
                },
                secondary: { DEFAULT: "#0ea5e9", 500: "#0ea5e9", 600: "#0284c7", 700: "#0369a1" },
                dark: {
                    50: "#f8fafc",
                    100: "#f1f5f9",
                    800: "#1e293b",
                    850: "#172032",
                    900: "#0f172a",
                    950: "#020617",
                },
            },
            fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
            boxShadow: {
                glow: "0 0 20px rgba(79,110,247,0.25)",
                "glow-sm": "0 0 10px rgba(79,110,247,0.15)",
                card: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
                "card-hover": "0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)",
                "inner-top": "inset 0 1px 0 rgba(255,255,255,0.06)",
            },
            animation: {
                "fade-in": "fadeIn 0.3s ease-out",
                "slide-up": "slideUp 0.3s ease-out",
                "slide-in-left": "slideInLeft 0.25s ease-out",
                shimmer: "shimmer 1.6s infinite linear",
                "bounce-subtle": "bounceSm 0.4s ease-out",
            },
            keyframes: {
                fadeIn: { "0%": { opacity: 0 }, "100%": { opacity: 1 } },
                slideUp: { "0%": { opacity: 0, transform: "translateY(8px)" }, "100%": { opacity: 1, transform: "translateY(0)" } },
                slideInLeft: { "0%": { opacity: 0, transform: "translateX(-8px)" }, "100%": { opacity: 1, transform: "translateX(0)" } },
                shimmer: { "0%": { backgroundPosition: "-200% center" }, "100%": { backgroundPosition: "200% center" } },
                bounceSm: { "0%": { transform: "scale(0.96)" }, "60%": { transform: "scale(1.02)" }, "100%": { transform: "scale(1)" } },
            },
        },
    },
    plugins: [],
};
