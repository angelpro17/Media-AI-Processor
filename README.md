# Media-AI-Processor

Media-AI-Processor es una plataforma integral de inteligencia artificial alojada localmente, diseñada para procesar, mejorar y transformar diversos tipos de medios y documentos sin requerir conexión a internet ni claves de API externas.

## Funcionalidades Principales

*   **Mejora de Audio:** Reducción de ruido de fondo y limpieza de audio con calidad profesional utilizando DeepFilterNet3.
*   **Transcripción y Subtítulos (STT):** Transcripción de alta precisión de audio y video con generación automática de subtítulos (SRT y VTT) utilizando OpenAI Whisper.
*   **Traducción de Documentos:** Traducción automática contextual de texto, documentos Word (DOCX) y PDF mediante los modelos Helsinki-NLP MarianMT.
*   **Reconocimiento Óptico de Caracteres (OCR):** Extracción de texto a partir de imágenes y documentos escaneados utilizando EasyOCR.
*   **Resumen de Textos:** Síntesis automatizada de textos extensos y documentos utilizando el modelo BART Large CNN.
*   **Conversión de Documentos:** Utilidades locales para la conversión de formatos (ej. PDF a DOCX) y manipulación de archivos.

## Arquitectura Técnica

La plataforma opera bajo una arquitectura cliente-servidor estructurada:

*   **Frontend:** Desarrollado con React, TypeScript y Vite. Implementa un diseño responsivo (mobile-first) con una interfaz de usuario fluida y moderna utilizando Tailwind CSS.
*   **Backend:** Impulsado por FastAPI (Python), encargado de gestionar las tareas de inferencia de inteligencia artificial de forma estructurada e integración directa de modelos.
*   **Modelos de IA:** Utiliza modelos de código abierto de vanguardia optimizados para ejecución local en CPU/GPU (integrados a través de PyTorch y Hugging Face Transformers).

## Requisitos Previos

*   Python 3.8 o superior (Se recomienda Anaconda/Miniconda)
*   Node.js 18 o superior
*   FFmpeg (Requerido en la variable de entorno PATH para el procesamiento de audio y video)

## Instalación y Ejecución

### Backend

1. Navegar al directorio del backend localizado en la raíz del proyecto:
   ```bash
   cd backend
   ```
2. Instalar las dependencias requeridas (se aconseja utilizar un entorno virtual dedicado):
   ```bash
   pip install -r requirements.txt
   ```
3. Iniciar el servidor FastAPI:
   ```bash
   python -m uvicorn main:app --host 0.0.0.0 --port 8000
   ```

### Frontend

1. Navegar al directorio del frontend:
   ```bash
   cd frontend
   ```
2. Instalar las dependencias de Node:
   ```bash
   npm install
   ```
3. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```

## Uso

Una vez que ambos servidores estén en ejecución, acceda a la interfaz web a través de `http://localhost:5173` (o el puerto específico que la terminal asigne, como el 5174). La plataforma es completamente autónoma y privada; todo el procesamiento se realiza y procesa localmente en su máquina.
