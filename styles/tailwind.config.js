/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './lib/**/*.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Colors matching CSS variables
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        secondary: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        accent: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        info: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
        // Platform-specific colors
        platform: {
          primary: '#4f46e5',
          'primary-dark': '#4338ca',
          'primary-light': '#6366f1',
          secondary: '#10b981',
          'secondary-dark': '#0d9668',
          'secondary-light': '#34d399',
          accent: '#f59e0b',
          'accent-dark': '#d97706',
          'accent-light': '#fbbf24',
          danger: '#ef4444',
          'danger-dark': '#dc2626',
          'danger-light': '#f87171',
        },
      },
      
      // Font families
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
          'Apple Color Emoji',
          'Segoe UI Emoji',
          'Segoe UI Symbol',
        ],
        mono: [
          'SFMono-Regular',
          'Consolas',
          'Liberation Mono',
          'Menlo',
          'monospace',
        ],
      },
      
      // Font sizes
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
        '8xl': ['6rem', { lineHeight: '1' }],
        '9xl': ['8rem', { lineHeight: '1' }],
      },
      
      // Spacing
      spacing: {
        '0.5': '0.125rem',
        '1.5': '0.375rem',
        '2.5': '0.625rem',
        '3.5': '0.875rem',
        '4.5': '1.125rem',
        '5.5': '1.375rem',
        '6.5': '1.625rem',
      },
      
      // Border radius
      borderRadius: {
        'none': '0',
        'sm': '0.125rem',
        'DEFAULT': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        'full': '9999px',
      },
      
      // Box shadow
      boxShadow: {
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'DEFAULT': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        'inner': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
        'none': 'none',
      },
      
      // Animations
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-out': 'fadeOut 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
        'bounce-slow': 'bounce 2s infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'modal-enter': 'modalFadeIn 0.3s ease-out',
        'skeleton-loading': 'skeleton-loading 1.5s infinite',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(1rem)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-1rem)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-1rem)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(1rem)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        modalFadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-1rem)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'skeleton-loading': {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      
      // Transitions
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
        'transform': 'transform',
        'opacity': 'opacity',
        'colors': 'color, background-color, border-color, text-decoration-color, fill, stroke',
        'all': 'all',
      },
      
      transitionDuration: {
        'fast': '150ms',
        'DEFAULT': '300ms',
        'slow': '500ms',
      },
      
      transitionTimingFunction: {
        'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      
      // Z-index
      zIndex: {
        'dropdown': '1000',
        'sticky': '1020',
        'fixed': '1030',
        'modal-backdrop': '1040',
        'modal': '1050',
        'popover': '1060',
        'tooltip': '1070',
        'toast': '1080',
      },
      
      // Custom utilities
      backdropBlur: {
        'xs': '2px',
      },
      
      // Grid template columns
      gridTemplateColumns: {
        '16': 'repeat(16, minmax(0, 1fr))',
        '24': 'repeat(24, minmax(0, 1fr))',
      },
      
      // Custom max-widths
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
        '10xl': '104rem',
      },
      
      // Min and max heights
      minHeight: {
        'screen-75': '75vh',
        'screen-50': '50vh',
      },
      
      maxHeight: {
        'screen-90': '90vh',
        'screen-75': '75vh',
      },
      
      // Line clamp
      lineClamp: {
        1: '1',
        2: '2',
        3: '3',
        4: '4',
        5: '5',
        6: '6',
        7: '7',
        8: '8',
        9: '9',
        10: '10',
      },
      
      // Custom utilities for platform
      typography: (theme) => ({
        DEFAULT: {
          css: {
            color: theme('colors.gray.900'),
            a: {
              color: theme('colors.primary.600'),
              '&:hover': {
                color: theme('colors.primary.800'),
              },
            },
            'h1, h2, h3, h4': {
              color: theme('colors.gray.900'),
              fontWeight: '700',
            },
            code: {
              color: theme('colors.gray.900'),
              backgroundColor: theme('colors.gray.100'),
              padding: '0.2em 0.4em',
              borderRadius: theme('borderRadius.sm'),
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
          },
        },
        dark: {
          css: {
            color: theme('colors.gray.100'),
            a: {
              color: theme('colors.primary.400'),
              '&:hover': {
                color: theme('colors.primary.300'),
              },
            },
            'h1, h2, h3, h4': {
              color: theme('colors.gray.100'),
            },
            code: {
              color: theme('colors.gray.100'),
              backgroundColor: theme('colors.gray.800'),
            },
          },
        },
      }),
    },
  },
  variants: {
    extend: {
      backgroundColor: ['active', 'disabled'],
      textColor: ['active', 'disabled'],
      borderColor: ['active', 'disabled'],
      opacity: ['disabled'],
      cursor: ['disabled'],
      display: ['group-hover'],
      visibility: ['group-hover'],
      transform: ['group-hover'],
      translate: ['group-hover'],
      scale: ['group-hover'],
      rotate: ['group-hover'],
      animation: ['hover', 'focus'],
      backdropBlur: ['hover', 'focus'],
      lineClamp: ['hover'],
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
    require('@tailwindcss/container-queries'),
    
    // Custom plugin for line clamp
    function({ addUtilities, theme, variants }) {
      const lineClampUtilities = Object.fromEntries(
        Object.entries(theme('lineClamp')).map(([key, value]) => {
          return [
            `.line-clamp-${key}`,
            {
              overflow: 'hidden',
              display: '-webkit-box',
              '-webkit-box-orient': 'vertical',
              '-webkit-line-clamp': value,
            },
          ];
        })
      );
      
      addUtilities(lineClampUtilities, variants('lineClamp'));
    },
    
    // Custom plugin for scrollbar
    function({ addUtilities, theme, variants }) {
      const scrollbarUtilities = {
        '.scrollbar-thin': {
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: theme('colors.gray.100'),
            borderRadius: theme('borderRadius.full'),
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme('colors.gray.300'),
            borderRadius: theme('borderRadius.full'),
          },
          '&::-webkit-scrollbar-thumb:hover': {
            backgroundColor: theme('colors.gray.400'),
          },
        },
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
      };
      
      addUtilities(scrollbarUtilities, variants('scrollbar'));
    },
    
    // Custom plugin for platform-specific utilities
    function({ addComponents, theme }) {
      const components = {
        // Platform header
        '.platform-header': {
          background: `linear-gradient(135deg, ${theme('colors.primary.600')} 0%, ${theme('colors.primary.700')} 100%)`,
          color: theme('colors.white'),
          padding: theme('spacing.8') + ' 0',
          marginBottom: theme('spacing.8'),
        },
        
        // Platform footer
        '.platform-footer': {
          backgroundColor: theme('colors.gray.900'),
          color: theme('colors.gray.100'),
          padding: theme('spacing.12') + ' 0',
          marginTop: theme('spacing.16'),
          borderTop: `1px solid ${theme('colors.gray.200')}`,
          
          'a': {
            color: theme('colors.gray.100'),
            opacity: '0.8',
            transition: 'opacity 150ms cubic-bezier(0.4, 0, 0.2, 1)',
            
            '&:hover': {
              opacity: '1',
              textDecoration: 'underline',
            },
          },
        },
        
        // Admin sidebar
        '.admin-sidebar': {
          backgroundColor: theme('colors.gray.50'),
          borderRight: `1px solid ${theme('colors.gray.200')}`,
          minHeight: 'calc(100vh - 4rem)',
          padding: theme('spacing.6') + ' 0',
          
          '.nav-link': {
            color: theme('colors.gray.600'),
            borderRadius: '0',
            borderLeft: '3px solid transparent',
            marginRight: '0',
            
            '&:hover': {
              color: theme('colors.gray.900'),
              backgroundColor: theme('colors.gray.100'),
            },
            
            '&.active': {
              color: theme('colors.primary.600'),
              backgroundColor: theme('colors.primary.50'),
              borderLeftColor: theme('colors.primary.600'),
            },
          },
        },
        
        // Dashboard stats cards
        '.stats-card': {
          background: `linear-gradient(135deg, ${theme('colors.white')} 0%, ${theme('colors.gray.50')} 100%)`,
          border: `1px solid ${theme('colors.gray.200')}`,
          borderRadius: theme('borderRadius.lg'),
          padding: theme('spacing.6'),
          transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          
          '&:hover': {
            borderColor: theme('colors.primary.600'),
            boxShadow: theme('boxShadow.lg'),
          },
          
          '.stats-value': {
            fontSize: theme('fontSize.4xl'),
            fontWeight: theme('fontWeight.bold'),
            color: theme('colors.primary.600'),
            lineHeight: theme('lineHeight.none'),
            marginBottom: theme('spacing.2'),
          },
          
          '.stats-label': {
            fontSize: theme('fontSize.sm'),
            color: theme('colors.gray.500'),
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          },
        },
        
        // File upload zone
        '.upload-zone': {
          border: `2px dashed ${theme('colors.gray.300')}`,
          borderRadius: theme('borderRadius.lg'),
          padding: theme('spacing.12') + ' ' + theme('spacing.8'),
          textAlign: 'center',
          backgroundColor: theme('colors.gray.50'),
          transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
          cursor: 'pointer',
          
          '&:hover': {
            borderColor: theme('colors.primary.600'),
            backgroundColor: theme('colors.primary.50'),
          },
          
          '&.dragover': {
            borderColor: theme('colors.primary.600'),
            backgroundColor: theme('colors.primary.100'),
          },
          
          '.upload-icon': {
            color: theme('colors.gray.500'),
            marginBottom: theme('spacing.4'),
          },
          
          '.upload-text': {
            color: theme('colors.gray.600'),
            marginBottom: theme('spacing.2'),
          },
          
          '.upload-hint': {
            color: theme('colors.gray.500'),
            fontSize: theme('fontSize.sm'),
          },
        },
        
        // Status badges
        '.status-badge': {
          display: 'inline-flex',
          alignItems: 'center',
          padding: theme('spacing.1') + ' ' + theme('spacing.3'),
          fontSize: theme('fontSize.xs'),
          fontWeight: theme('fontWeight.semibold'),
          borderRadius: theme('borderRadius.full'),
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        },
        
        '.status-active': {
          backgroundColor: theme('colors.success.100'),
          color: theme('colors.success.700'),
        },
        
        '.status-pending': {
          backgroundColor: theme('colors.warning.100'),
          color: theme('colors.warning.700'),
        },
        
        '.status-suspended': {
          backgroundColor: theme('colors.danger.100'),
          color: theme('colors.danger.700'),
        },
        
        '.status-deleted': {
          backgroundColor: theme('colors.gray.100'),
          color: theme('colors.gray.600'),
        },
        
        '.status-error': {
          backgroundColor: theme('colors.danger.100'),
          color: theme('colors.danger.700'),
        },
        
        // Empty state
        '.empty-state': {
          textAlign: 'center',
          padding: theme('spacing.12') + ' ' + theme('spacing.4'),
          color: theme('colors.gray.500'),
        },
        
        '.empty-state-icon': {
          marginBottom: theme('spacing.4'),
          color: theme('colors.gray.300'),
        },
        
        '.empty-state-title': {
          fontSize: theme('fontSize.xl'),
          color: theme('colors.gray.600'),
          marginBottom: theme('spacing.2'),
        },
        
        '.empty-state-description': {
          color: theme('colors.gray.500'),
          maxWidth: '24rem',
          margin: '0 auto',
        },
        
        // Loading skeleton
        '.skeleton': {
          background: `linear-gradient(
            90deg,
            ${theme('colors.gray.100')} 25%,
            ${theme('colors.gray.200')} 50%,
            ${theme('colors.gray.100')} 75%
          )`,
          backgroundSize: '200% 100%',
          animation: 'skeleton-loading 1.5s infinite',
          borderRadius: theme('borderRadius.md'),
        },
        
        // Theme toggle
        '.theme-toggle': {
          background: 'none',
          border: 'none',
          padding: theme('spacing.2'),
          cursor: 'pointer',
          color: theme('colors.gray.600'),
          transition: 'color 150ms cubic-bezier(0.4, 0, 0.2, 1)',
          
          '&:hover': {
            color: theme('colors.gray.900'),
          },
          
          'svg': {
            width: theme('spacing.5'),
            height: theme('spacing.5'),
          },
        },
        
        // Custom scrollbar
        '.custom-scrollbar': {
          '&::-webkit-scrollbar': {
            width: '10px',
            height: '10px',
          },
          
          '&::-webkit-scrollbar-track': {
            background: theme('colors.gray.100'),
            borderRadius: theme('borderRadius.full'),
          },
          
          '&::-webkit-scrollbar-thumb': {
            background: theme('colors.gray.300'),
            borderRadius: theme('borderRadius.full'),
            
            '&:hover': {
              background: theme('colors.gray.400'),
            },
          },
        },
      };
      
      addComponents(components);
    },
  ],
};