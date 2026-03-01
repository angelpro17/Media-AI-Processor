export type TranslationDirection = 'es-en' | 'en-es' | 'es-fr' | 'fr-es' | 'es-it' | 'it-es' | 'es-pt' | 'pt-es' | 'es-de' | 'de-es'

export interface DirectionOption {
    id: TranslationDirection
    from: string
    to: string
}

export interface NavItem {
    path: string
    label: string
    icon: string
}
