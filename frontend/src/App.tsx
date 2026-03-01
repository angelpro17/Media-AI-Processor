import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import HomePage from './pages/HomePage'
import AudioPage from './pages/AudioPage'
import DocsPage from './pages/DocsPage'
import TranslatePage from './pages/TranslatePage'
import TranscriptionPage from './pages/TranscriptionPage'
import VideoPage from './pages/VideoPage'
import OCRPage from './pages/OCRPage'
import SummarizePage from './pages/SummarizePage'
import PdfEditorPage from './pages/PdfEditorPage'

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route path="audio" element={<AudioPage />} />
                <Route path="video" element={<VideoPage />} />
                <Route path="transcription" element={<TranscriptionPage />} />
                <Route path="docs" element={<DocsPage />} />
                <Route path="ocr" element={<OCRPage />} />
                <Route path="translate" element={<TranslatePage />} />
                <Route path="summarize" element={<SummarizePage />} />
                <Route path="pdf-editor" element={<PdfEditorPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
    )
}
