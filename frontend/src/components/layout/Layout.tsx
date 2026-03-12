import { useState } from 'react'
import { Outlet, useLocation, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './Sidebar'
import Icon from '@/components/ui/Icon'
import { WaveformIcon } from '@/assets/icons/icons'

export default function Layout() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const location = useLocation()

    return (
        <div className="flex flex-col md:flex-row h-screen bg-kick-black overflow-hidden relative">
            {/* Mobile Header */}
            <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-kick-border bg-kick-dark sticky top-0 z-30">
                <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <div className="p-1.5 rounded-lg bg-kick-green/10 border border-kick-green/30">
                        <WaveformIcon className="w-4 h-4 text-kick-green" />
                    </div>
                    <span className="font-bold text-kick-white text-sm tracking-wide">Media-AI-Processor</span>
                </Link>
                <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="p-1.5 text-kick-muted hover:text-kick-white active:bg-kick-surface rounded-lg transition-colors border border-transparent hover:border-kick-border"
                >
                    <Icon name="menu" className="w-6 h-6" />
                </button>
            </header>

            {/* Overlay for mobile sidebar */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden transition-opacity"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <div className={`
                fixed inset-y-0 left-0 z-50 h-[100dvh] transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
                md:relative md:translate-x-0
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <Sidebar onClose={() => setIsMobileMenuOpen(false)} />
            </div>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto w-full relative">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }}
                        exit={{ opacity: 0, y: -20, transition: { duration: 0.2, ease: 'easeIn' } }}
                        className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8 w-full pb-20 md:pb-8"
                    >
                        <Outlet />
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    )
}
