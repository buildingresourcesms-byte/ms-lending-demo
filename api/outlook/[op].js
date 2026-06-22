import auth from './_auth.js'
import callback from './_callback.js'
import calendar from './_calendar.js'
import createEvent from './_create-event.js'
import disconnect from './_disconnect.js'
import messages from './_messages.js'
import send from './_send.js'

/* One Vercel serverless function for every /api/outlook/* route. */
const OPS = { auth, callback, calendar, 'create-event': createEvent, disconnect, messages, send }

export default function handler(req, res) {
  const op = String(req.query?.op || '')
  const fn = OPS[op]
  if (!fn) {
    res.status(404).json({ error: `Unknown outlook route: ${op}` })
    return
  }
  return fn(req, res)
}
