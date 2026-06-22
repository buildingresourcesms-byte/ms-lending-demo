import { connector } from '../_connector-registry.js'
import { deliverIntegrationEvent, normalizeIntegrationEvent, verifyWebhook } from '../_integration-events.js'

export const config = { api: { bodyParser: false } }

const readWebhookBody = async (req) => {
  let raw
  if (req.rawBody) raw = Buffer.from(req.rawBody)
  else if (req.body != null) raw = Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body))
  else {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    raw = Buffer.concat(chunks)
  }
  const text = raw.toString('utf8')
  const contentType = String(req.headers['content-type'] || '')
  let body = {}
  if (contentType.includes('application/json')) body = text ? JSON.parse(text) : {}
  else if (contentType.includes('application/x-www-form-urlencoded')) body = Object.fromEntries(new URLSearchParams(text))
  else body = req.body && typeof req.body === 'object' ? req.body : { raw: text }
  return { raw, body }
}

export default async function handler(req, res) {
  const provider = String(req.query.provider || '')
  const definition = connector(provider)
  if (!definition?.webhook) return res.status(404).json({ error: 'Webhook connector not found' })

  if (req.method === 'GET' && (provider === 'facebook' || provider === 'instagram')) {
    if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === process.env.META_VERIFY_TOKEN) {
      res.setHeader('Content-Type', 'text/plain')
      return res.status(200).send(String(req.query['hub.challenge'] || ''))
    }
    return res.status(403).send('Webhook verification failed')
  }
  if (req.method === 'GET' && provider === 'dropbox') {
    res.setHeader('Content-Type', 'text/plain')
    return res.status(200).send(String(req.query.challenge || ''))
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { raw, body } = await readWebhookBody(req)
  if (!verifyWebhook(req, provider, raw, body)) return res.status(401).json({ error: 'Invalid webhook signature' })
  try {
    const event = normalizeIntegrationEvent(provider, body, req.headers)
    const delivery = await deliverIntegrationEvent(event)
    res.status(202).json({ ok: true, provider, eventId: event.externalId, delivered: delivery.delivered })
  } catch (error) {
    res.status(502).json({ error: error.message || String(error) })
  }
}
