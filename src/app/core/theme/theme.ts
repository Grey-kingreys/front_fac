export type ThemeMode = 'light' | 'dark';

export interface AppTheme {
    name: ThemeMode;
    colors: {
        primary: string;
        primaryHover: string;
        primaryLight: string;
        secondary: string;
        accent: string;
        background: string;
        surface: string;
        surfaceHover: string;
        border: string;
        textPrimary: string;
        textSecondary: string;
        textMuted: string;
        success: string;
        warning: string;
        danger: string;
        info: string;
    };
}

export const lightTheme: AppTheme = {
    name: 'light',
    colors: {
        primary: '#1A56A0',   // bleu institutionnel
        primaryHover: '#164A8C',
        primaryLight: '#EBF2FC',
        secondary: '#0E9F6E',   // vert validation
        accent: '#F59E0B',   // ambre — alertes / badges
        background: '#F4F6FA',
        surface: '#FFFFFF',
        surfaceHover: '#F0F4FF',
        border: '#DDE3F0',
        textPrimary: '#111827',
        textSecondary: '#374151',
        textMuted: '#9CA3AF',
        success: '#0E9F6E',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6',
    },
};

export const darkTheme: AppTheme = {
    name: 'dark',
    colors: {
        primary: '#3B82F6',
        primaryHover: '#2563EB',
        primaryLight: '#1E3A5F',
        secondary: '#10B981',
        accent: '#F59E0B',
        background: '#0F1117',
        surface: '#1A1D27',
        surfaceHover: '#22263A',
        border: '#2E3347',
        textPrimary: '#F1F5F9',
        textSecondary: '#CBD5E1',
        textMuted: '#64748B',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#60A5FA',
    },
};

export const themes: Record<ThemeMode, AppTheme> = {
    light: lightTheme,
    dark: darkTheme,
};