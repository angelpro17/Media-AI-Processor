import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Icon from './Icon'

interface DropZoneProps {
    accept?: string
    onFile?: (file: File) => void
    onFiles?: (files: File[]) => void
    multiple?: boolean
    label?: string
    sublabel?: string
    formats?: string[]
    maxMB?: number
    disabled?: boolean
}

export default function DropZone({
    accept,
    onFile,
    onFiles,
    multiple = false,
    label = 'Arrastra tu archivo aquí',
    sublabel = 'o haz clic para seleccionar',
    formats,
    maxMB,
    disabled = false,
}: DropZoneProps) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [dragging, setDragging] = useState(false)
    const [error, setError] = useState('')

    function validate(file: File | undefined): string {
        if (!file) return 'No se encontró ningún archivo.'
        if (maxMB && file.size > maxMB * 1024 * 1024) return `El archivo debe ser menor de ${maxMB} MB.`
        if (accept) {
            const exts = accept.split(',').map(e => e.trim().toLowerCase())
            const fileExt = '.' + file.name.split('.').pop()?.toLowerCase()
            if (!exts.includes(fileExt)) return `Formato no soportado: ${fileExt}`
        }
        return ''
    }

    function handle(files: FileList | null | undefined): void {
        if (!files || files.length === 0) {
            setError('No se encontró ningún archivo.')
            return
        }

        const validFiles: File[] = []
        for (let i = 0; i < files.length; i++) {
            const err = validate(files[i])
            if (err) {
                setError(err)
                return
            }
            validFiles.push(files[i])
        }

        setError('')
        if (multiple && onFiles) {
            onFiles(validFiles)
        } else if (onFile) {
            onFile(validFiles[0])
        }
    }

    return (
        <div>
            <motion.div
                whileHover={!disabled ? { scale: 1.01 } : {}}
                whileTap={!disabled ? { scale: 0.98 } : {}}
                role="button"
                tabIndex={0}
                aria-label="Zona de arrastrar y soltar"
                onClick={() => !disabled && inputRef.current?.click()}
                onKeyDown={e => e.key === 'Enter' && !disabled && inputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); !disabled && setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => {
                    e.preventDefault()
                    setDragging(false)
                    if (!disabled) handle(e.dataTransfer.files)
                }}
                className={[
                    'relative flex flex-col items-center justify-center gap-3',
                    'border-2 border-dashed rounded-xl p-10 cursor-pointer text-center',
                    'transition-colors duration-200',
                    dragging ? 'border-kick-green bg-kick-green/10 shadow-green-sm' : 'border-kick-border hover:border-kick-green/50 hover:bg-kick-green/5',
                    disabled ? 'opacity-40 pointer-events-none' : '',
                ].join(' ')}
            >
                <div className={`p-3 rounded-full border transition-all duration-200 ${dragging ? 'border-kick-green bg-kick-green/20' : 'border-kick-border bg-kick-dark'}`}>
                    <Icon name="upload" className="w-7 h-7 text-kick-green" />
                </div>
                <div>
                    <p className="text-base font-semibold text-kick-white">{label}</p>
                    <p className="text-sm text-kick-muted mt-0.5">{sublabel}</p>
                </div>
                {formats && (
                    <div className="flex flex-wrap gap-1 justify-center">
                        {formats.map(f => (
                            <span key={f} className="px-2 py-0.5 rounded text-xs font-mono bg-kick-dark border border-kick-border text-kick-muted">{f}</span>
                        ))}
                    </div>
                )}
                <input
                    ref={inputRef}
                    type="file"
                    accept={accept}
                    multiple={multiple}
                    className="hidden"
                    onChange={e => handle(e.target.files)}
                />
            </motion.div>
            {
                error && (
                    <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
                        <Icon name="alert" className="w-3.5 h-3.5" />
                        {error}
                    </p>
                )
            }
        </div >
    )
}
