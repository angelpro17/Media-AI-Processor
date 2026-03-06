import type { ReactNode } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'

interface CardProps extends HTMLMotionProps<"div"> {
    children: ReactNode
    className?: string
    glow?: boolean
}

interface CardHeaderProps {
    title?: string
    subtitle?: string
    icon?: ReactNode
    children?: ReactNode
}

export default function Card({ children, className = '', glow = false, ...props }: CardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={[
                'bg-kick-surface border border-kick-border rounded-xl p-6',
                glow ? 'border-glow' : 'hover:border-kick-border/80 transition-colors',
                className,
            ].join(' ')}
            {...props}
        >
            {children}
        </motion.div>
    )
}

export function CardHeader({ title, subtitle, icon, children }: CardHeaderProps) {
    return (
        <div className="flex items-start gap-4 mb-6">
            {icon && (
                <div className="p-2.5 rounded-lg bg-kick-green/10 border border-kick-green/20 shrink-0">
                    {icon}
                </div>
            )}
            <div className="flex-1 min-w-0">
                {title && <h2 className="text-lg font-bold text-kick-white">{title}</h2>}
                {subtitle && <p className="text-sm text-kick-muted mt-0.5">{subtitle}</p>}
            </div>
            {children}
        </div>
    )
}
