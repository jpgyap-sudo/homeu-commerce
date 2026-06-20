export function requireAdmin(req, res, next) {
  const key = req.header('x-admin-api-key');
  if (!process.env.ADMIN_API_KEY || key !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
