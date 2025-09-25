// Simple header-based auth middleware for demo purposes
// Sets req.userId from 'x-user-id' header. In real apps, replace with JWT/session auth.
module.exports = function auth (req, res, next) {
  const userId = req.header('x-user-id');
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: missing x-user-id header' });
  }
  req.userId = userId;
  next();
};
