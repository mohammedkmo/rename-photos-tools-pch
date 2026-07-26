import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
	],
  prefix: "",
  theme: {
  	container: {
  		padding: '2rem',
  		screens: {
  			'2xl': '1200px'
  		}
  	},
  	extend: {
		fontFamily: {
			sans: ['var(--font-geist-sans)', 'var(--font-arabic)', 'system-ui', 'sans-serif'],
			inter: ['var(--font-geist-sans)', 'var(--font-arabic)', 'system-ui', 'sans-serif'],
			ibmPlexSansArabic: ['var(--font-arabic)', 'system-ui', 'sans-serif'],
		},
  		colors: {
  			// Navy ink, a cool off-white ground and hairline rules. `accent`
  			// belongs to the sheet itself - selection, the active cell, cell
  			// focus. Chrome outside the sheet (buttons, bars) uses `action`,
			// which is near black so nothing competes with the data.
			pch: {
				ground: '#efefed',
				surface: '#FFFFFF',
				subtle: '#F7FAFC',
				ink: '#0A2540',
				ink2: '#425466',
				ink3: '#8792A2',
				line: '#E6EBF1',
				line2: '#D5DBE1',
				accent: '#2563EB',
				accentInk: '#1D4ED8',
				accentSoft: '#EFF6FF',
				action: '#3C3C3C',
				actionInk: '#282828',
				okBg: '#CBF4C9',
				okInk: '#0E6245',
				warnBg: '#F8E5B9',
				warnInk: '#983705',
				warnEdge: '#E5A94A',
				stopBg: '#FDE2DD',
				stopInk: '#A41C4E',
				stopEdge: '#E25950',
				brand: '#D6202A',
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
