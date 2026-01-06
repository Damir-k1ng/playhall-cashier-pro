import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Monaco', 'monospace'],
        gaming: ['Orbitron', 'Inter', 'sans-serif'],
        brand: ['Russo One', 'Orbitron', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        vip: {
          DEFAULT: "hsl(var(--vip))",
          foreground: "hsl(var(--vip-foreground))",
        },
        hall: {
          DEFAULT: "hsl(var(--hall))",
          foreground: "hsl(var(--hall-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        reserved: {
          DEFAULT: "hsl(var(--reserved))",
          foreground: "hsl(var(--reserved-foreground))",
        },
        ingame: {
          DEFAULT: "hsl(var(--ingame))",
          foreground: "hsl(var(--ingame-foreground))",
        },
        cash: "hsl(var(--cash))",
        kaspi: "hsl(var(--kaspi))",
        cyan: {
          DEFAULT: "hsl(180, 100%, 50%)",
          50: "hsl(180, 100%, 95%)",
          100: "hsl(180, 100%, 90%)",
          200: "hsl(180, 100%, 80%)",
          300: "hsl(180, 100%, 70%)",
          400: "hsl(180, 100%, 60%)",
          500: "hsl(180, 100%, 50%)",
          600: "hsl(180, 100%, 40%)",
          700: "hsl(180, 100%, 30%)",
          800: "hsl(180, 100%, 20%)",
          900: "hsl(180, 100%, 10%)",
        },
        emerald: {
          DEFAULT: "hsl(160, 84%, 45%)",
          50: "hsl(160, 84%, 95%)",
          100: "hsl(160, 84%, 90%)",
          200: "hsl(160, 84%, 80%)",
          300: "hsl(160, 84%, 70%)",
          400: "hsl(160, 84%, 55%)",
          500: "hsl(160, 84%, 45%)",
          600: "hsl(160, 84%, 35%)",
          700: "hsl(160, 84%, 25%)",
          800: "hsl(160, 84%, 15%)",
          900: "hsl(160, 84%, 8%)",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-glow": {
          "0%, 100%": { 
            opacity: "1",
            filter: "brightness(1)"
          },
          "50%": { 
            opacity: "0.85",
            filter: "brightness(1.3)"
          },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "float": "float 3s ease-in-out infinite",
      },
      boxShadow: {
        "glow-sm": "0 0 10px hsl(180 100% 50% / 0.2)",
        "glow-md": "0 0 20px hsl(180 100% 50% / 0.3), 0 0 40px hsl(180 100% 50% / 0.1)",
        "glow-lg": "0 0 30px hsl(180 100% 50% / 0.4), 0 0 60px hsl(180 100% 50% / 0.2)",
        "glow-emerald": "0 0 20px hsl(160 84% 45% / 0.3), 0 0 40px hsl(160 84% 45% / 0.1)",
        "glow-gold": "0 0 20px hsl(45 100% 55% / 0.3), 0 0 40px hsl(45 100% 55% / 0.1)",
        "card": "0 4px 20px 0 rgb(0 0 0 / 0.3), 0 0 40px 0 hsl(180 100% 50% / 0.03)",
        "card-hover": "0 8px 30px 0 rgb(0 0 0 / 0.4), 0 0 50px 0 hsl(180 100% 50% / 0.08)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
