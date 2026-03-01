import { useState, useRef } from 'react'
import { Helmet } from 'react-helmet-async'
import {
    PdfSessionInfo, PdfTextBlock, uploadPdf, getPageImageUrl, getThumbnailUrl,
    deletePages, reorderPages, rotatePages, getDownloadUrl,
    addText, addImage, protectPdf, redactArea,
    getPageBlocks, editTextBlock
} from '@/services/pdfEditorService'
import Card, { CardHeader } from '@/components/ui/Card'
import Icon from '@/components/ui/Icon'
import DropZone from '@/components/ui/DropZone'
import Button from '@/components/ui/Button'

export default function PdfEditorPage() {
    const [session, setSession] = useState<PdfSessionInfo | null>(null)
    const [loading, setLoading] = useState(false)
    const [activePage, setActivePage] = useState<number>(0)
    const [error, setError] = useState('')
    const [renderKey, setRenderKey] = useState(0)
    type ToolMode = 'none' | 'text' | 'image' | 'redact'
    const [toolMode, setToolMode] = useState<ToolMode>('none')
    const [interactPos, setInteractPos] = useState<{ x: number, y: number, w?: number, h?: number } | null>(null)
    const [dragStart, setDragStart] = useState<{ x: number, y: number } | null>(null)
    const [blocks, setBlocks] = useState<PdfTextBlock[]>([])
    const [editingState, setEditingState] = useState<{
        block: PdfTextBlock;
        text: string;
        currentBoxX: number;
        currentBoxY: number;
        w: number;
        h: number;
        fontSize: number;
        color: string;
    } | null>(null);
    const [blockDrag, setBlockDrag] = useState<{ startX: number, startY: number, origBoxX: number, origBoxY: number } | null>(null);

    const [showProtectModal, setShowProtectModal] = useState(false)

    const loadBlocks = async (sess: PdfSessionInfo, page: number) => {
        try {
            const fetched = await getPageBlocks(sess.session_id, page)
            setBlocks(fetched)
        } catch {
            setBlocks([])
        }
    }

    const refreshImages = (newSession: PdfSessionInfo, newPage?: number) => {
        const p = newPage !== undefined ? newPage : activePage
        setSession(newSession)
        setRenderKey(Date.now())
        loadBlocks(newSession, p)
    }

    const handlePageChange = (idx: number) => {
        setActivePage(idx)
        if (session) {
            loadBlocks(session, idx)
        }
    }

    const handleUpload = async (file: File) => {
        setLoading(true)
        setError('')
        try {
            const info = await uploadPdf(file)
            setSession(info)
            setActivePage(0)
            setRenderKey(Date.now())
            loadBlocks(info, 0)
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Error al subir PDF.')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!session) return
        if (!confirm('¿Eliminar la página seleccionada?')) return
        setLoading(true)
        try {
            const info = await deletePages(session.session_id, [activePage])
            setActivePage(Math.min(activePage, info.page_count - 1))
            refreshImages(info)
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'No se pudo eliminar.')
        } finally {
            setLoading(false)
        }
    }

    const handleRotate = async () => {
        if (!session) return
        setLoading(true)
        try {
            const info = await rotatePages(session.session_id, [activePage], 90)
            refreshImages(info)
        } catch (err) {
            setError('Error al rotar.')
        } finally {
            setLoading(false)
        }
    }

    const dragItem = useRef<number | null>(null)
    const dragOverItem = useRef<number | null>(null)

    const handleDragStart = (_e: React.DragEvent, position: number) => {
        dragItem.current = position
    }

    const handleDragEnter = (_e: React.DragEvent, position: number) => {
        dragOverItem.current = position
    }

    const handleDragEnd = async () => {
        if (!session || dragItem.current === null || dragOverItem.current === null) return
        if (dragItem.current === dragOverItem.current) return

        const newOrder = session.pages.map(p => p.index)
        const draggedIdx = newOrder.splice(dragItem.current, 1)[0]
        newOrder.splice(dragOverItem.current, 0, draggedIdx)

        dragItem.current = null
        dragOverItem.current = null

        setLoading(true)
        try {
            const info = await reorderPages(session.session_id, newOrder)
            refreshImages(info)
            setActivePage(newOrder.indexOf(draggedIdx))
        } catch (err) {
            setError('Error al reordenar.')
        } finally {
            setLoading(false)
        }
    }

    const handleImagePointerDown = (e: React.PointerEvent<HTMLImageElement>) => {
        if (toolMode === 'none') return;
        const img = e.currentTarget;
        const rect = img.getBoundingClientRect();
        const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
        const yPercent = ((e.clientY - rect.top) / rect.height) * 100;

        if (toolMode === 'redact') {
            setDragStart({ x: xPercent, y: yPercent });
            setInteractPos({ x: xPercent, y: yPercent, w: 0, h: 0 });
            e.currentTarget.setPointerCapture(e.pointerId);
        } else {
            setInteractPos({ x: xPercent, y: yPercent });
            if (toolMode === 'text') {
                setTimeout(() => document.getElementById('floating-text-input')?.focus(), 50);
            } else if (toolMode === 'image') {
                document.getElementById('floating-image-input')?.click();
            }
        }
    }

    const handleImagePointerMove = (e: React.PointerEvent<HTMLImageElement>) => {
        if (toolMode === 'redact' && dragStart) {
            const img = e.currentTarget;
            const rect = img.getBoundingClientRect();
            const currX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
            const currY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

            setInteractPos({
                x: Math.min(dragStart.x, currX),
                y: Math.min(dragStart.y, currY),
                w: Math.abs(currX - dragStart.x),
                h: Math.abs(currY - dragStart.y)
            });
        }
    }

    const handleImagePointerUp = async (e: React.PointerEvent<HTMLImageElement>) => {
        if (toolMode === 'redact' && dragStart && interactPos && interactPos.w! > 1) {
            e.currentTarget.releasePointerCapture(e.pointerId);
            const page = session!.pages[activePage]
            const pdfX = (interactPos.x / 100) * page.width;
            const pdfY = (interactPos.y / 100) * page.height;
            const pdfW = (interactPos.w! / 100) * page.width;
            const pdfH = (interactPos.h! / 100) * page.height;

            setToolMode('none');
            setDragStart(null);
            setInteractPos(null);
            setLoading(true);

            try {
                const info = await redactArea(session!.session_id, activePage, pdfX, pdfY, pdfW, pdfH);
                refreshImages(info);
            } catch (err) {
                setError('Error al tapar contenido.');
            } finally {
                setLoading(false);
            }
        } else if (toolMode === 'redact') {
            setDragStart(null);
            setInteractPos(null);
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
    }

    const handleTextSubmit = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && interactPos) {
            const text = e.currentTarget.value;
            if (!text.trim()) {
                setInteractPos(null);
                setToolMode('none');
                return;
            }
            const page = session!.pages[activePage]
            const pdfX = (interactPos.x / 100) * page.width;
            const pdfY = (interactPos.y / 100) * page.height + 14;

            setToolMode('none');
            setInteractPos(null);
            setLoading(true);
            try {
                const info = await addText(session!.session_id, activePage, text, pdfX, pdfY, 14, '#000000');
                refreshImages(info);
            } catch (err) {
                setError('Error al agregar texto.');
            } finally {
                setLoading(false);
            }
        } else if (e.key === 'Escape') {
            setInteractPos(null);
            setToolMode('none');
        }
    }

    const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.currentTarget.files?.[0];
        if (!file || !interactPos) return;

        const page = session!.pages[activePage]
        const pdfX = (interactPos.x / 100) * page.width;
        const pdfY = (interactPos.y / 100) * page.height;
        const pdfW = 150;
        const pdfH = 150;

        setToolMode('none');
        setInteractPos(null);
        setLoading(true);
        e.currentTarget.value = '';
        try {
            const info = await addImage(session!.session_id, activePage, file, pdfX, pdfY, pdfW, pdfH);
            refreshImages(info);
        } catch (err) {
            setError('Error al agregar imagen.');
        } finally {
            setLoading(false);
        }
    }

    const handleBlockEditConfirm = async () => {
        if (!editingState) return;
        setLoading(true);
        const page = session!.pages[activePage];
        const newX0 = (editingState.currentBoxX / 100) * page.width;
        const newY0 = (editingState.currentBoxY / 100) * page.height;

        try {
            const info = await editTextBlock(
                session!.session_id,
                activePage,
                editingState.block.x0,
                editingState.block.y0,
                editingState.block.x1,
                editingState.block.y1,
                editingState.text,
                newX0,
                newY0,
                editingState.fontSize,
                editingState.color
            );
            setEditingState(null);
            refreshImages(info);
        } catch (err) {
            setError('Error al editar el bloque.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex flex-col gap-6 h-[calc(100vh-8rem)]">
            <Helmet>
                <title>Editor PDF Profesional — Media-AI-Processor</title>
                <meta name="description" content="Edita PDFs visualmente: elimina, rota, reordena, agrega texto y protege con contraseña." />
            </Helmet>

            {!session ? (
                <div className="max-w-2xl mx-auto w-full animate-fade-up">
                    <Card>
                        <CardHeader
                            title="Editor PDF Profesional"
                            subtitle="Sube un archivo para comenzar a editar (máx 50 MB)"
                            icon={<Icon name="pdf" className="w-5 h-5 text-kick-green" />}
                        />
                        <DropZone accept=".pdf" onFile={handleUpload} formats={['PDF']} maxMB={50} disabled={loading} />
                        {error && <p className="text-red-400 text-sm mt-4 text-center">{error}</p>}
                    </Card>
                </div>
            ) : (
                <div className="flex flex-col h-full bg-black border border-kick-border rounded-xl overflow-hidden animate-fade-in">
                    {/* TOOLBAR */}
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between px-4 py-3 bg-kick-dark border-b border-kick-border gap-3">
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-semibold truncate max-w-[200px]">{session.filename}</span>
                            <span className="text-xs text-kick-muted bg-black px-2 py-1 rounded">
                                Pág {activePage + 1} de {session.page_count}
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <Button variant="ghost" size="sm" icon="scissors" disabled={loading} onClick={handleDelete} title="Eliminar página actual">Eliminar</Button>
                            <Button variant="ghost" size="sm" onClick={handleRotate} disabled={loading} title="Rotar 90°"><Icon name="arrows" className="w-4 h-4 rotate-90" /> Rotar</Button>
                            <div className="w-px h-6 bg-kick-border mx-1 hidden sm:block" />
                            <Button variant={toolMode === 'redact' ? 'primary' : 'ghost'} size="sm" icon="x" disabled={loading} onClick={() => { setToolMode(m => m === 'redact' ? 'none' : 'redact'); setInteractPos(null); setEditingState(null); }} title="Borrar (Dibuja un rectángulo en el PDF)">🧽 Dibujar Borrado</Button>
                            <Button variant={toolMode === 'text' ? 'primary' : 'ghost'} size="sm" icon="document" disabled={loading} onClick={() => { setToolMode(m => m === 'text' ? 'none' : 'text'); setInteractPos(null); setEditingState(null); }} title="Agregar Texto (Haz clic en el PDF)">+ Texto</Button>
                            <Button variant={toolMode === 'image' ? 'primary' : 'ghost'} size="sm" icon="image" disabled={loading} onClick={() => { setToolMode(m => m === 'image' ? 'none' : 'image'); setInteractPos(null); setEditingState(null); }} title="Agregar Imagen (Haz clic en el PDF)">+ Imagen</Button>
                            <Button variant="ghost" size="sm" icon="alert" disabled={loading} onClick={() => setShowProtectModal(true)}>Proteger</Button>

                            <Button variant="primary" size="sm" icon="download" onClick={() => window.open(getDownloadUrl(session.session_id), '_blank')}>
                                Descargar PDF
                            </Button>
                            <Button variant="outline" size="sm" icon="x" onClick={() => setSession(null)}>Cerrar</Button>
                        </div>
                    </div>

                    <div className="flex flex-1 overflow-hidden">
                        {/* THUMBNAILS PANEL */}
                        <div className="w-48 xl:w-56 shrink-0 bg-kick-dark border-r border-kick-border overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
                            {session.pages.map((p, i) => (
                                <div
                                    key={`${p.index}-${renderKey}`}
                                    className={`shrink-0 relative rounded-xl border-2 transition-all cursor-pointer overflow-hidden ${activePage === i ? 'border-kick-green' : 'border-kick-border hover:border-kick-green/50'}`}
                                    onClick={() => handlePageChange(i)}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, i)}
                                    onDragEnter={(e) => handleDragEnter(e, i)}
                                    onDragEnd={handleDragEnd}
                                    onDragOver={(e) => e.preventDefault()}
                                >
                                    <div className="absolute top-1 left-1 bg-black/80 text-[10px] px-1.5 py-0.5 rounded backdrop-blur">
                                        {i + 1}
                                    </div>
                                    <img
                                        src={getThumbnailUrl(session.session_id, i) + `?v=${renderKey}`}
                                        alt={`Página ${i + 1}`}
                                        className="w-full h-auto bg-white pointer-events-none"
                                        loading="lazy"
                                    />
                                </div>
                            ))}
                        </div>

                        {/* MAIN PREVIEW */}
                        <div className="flex-1 bg-black p-6 overflow-auto custom-scrollbar flex items-center justify-center relative">
                            {loading && (
                                <div className="absolute inset-0 z-10 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                                    <Icon name="spinner" className="w-8 h-8 text-kick-green animate-spin" />
                                </div>
                            )}

                            <div className="relative inline-block max-w-full shadow-2xl">
                                <img
                                    src={getPageImageUrl(session.session_id, activePage) + `&v=${renderKey}`}
                                    alt="Vista completa"
                                    className={`max-w-full max-h-[800px] object-contain bg-white rounded block select-none border border-transparent transition-all ${toolMode !== 'none' ? 'cursor-crosshair border-kick-green/50 ring-2 ring-kick-green/30' : ''}`}
                                    draggable={false}
                                    onPointerDown={handleImagePointerDown}
                                    onPointerMove={handleImagePointerMove}
                                    onPointerUp={handleImagePointerUp}
                                />

                                {toolMode === 'text' && interactPos && (
                                    <input
                                        id="floating-text-input"
                                        type="text"
                                        className="absolute bg-white/95 border border-kick-green text-black font-semibold px-2 py-1 text-sm outline-none w-64 shadow-2xl z-20 rounded shadow-kick-green/20"
                                        style={{ left: `${interactPos.x}%`, top: `${interactPos.y}%`, transform: 'translate(-0%, -50%)' }}
                                        placeholder="Escribe el texto y presiona Enter"
                                        onKeyDown={handleTextSubmit}
                                        onBlur={() => { setInteractPos(null); setToolMode('none') }}
                                        autoComplete="off"
                                    />
                                )}

                                {toolMode === 'redact' && interactPos && interactPos.w! > 0 && (
                                    <div
                                        className="absolute border-2 border-red-500 bg-black/60 backdrop-blur-sm pointer-events-none z-20 shadow-2xl"
                                        style={{
                                            left: `${interactPos.x}%`,
                                            top: `${interactPos.y}%`,
                                            width: `${interactPos.w}%`,
                                            height: `${interactPos.h}%`
                                        }}
                                    >
                                        <div className="w-full h-full flex items-center justify-center text-red-500 font-bold opacity-80 uppercase text-xs">Eliminando</div>
                                    </div>
                                )}

                                {toolMode === 'none' && !editingState && blocks.map((block, idx) => {
                                    const page = session.pages[activePage]
                                    const left = (block.x0 / page.width) * 100
                                    const top = (block.y0 / page.height) * 100
                                    const w = ((block.x1 - block.x0) / page.width) * 100
                                    const h = ((block.y1 - block.y0) / page.height) * 100

                                    return (
                                        <div
                                            key={`block-${idx}`}
                                            className="absolute border border-transparent hover:border-kick-green/50 hover:bg-kick-green/10 cursor-text transition-colors z-10"
                                            style={{
                                                left: `${left}%`,
                                                top: `${top}%`,
                                                width: `${w}%`,
                                                height: `${h}%`
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingState({
                                                    block,
                                                    text: block.text,
                                                    currentBoxX: left,
                                                    currentBoxY: top,
                                                    w: w,
                                                    h: h,
                                                    fontSize: 14,
                                                    color: '#000000'
                                                });
                                            }}
                                            title="Clic para editar bloque de texto"
                                        />
                                    )
                                })}

                                {editingState && (() => {
                                    return (
                                        <div
                                            className="absolute z-40 shadow-2xl bg-white border border-kick-border rounded overflow-hidden flex flex-col"
                                            style={{
                                                left: `${editingState.currentBoxX}%`,
                                                top: `${editingState.currentBoxY}%`,
                                                width: `max(320px, ${editingState.w}%)`
                                            }}
                                        >
                                            <div
                                                className="w-full h-8 bg-kick-dark flex items-center justify-between px-3 cursor-move select-none"
                                                onPointerDown={(e) => {
                                                    const rect = e.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
                                                    if (!rect) return;
                                                    setBlockDrag({
                                                        startX: ((e.clientX - rect.left) / rect.width) * 100,
                                                        startY: ((e.clientY - rect.top) / rect.height) * 100,
                                                        origBoxX: editingState.currentBoxX,
                                                        origBoxY: editingState.currentBoxY
                                                    });
                                                    e.currentTarget.setPointerCapture(e.pointerId);
                                                }}
                                                onPointerMove={(e) => {
                                                    if (!blockDrag) return;
                                                    const rect = e.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
                                                    if (!rect) return;
                                                    const currX = ((e.clientX - rect.left) / rect.width) * 100;
                                                    const currY = ((e.clientY - rect.top) / rect.height) * 100;
                                                    setEditingState(s => ({
                                                        ...s!,
                                                        currentBoxX: blockDrag.origBoxX + (currX - blockDrag.startX),
                                                        currentBoxY: blockDrag.origBoxY + (currY - blockDrag.startY)
                                                    }));
                                                }}
                                                onPointerUp={(e) => {
                                                    setBlockDrag(null);
                                                    e.currentTarget.releasePointerCapture(e.pointerId);
                                                }}
                                            >
                                                <div className="flex items-center gap-1.5 text-kick-muted">
                                                    <Icon name="arrows" className="w-3 h-3" />
                                                    <span className="text-[10px] uppercase font-bold tracking-wider relative top-px">Mover</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <input type="color" value={editingState.color} onChange={(e) => setEditingState(s => ({ ...s!, color: e.target.value }))} className="w-5 h-5 p-0 border-0 rounded cursor-pointer" title="Color" />
                                                    <div className="flex items-center gap-1 bg-black px-1 py-0.5 rounded border border-kick-border" title="Tamaño de fuente">
                                                        <span className="text-[10px] text-kick-muted">Tt</span>
                                                        <input type="number" value={editingState.fontSize} onChange={(e) => setEditingState(s => ({ ...s!, fontSize: Number(e.target.value) }))} className="w-10 text-xs bg-transparent text-white text-center outline-none" min={5} max={100} />
                                                    </div>
                                                </div>
                                            </div>
                                            <textarea
                                                autoFocus
                                                className="w-full text-black outline-none p-3 resize-y font-sans leading-relaxed"
                                                style={{ fontSize: `${editingState.fontSize}px`, color: editingState.color, minHeight: '80px' }}
                                                value={editingState.text}
                                                onChange={(e) => setEditingState(s => ({ ...s!, text: e.target.value }))}
                                                onKeyDown={(e) => {
                                                    if (!e.shiftKey && e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleBlockEditConfirm();
                                                    } else if (e.key === 'Escape') {
                                                        setEditingState(null);
                                                    }
                                                }}
                                                placeholder="Escribe aquí..."
                                            />
                                            <div className="bg-gray-100 px-3 py-2 flex justify-end gap-2 border-t border-gray-200">
                                                <Button variant="ghost" size="sm" onClick={() => setEditingState(null)}>Cancelar</Button>
                                                <Button variant="primary" size="sm" onClick={handleBlockEditConfirm}>Guardar <Icon name="check" className="w-4 h-4 ml-1" /></Button>
                                            </div>
                                        </div>
                                    )
                                })()}

                                <input
                                    type="file"
                                    id="floating-image-input"
                                    className="hidden"
                                    accept="image/png, image/jpeg"
                                    onChange={handleImageFile}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODALS REEMPLAZADOS POR INTERACCIÓN DIRECTA. MANTENEMOS SOLO PROTEGER */}

            {/* PROTECT MODAL */}
            {showProtectModal && session && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <Card glow className="w-full max-w-sm relative pt-12 border-orange-500/30">
                        <Button variant="ghost" size="sm" icon="x" className="absolute top-4 right-4" onClick={() => setShowProtectModal(false)} />
                        <CardHeader title="Proteger PDF" subtitle="Añadir contraseña" icon={<Icon name="alert" className="w-5 h-5 text-orange-400" />} />
                        <form onSubmit={async (e) => {
                            e.preventDefault()
                            const formData = new FormData(e.currentTarget)
                            const password = formData.get('password') as string
                            setLoading(true)
                            try {
                                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                await protectPdf(session.session_id, password)
                                setShowProtectModal(false)
                                alert('PDF protegido exitosamente. Descarga el archivo para verificar.')
                            } catch (err) {
                                setError('Error al proteger PDF.')
                            } finally {
                                setLoading(false)
                            }
                        }} className="flex flex-col gap-4">
                            <div>
                                <label className="text-xs text-kick-muted uppercase tracking-wider font-bold mb-1 block">Contraseña</label>
                                <input name="password" type="password" required className="w-full bg-black border border-kick-border rounded-lg p-3 text-kick-white focus:border-kick-green outline-none" placeholder="Ingresa contraseña..." />
                                <p className="text-[10px] text-kick-muted mt-2">Nota: Una vez protegido, no podrás editarlo más en esta sesión.</p>
                            </div>
                            <Button type="submit" size="lg" disabled={loading} className="mt-2 w-full !bg-orange-500 hover:!bg-orange-400 !text-black border-none">Aplicar Protección</Button>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    )
}
