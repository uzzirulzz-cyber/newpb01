import type { Request, Response } from 'express';
import app from '../server';

export default (req: Request, res: Response) => {
  const incomingUrl = new URL(req.url || '/', 'http://localhost');
  const originalPath = incomingUrl.searchParams.get('__path');
  if (!originalPath?.startsWith('/api/')) {
    return res.status(400).json({ success: false, error: 'Invalid API route.' });
  }

  incomingUrl.searchParams.delete('__path');
  req.url = `${originalPath}${incomingUrl.search}`;
  return app(req, res);
};
