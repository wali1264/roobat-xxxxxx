import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to enforce API Secret Authentication on EA endpoints (/api/v1/ea/*)
 */
export function validateEaAuth(req: Request, res: Response, next: NextFunction) {
  const configuredSecret = process.env.EA_API_SECRET || 'smart_ea_secret_key_2026';

  // Read secret from headers: X-EA-Secret or Authorization: Bearer <secret>
  const headerSecret = req.headers['x-ea-secret'] as string;
  const authHeader = req.headers['authorization'] as string;

  let providedSecret = headerSecret;
  if (!providedSecret && authHeader && authHeader.startsWith('Bearer ')) {
    providedSecret = authHeader.substring(7).trim();
  }

  if (!providedSecret || providedSecret !== configuredSecret) {
    return res.status(401).json({
      error: 'Unauthorized EA Client',
      details: 'Missing or invalid EA_API_SECRET header'
    });
  }

  next();
}
