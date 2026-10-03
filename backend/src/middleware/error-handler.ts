import type { ErrorRequestHandler, RequestHandler } from 'express';
import { HttpError } from '../utils/http-error.js';

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan.' });
};

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.status).json({ success: false, message: error.message });
    return;
  }

  const status = typeof error === 'object' && error !== null && 'status' in error
    && typeof error.status === 'number' ? error.status : 500;

  if (status === 400) {
    res.status(400).json({ success: false, message: 'Format permintaan tidak valid.' });
    return;
  }

  if (status === 413) {
    res.status(413).json({ success: false, message: 'Ukuran permintaan terlalu besar.' });
    return;
  }

  console.error('Terjadi kesalahan pada server.', error);
  res.status(500).json({ success: false, message: 'Terjadi kesalahan pada sistem.' });
};
