import { motion, AnimatePresence } from 'framer-motion'
import Button from './Button'
import Icon from './Icon'

interface ConfirmModalProps {
    isOpen: boolean
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    onConfirm: () => void
    onCancel: () => void
}

export default function ConfirmModal({
    isOpen,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onCancel}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="relative w-full max-w-sm bg-kick-dark border border-kick-border rounded-2xl shadow-2xl overflow-hidden"
                    >
                        <div className="p-5 flex gap-4">
                            <div className="p-2.5 bg-red-500/10 text-red-400 rounded-full h-fit shrink-0">
                                <Icon name="alert" className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-kick-white mb-1.5">{title}</h3>
                                <p className="text-sm text-kick-muted leading-relaxed">{message}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 p-5 pt-0 mt-2">
                            <Button variant="ghost" onClick={onCancel} className="w-full">
                                {cancelText}
                            </Button>
                            <Button variant="danger" onClick={onConfirm} className="w-full">
                                {confirmText}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
