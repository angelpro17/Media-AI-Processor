import { NavLink } from 'react-router-dom'
import Icon from '@/components/ui/Icon'
import { NAV_ITEMS } from '@/constants/ui'
import { WaveformIcon } from '@/assets/icons/icons'

export default function Sidebar() {
    return (
        <aside className="w-64 shrink-0 h-screen bg-kick-dark border-r border-kick-border flex flex-col">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-kick-border">
                <div className="p-2 rounded-lg bg-kick-green/10 border border-kick-green/30">
                    <WaveformIcon className="w-5 h-5 text-kick-green" />
                </div>
                <div>
                    <p className="text-sm font-black text-kick-white tracking-wide">AudioClean</p>
                    <p className="text-xs text-kick-muted">Pro Platform</p>
                </div>
            </div>

            <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
                {NAV_ITEMS.map(item => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/'}
                        className={({ isActive }: { isActive: boolean }) => [
                            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                            isActive
                                ? 'bg-kick-green/15 text-kick-green border border-kick-green/25 shadow-green-sm'
                                : 'text-kick-muted hover:text-kick-white hover:bg-kick-surface',
                        ].join(' ')}
                    >
                        <Icon name={item.icon as Parameters<typeof Icon>[0]['name']} className="w-4 h-4 shrink-0" />
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            <div className="px-6 py-4 border-t border-kick-border">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-kick-green animate-pulse-green shrink-0" />
                    <span className="text-xs text-kick-muted">Sin API key · 100% local</span>
                </div>
            </div>
        </aside>
    )
}
