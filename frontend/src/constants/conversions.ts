import { Conversion, AcceptMap } from '@/types/conversion'

export const CONVERSIONS: Conversion[] = [
    { label: 'Word a PDF', inputExt: 'docx', outputExt: 'pdf', inputLabel: 'DOCX', outputLabel: 'PDF' },
    { label: 'PowerPoint a PDF', inputExt: 'pptx', outputExt: 'pdf', inputLabel: 'PPTX', outputLabel: 'PDF' },
    { label: 'Excel a PDF', inputExt: 'xlsx', outputExt: 'pdf', inputLabel: 'XLSX', outputLabel: 'PDF' },
    { label: 'PDF a Word', inputExt: 'pdf', outputExt: 'docx', inputLabel: 'PDF', outputLabel: 'DOCX' },
    { label: 'PDF a Imagen', inputExt: 'pdf', outputExt: 'png', inputLabel: 'PDF', outputLabel: 'PNG' },
    { label: 'Imagen a PDF', inputExt: 'png', outputExt: 'pdf', inputLabel: 'PNG', outputLabel: 'PDF' },
    { label: 'JPG a PDF', inputExt: 'jpg', outputExt: 'pdf', inputLabel: 'JPG', outputLabel: 'PDF' },
]

export const ACCEPT_EXTS: AcceptMap = {
    docx: '.docx,.doc',
    pptx: '.pptx,.ppt',
    xlsx: '.xlsx,.xls',
    pdf: '.pdf',
    png: '.png',
    jpg: '.jpg,.jpeg',
}
