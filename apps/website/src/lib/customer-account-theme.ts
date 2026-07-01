export interface CustomerAccountTheme {
  layout: 'classic' | 'concierge'
  surfaceColor: string
  panelColor: string
  textColor: string
  mutedColor: string
  accentColor: string
  secondaryAccentColor: string
  borderColor: string
  radius: number
  cardStyle: 'flat' | 'soft'
  navStyle: 'sidebar' | 'tabs'
  density: 'comfortable' | 'compact'
  welcomeLabel: string
}

export const DEFAULT_CUSTOMER_ACCOUNT_THEME: CustomerAccountTheme = {
  layout: 'concierge',
  surfaceColor: '#f7f4ee',
  panelColor: '#ffffff',
  textColor: '#151a17',
  mutedColor: '#6f766f',
  accentColor: '#1a6d3e',
  secondaryAccentColor: '#b88935',
  borderColor: '#ddd7cb',
  radius: 8,
  cardStyle: 'soft',
  navStyle: 'sidebar',
  density: 'comfortable',
  welcomeLabel: 'My HomeU',
}

export function normalizeCustomerAccountTheme(input: any): CustomerAccountTheme {
  const raw = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  const radius = Number(raw.radius)
  return {
    layout: raw.layout === 'classic' ? 'classic' : 'concierge',
    surfaceColor: typeof raw.surfaceColor === 'string' && raw.surfaceColor ? raw.surfaceColor : DEFAULT_CUSTOMER_ACCOUNT_THEME.surfaceColor,
    panelColor: typeof raw.panelColor === 'string' && raw.panelColor ? raw.panelColor : DEFAULT_CUSTOMER_ACCOUNT_THEME.panelColor,
    textColor: typeof raw.textColor === 'string' && raw.textColor ? raw.textColor : DEFAULT_CUSTOMER_ACCOUNT_THEME.textColor,
    mutedColor: typeof raw.mutedColor === 'string' && raw.mutedColor ? raw.mutedColor : DEFAULT_CUSTOMER_ACCOUNT_THEME.mutedColor,
    accentColor: typeof raw.accentColor === 'string' && raw.accentColor ? raw.accentColor : DEFAULT_CUSTOMER_ACCOUNT_THEME.accentColor,
    secondaryAccentColor: typeof raw.secondaryAccentColor === 'string' && raw.secondaryAccentColor ? raw.secondaryAccentColor : DEFAULT_CUSTOMER_ACCOUNT_THEME.secondaryAccentColor,
    borderColor: typeof raw.borderColor === 'string' && raw.borderColor ? raw.borderColor : DEFAULT_CUSTOMER_ACCOUNT_THEME.borderColor,
    radius: Number.isFinite(radius) ? Math.max(0, Math.min(24, radius)) : DEFAULT_CUSTOMER_ACCOUNT_THEME.radius,
    cardStyle: raw.cardStyle === 'flat' ? 'flat' : 'soft',
    navStyle: raw.navStyle === 'tabs' ? 'tabs' : 'sidebar',
    density: raw.density === 'compact' ? 'compact' : 'comfortable',
    welcomeLabel: typeof raw.welcomeLabel === 'string' && raw.welcomeLabel.trim() ? raw.welcomeLabel.trim() : DEFAULT_CUSTOMER_ACCOUNT_THEME.welcomeLabel,
  }
}
