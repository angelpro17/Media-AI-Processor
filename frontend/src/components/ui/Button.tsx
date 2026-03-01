import type { ButtonHTMLAttributes } from 'react'
import Icon from './Icon'
import type { IconName } from '@/types/ui'

type Variant = 'primary' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg' | 'xl'

const VARIANTS: Record<Variant, string> = {
    primary: 'bg-kick-green text-kick-black hover:bg-kick-green-dark shadow-green-sm hover:shadow-green-md active:scale-95',
    outline: 'border border-kick-green/40 text-kick-green hover:border-kick-green hover:bg-kick-green/10',
    ghost: 'text-kick-muted hover:text-kick-white hover:bg-kick-surface',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:scale-95',
}

const SIZES: Record<Size, string> = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2   text-sm gap-2',
    lg: 'px-6 py-3   text-base gap-2.5',
    xl: 'px-8 py-4   text-lg gap-3',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant
    size?: Size
    icon?: IconName
    iconRight?: IconName
    loading?: boolean
}

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    icon,
    iconRight,
    loading = false,
    disabled = false,
    className = '',
    ...props
}: ButtonProps) {
    const isDisabled = disabled || loading

    return (
        <button
            className={[
                'inline-flex items-center justify-center font-semibold rounded-lg',
                'transition-all duration-150 select-none',
                VARIANTS[variant],
                SIZES[size],
                isDisabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer',
                className,
            ].join(' ')}
            disabled={isDisabled}
            {...props}
        >
            {loading
                ? <Icon name="spinner" className="w-4 h-4" />
                : icon
                    ? <Icon name={icon} className="w-4 h-4 shrink-0" />
                    : null}
            {children}
            {iconRight && !loading && <Icon name={iconRight} className="w-4 h-4 shrink-0" />}
        </button>
    )
}
