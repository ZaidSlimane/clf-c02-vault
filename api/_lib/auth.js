import jwt from 'jsonwebtoken'

export function getUser(authorizationHeader) {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) return null
  try {
    return jwt.verify(authorizationHeader.slice(7), process.env.JWT_SECRET, { algorithms: ['HS256'] })
  } catch {
    return null
  }
}
