import { Cloudinary } from '@cloudinary/url-gen'

// Instancia global de Cloudinary para el frontend
// Configurada con tu cloudName (dddihkqvt)
export const cld = new Cloudinary({
    cloud: {
        cloudName: 'dddihkqvt'
    }
})
