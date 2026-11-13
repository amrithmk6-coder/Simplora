import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import {
  DocumentExtractionError,
  extractDocumentContent,
} from './src/server/documentExtractor';
import {
  chatWithDocumentGemini,
  explainTermsWithGemini,
  GeminiServiceError,
  generateSmartSummaryWithGemini,
  simplifyTextWithGemini,
} from './src/server/geminiService';
import { isMissingApiKeyValue } from './src/utils/simplifierLogic';
import { MAX_FILE_SIZE_BYTES } from './src/utils/workspaceLogic';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
});

export function createApp() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      aiConfigured: !isMissingApiKeyValue(process.env.GEMINI_API_KEY),
    });
  });

  app.post(
    '/api/extract-document',
    (req: Request, res: Response, next: NextFunction) => {
      upload.single('file')(req, res, (err: unknown) => {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            res.status(400).json({
              error: 'File exceeds the 10.00 MB upload limit.',
              code: 'FILE_TOO_LARGE',
            });
            return;
          }
          res.status(400).json({
            error: err.message,
            code: 'UPLOAD_ERROR',
          });
          return;
        }
        if (err) {
          next(err);
          return;
        }
        next();
      });
    },
    async (req: Request, res: Response) => {
      if (!req.file) {
        res.status(400).json({
          error: 'No file was uploaded. Please choose a PDF or TXT document.',
          code: 'MISSING_FILE',
        });
        return;
      }

      try {
        const result = await extractDocumentContent({
          originalname: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
          buffer: req.file.buffer,
        });
        res.json(result);
      } catch (error) {
        if (error instanceof DocumentExtractionError) {
          res.status(error.status).json({
            error: error.message,
            code: error.code,
          });
          return;
        }
        res.status(500).json({
          error: 'An unexpected error occurred while extracting text from the document.',
          code: 'INTERNAL_EXTRACTION_ERROR',
        });
      }
    }
  );

  app.post('/api/simplify', async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as {
      text?: unknown;
      mode?: unknown;
      preserveTechnicalTerms?: boolean;
      includeKeyTakeaways?: boolean;
    };

    try {
      const result = await simplifyTextWithGemini({
        text: body.text as string,
        mode: body.mode as never,
        preserveTechnicalTerms: body.preserveTechnicalTerms,
        includeKeyTakeaways: body.includeKeyTakeaways,
      });
      res.json(result);
    } catch (error) {
      if (error instanceof GeminiServiceError) {
        res.status(error.status).json({
          error: error.message,
          code: error.code,
        });
        return;
      }
      res.status(500).json({
        error: 'An unexpected error occurred while simplifying text.',
        code: 'INTERNAL_SIMPLIFY_ERROR',
      });
    }
  });

  app.post('/api/summarize', async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as {
      text?: unknown;
      format?: unknown;
    };

    try {
      const result = await generateSmartSummaryWithGemini({
        text: body.text as string,
        format: body.format as never,
      });
      res.json(result);
    } catch (error) {
      if (error instanceof GeminiServiceError) {
        res.status(error.status).json({
          error: error.message,
          code: error.code,
        });
        return;
      }
      res.status(500).json({
        error: 'An unexpected error occurred while generating the document summary.',
        code: 'INTERNAL_SUMMARY_ERROR',
      });
    }
  });

  app.post('/api/explain-terms', async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as {
      mode?: unknown;
      text?: unknown;
      searchTerm?: unknown;
      domainContext?: unknown;
    };

    try {
      const result = await explainTermsWithGemini({
        mode: body.mode as 'identify' | 'search',
        text: body.text as string | undefined,
        searchTerm: body.searchTerm as string | undefined,
        domainContext:
          typeof body.domainContext === 'string' ? body.domainContext : undefined,
      });
      res.json(result);
    } catch (error) {
      if (error instanceof GeminiServiceError) {
        res.status(error.status).json({
          error: error.message,
          code: error.code,
        });
        return;
      }
      res.status(500).json({
        error: 'An unexpected error occurred while explaining terminology.',
        code: 'INTERNAL_TERMS_ERROR',
      });
    }
  });

  app.post('/api/chat', async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as {
      message?: unknown;
      documentContext?: unknown;
      documentName?: unknown;
      history?: unknown;
    };

    try {
      const result = await chatWithDocumentGemini({
        message: body.message as string,
        documentContext:
          typeof body.documentContext === 'string'
            ? body.documentContext
            : undefined,
        documentName:
          typeof body.documentName === 'string' ? body.documentName : undefined,
        history: body.history as Array<{
          role: 'user' | 'assistant';
          content: string;
        }>,
      });
      res.json(result);
    } catch (error) {
      if (error instanceof GeminiServiceError) {
        res.status(error.status).json({
          error: error.message,
          code: error.code,
        });
        return;
      }
      res.status(500).json({
        error: 'An unexpected error occurred while generating a chat response.',
        code: 'INTERNAL_CHAT_ERROR',
      });
    }
  });

  return app;
}

async function startServer() {
  const app = createApp();
  const port = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  void startServer();
}
