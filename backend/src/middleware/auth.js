import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  // Opt-in: browsers (Safari especially) drop Secure cookies over plain
  // http://localhost, which is the default self-hosted setup. Set
  // COOKIE_SECURE=true when serving behind HTTPS.
  secure: process.env.COOKIE_SECURE === 'true',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};
