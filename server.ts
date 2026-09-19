// ─── MIRIV frontend production server ─────────────────────────────────────────
// Sirve el build de Vite (dist/) como estáticos y reenvía /api/* al backend
// Spring Boot (SPRING_BOOT_BACKEND). Mismo patrón que bombona-app/server.ts,
// simplificado: aquí no hay Socket.IO, sólo estáticos + proxy.
//
// VITE_API_BASE_URL queda vacío en producción → todas las llamadas API se
// hacen same-origin y este servidor las reenvía al backend.
//
// PORT por defecto 3000 (desarrollo local); el Dockerfile.prod lo sobreescribe
// a 80 con un sed antes del CMD.

import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = Number(process.env.PORT) || 3000
const SPRING_BOOT_BACKEND = process.env.SPRING_BOOT_BACKEND || 'http://localhost:8080'

const app = express()

// Tamaño de payload generoso por si algún endpoint sube muestras/CSV grandes.
app.use(express.json({ limit: '10mb' }))

// ─── Proxy inverso hacia Spring Boot ────────────────────────────────────────
const proxyToSpringBoot = async (req: any, res: any) => {
  const targetUrl = `${SPRING_BOOT_BACKEND}${req.originalUrl}`
  try {
    const headers = new Headers()
    for (const [key, val] of Object.entries(req.headers)) {
      if (val !== undefined && key !== 'host' && key !== 'connection') {
        if (Array.isArray(val)) {
          val.forEach(v => headers.append(key, v))
        } else {
          headers.append(key, val)
        }
      }
    }

    const fetchOptions: any = { method: req.method, headers }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const bodyStr = JSON.stringify(req.body)
      fetchOptions.body = bodyStr
      headers.set('content-length', String(Buffer.byteLength(bodyStr)))
    }

    const response = await fetch(targetUrl, fetchOptions)

    // Set-Cookie requiere su propia ruta: getSetCookie() devuelve cada
    // cabecera por separado; iterar el Header genérico las une con comas y
    // deja una cookie mal formada (mismo bug que arregló bombona).
    response.headers.getSetCookie().forEach(cookie => res.append('set-cookie', cookie))

    response.headers.forEach((value, name) => {
      if (name === 'content-encoding' || name === 'content-length' || name === 'transfer-encoding' || name === 'set-cookie') return
      res.setHeader(name, value)
    })

    res.status(response.status)
    const bodyText = await response.text()
    res.send(bodyText)
  } catch (err: any) {
    console.error(`Proxy to Spring Boot failed for ${req.method} ${req.originalUrl}:`, err.message)
    if (!res.headersSent) {
      res.status(502).json({ success: false, message: 'Bad Gateway - Backend Spring Boot no disponible' })
    }
  }
}

// Todo lo que llegue bajo /api o /docs (Swagger UI de springdoc) va al backend.
app.all(/^\/(api|docs).*/, proxyToSpringBoot)

// ─── Estáticos del build de Vite ────────────────────────────────────────────
const distDir = path.join(__dirname, 'dist')
app.use(express.static(distDir))

// SPA fallback: cualquier ruta que no sea /api y no exista en dist vuelve a index.html
// para que el routing por hash del frontend funcione al recargar.
app.get(/^(?!\/(api|docs)).*/, (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`>>> MIRIV frontend escuchando en :${PORT} (proxy → ${SPRING_BOOT_BACKEND})`)
})
