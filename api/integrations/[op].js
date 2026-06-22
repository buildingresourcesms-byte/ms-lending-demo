import action from './_action.js'
import auth from './_auth.js'
import callback from './_callback.js'
import disconnect from './_disconnect.js'
import status from './_status.js'

/* One Vercel serverless function for /api/integrations/{status,auth,callback,
   action,disconnect}. The webhook route stays its own function (it needs raw,
   unparsed bodies for signature verification). */
const OPS = { action, auth, callback, disconnect, status }

export default function handler(req, res) {
  const op = String(req.query?.op || '')
  const fn = OPS[op]
  if (!fn) {
    res.status(404).json({ error: `Unknown integrations route: ${op}` })
    return
  }
  return fn(req, res)
}
