const Tokens = require('csrf');
const tokens = new Tokens();

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

function csrfMiddleware(req, res, next) {
  // Skip CSRF in test mode — tests can add dedicated CSRF tests separately
  if (process.env.NODE_ENV === 'test') {
    res.locals.csrfToken = 'test-csrf-token';
    return next();
  }

  // Ensure secret exists in session
  if (!req.session.csrfSecret) {
    req.session.csrfSecret = tokens.secretSync();
  }

  // For safe methods: generate token and expose it
  if (SAFE_METHODS.includes(req.method)) {
    res.locals.csrfToken = tokens.create(req.session.csrfSecret);
    return next();
  }

  // For state-changing methods: validate token
  const token = req.body?._csrf || req.query?._csrf || req.headers['csrf-token'] || req.headers['xsrf-token'] || req.headers['x-csrf-token'];

  if (!token || !tokens.verify(req.session.csrfSecret, token)) {
    console.error('[CSRF] Invalid token for %s %s', req.method, req.originalUrl);
    return res.status(403).render('error', {
      message: 'Token de seguridad inválido. Recargá la página e intentá de nuevo.',
      error: {}
    });
  }

  next();
}

module.exports = csrfMiddleware;
