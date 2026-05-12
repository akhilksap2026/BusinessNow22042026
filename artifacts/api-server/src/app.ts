import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import helmet from "helmet";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Trust the Replit proxy so req.ip and X-Forwarded-For work for rate limiting.
app.set("trust proxy", 1);

app.use(helmet({
  // The frontend is served by a different origin (Vite dev / Replit preview proxy)
  // and does inline scripts during dev — keep CSP off until a deliberate hardening pass.
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Dual-key rate limiting: per (user, IP) so one tenant cannot exhaust another's
// quota, and a noisy IP cannot be hidden by rotating x-user-id.
const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 600,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  // skip health and the bootstrap login picker — these are unauthenticated and
  // legitimately polled by the frontend.
  skip: (req) => req.path === "/healthz" || req.path === "/auth/users-for-login",
  keyGenerator: (req) => {
    const userId = String(req.headers["x-user-id"] ?? "anon");
    const ip = ipKeyGenerator((req.ip ?? "0.0.0.0") as string);
    return `${userId}:${ip}`;
  },
});
app.use("/api", apiLimiter);

app.use("/api", router);

// Global error handler — never leak stack traces to clients.
app.use((err: any, req: Request, res: Response, _next: NextFunction): void => {
  logger.error({ err, path: req.path, method: req.method }, "unhandled error");
  if (res.headersSent) return;
  res.status(500).json({ error: "Internal server error" });
});

if (process.env["NODE_ENV"] === "production") {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(__dirname, "../../businessnow/dist/public"),
    path.resolve(__dirname, "../../../artifacts/businessnow/dist/public"),
  ];
  const staticDir = candidates.find((p) => existsSync(p));
  if (staticDir) {
    logger.info({ staticDir }, "Serving frontend static files");
    app.use(express.static(staticDir));
    app.get(/^\/(?!api\/).*/, (_req, res) => {
      res.sendFile(path.join(staticDir, "index.html"));
    });
  } else {
    logger.warn({ candidates }, "Frontend dist not found; static serving disabled");
  }
}

export default app;
