import auth from './_auth.js'
import callback from './_callback.js'
import disconnect from './_disconnect.js'
import messages from './_messages.js'
import send from './_send.js'

/* One Vercel serverless function for every /api/gmail/* route, to stay under
   the platform's per-deploy function limit. Vercel fills req.query.op from the
   [op] segment; the local dev middleware sets it the same way. */
const OPS = { auth, callback, disconnect, messages, send }

export default function handler(req, res) {
  const op = String(req.query?.op || '')
  const fn = OPS[op]
  if (!fn) {
    res.status(404).json({ error: `Unknown gmail route: ${op}` })
    return
  }
  return fn(req, res)
}
