import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { existsSync } from 'node:fs'
import path from 'node:path'

const readRequestBody = async (req) => {
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks)
  req.rawBody = raw
  const text = raw.toString('utf8')
  if (!text) {
    req.body = {}
    return
  }
  const contentType = String(req.headers['content-type'] || '')
  if (contentType.includes('application/json')) req.body = JSON.parse(text)
  else if (contentType.includes('application/x-www-form-urlencoded')) req.body = Object.fromEntries(new URLSearchParams(text))
  else req.body = text
}

const localServerlessApi = () => ({
  name: 'msl-local-serverless-api',
  configureServer(server) {
    const apiRoot = path.resolve(process.cwd(), 'api')
    server.middlewares.use(async (req, res, next) => {
      const url = new URL(req.url, 'http://localhost')
      if (!url.pathname.startsWith('/api/')) return next()
      const relative = url.pathname.slice('/api/'.length).replace(/^\/+|\/+$/g, '')
      if (!relative || relative.includes('..')) return next()
      const file = path.resolve(apiRoot, `${relative}.js`)
      if (!file.startsWith(apiRoot + path.sep) || !existsSync(file)) return next()

      req.query = Object.fromEntries(url.searchParams.entries())
      req.originalUrl = req.url
      res.status = (code) => {
        res.statusCode = code
        return res
      }
      res.json = (value) => {
        if (!res.hasHeader('Content-Type')) res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify(value))
        return res
      }
      res.send = (value) => {
        if (typeof value === 'object' && value !== null) return res.json(value)
        if (!res.hasHeader('Content-Type')) res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(String(value ?? ''))
        return res
      }

      try {
        await readRequestBody(req)
        const module = await server.ssrLoadModule(file)
        await module.default(req, res)
      } catch (error) {
        server.config.logger.error(error.stack || String(error))
        if (!res.headersSent) res.status(500).json({ error: error.message || String(error) })
        else if (!res.writableEnded) res.end()
      }
    })
  },
})

export default defineConfig(({ mode }) => {
  // The local serverless handlers read the same non-VITE_ environment names
  // used by Vercel. Values remain server-side and are never bundled.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
  return {
    // relative asset paths so the build works on any host (Netlify, GitHub
    // Pages subpaths) and even when opened directly from a folder.
    base: './',
    plugins: [localServerlessApi(), react(), tailwindcss()],
    // honor a harness-assigned PORT when present; otherwise Vite uses 5173
    server: process.env.PORT ? { port: Number(process.env.PORT) } : undefined,
  }
})
