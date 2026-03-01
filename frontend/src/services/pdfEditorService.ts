import api from './api'

export interface PageInfo {
    index: number
    width: number
    height: number
    rotation: number
}

export interface PdfTextBlock {
    x0: number
    y0: number
    x1: number
    y1: number
    text: string
}

export interface PdfSessionInfo {
    session_id: string
    filename: string
    page_count: number
    pages: PageInfo[]
}

export const uploadPdf = async (file: File): Promise<PdfSessionInfo> => {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await api.post('/pdf-editor/upload', formData)
    return data
}

export const getSessionInfo = async (sessionId: string): Promise<PdfSessionInfo> => {
    const { data } = await api.get(`/pdf-editor/info/${sessionId}`)
    return data
}

export const getPageImageUrl = (sessionId: string, page: number, scale = 1.6): string => {
    return `${api.defaults.baseURL}/pdf-editor/page/${sessionId}/${page}?scale=${scale}`
}

export const getThumbnailUrl = (sessionId: string, page: number): string => {
    return `${api.defaults.baseURL}/pdf-editor/thumbnail/${sessionId}/${page}`
}

export const deletePages = async (sessionId: string, pages: number[]): Promise<PdfSessionInfo> => {
    const { data } = await api.post('/pdf-editor/delete', { session_id: sessionId, pages })
    return data
}

export const reorderPages = async (sessionId: string, newOrder: number[]): Promise<PdfSessionInfo> => {
    const { data } = await api.post('/pdf-editor/reorder', { session_id: sessionId, new_order: newOrder })
    return data
}

export const rotatePages = async (sessionId: string, pages: number[], angle: number): Promise<PdfSessionInfo> => {
    const { data } = await api.post('/pdf-editor/rotate', { session_id: sessionId, pages, angle })
    return data
}

export const addText = async (
    sessionId: string,
    page: number,
    text: string,
    x: number,
    y: number,
    fontSize: number = 12,
    color: string = '#000000'
): Promise<PdfSessionInfo> => {
    const { data } = await api.post('/pdf-editor/add-text', {
        session_id: sessionId,
        page,
        text,
        x,
        y,
        font_size: fontSize,
        color
    })
    return data
}

export const addImage = async (
    sessionId: string,
    page: number,
    file: File,
    x: number,
    y: number,
    width: number,
    height: number
): Promise<PdfSessionInfo> => {
    const formData = new FormData()
    formData.append('session_id', sessionId)
    formData.append('page', page.toString())
    formData.append('x', x.toString())
    formData.append('y', y.toString())
    formData.append('width', width.toString())
    formData.append('height', height.toString())
    formData.append('file', file)

    const { data } = await api.post('/pdf-editor/add-image', formData)
    return data
}

export const protectPdf = async (sessionId: string, password: string): Promise<{ session_id: string, protected: boolean }> => {
    const { data } = await api.post('/pdf-editor/protect', { session_id: sessionId, password })
    return data
}

export const getDownloadUrl = (sessionId: string): string => {
    return `${api.defaults.baseURL}/pdf-editor/download/${sessionId}`
}

export const redactArea = async (
    sessionId: string,
    page: number,
    x: number,
    y: number,
    width: number,
    height: number
): Promise<PdfSessionInfo> => {
    const { data } = await api.post('/pdf-editor/redact', {
        session_id: sessionId,
        page,
        x,
        y,
        width,
        height
    })
    return data
}

export const getDownloadDocxUrl = (sessionId: string): string => {
    return `${api.defaults.baseURL}/pdf-editor/download-docx/${sessionId}`
}

export const getPageBlocks = async (sessionId: string, page: number): Promise<PdfTextBlock[]> => {
    const { data } = await api.get(`/pdf-editor/page-blocks/${sessionId}/${page}`)
    return data.blocks
}

export const editTextBlock = async (
    sessionId: string,
    page: number,
    oldX0: number,
    oldY0: number,
    oldX1: number,
    oldY1: number,
    newText: string,
    newX0: number,
    newY0: number,
    fontSize: number,
    color: string
): Promise<PdfSessionInfo> => {
    const { data } = await api.post('/pdf-editor/edit-block', {
        session_id: sessionId,
        page,
        old_x0: oldX0, old_y0: oldY0, old_x1: oldX1, old_y1: oldY1,
        new_text: newText,
        new_x0: newX0, new_y0: newY0,
        font_size: fontSize,
        color
    })
    return data
}
