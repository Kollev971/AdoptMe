import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import adminSetupRouter from "./routes/admin-setup";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add admin setup route
app.use(adminSetupRouter);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Error:", err);
    res.status(status).json({ message });
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const tryPort = (port: number): Promise<number> => {
    return new Promise((resolve, reject) => {
      const portToUse = process.env.PORT ? parseInt(process.env.PORT, 10) : port;
      server.listen(portToUse, "0.0.0.0")
        .once('listening', () => {
          log(`Server listening on port ${portToUse}`);
          resolve(portToUse);
        })
        .once('error', (err: any) => {
          if (err.code === 'EADDRINUSE') {
            log(`Port ${portToUse} is busy, trying ${port + 1}`);
            tryPort(port + 1).then(resolve).catch(reject);
          } else {
            reject(err);
          }
        });
    });
  };

  try {
    const port = await tryPort(5000);
    log(`serving on port ${port}`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();