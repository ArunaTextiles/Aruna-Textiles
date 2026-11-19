export const runtime = 'nodejs'
import { handle, json } from '../_cors.js'
import { currentUser } from '../../server/src/db.js'

// GET /api/auth/verify — check a customer JWT (Authorization: Bearer <token>)
export default handle(async (req) => {
  const user = await currentUser(req)
  return json({ valid: !!user, user })
})
