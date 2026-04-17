import cors from "cors";
import express, { type RequestHandler } from "express";
import * as helmetModule from "helmet";
import type { HelmetOptions } from "helmet";
import morgan from "morgan";
import { buildCorsOptions } from "./lib/corsOptions.js";

const corsOptions = buildCorsOptions();
import { getLoggedClientIp } from "./lib/clientIp.js";
import { errorHandler, HttpError } from "./middleware/errorHandler.js";
import { openApiDocument } from "./openapi.js";
import { ordersRouter } from "./routes/orders.js";
import { productsRouter } from "./routes/products.js";
import { swaggerDocsHtml } from "./swaggerDocsHtml.js";

/** Helmet’s types resolve to the whole module on some TS + `exports` combos (e.g. Vercel). */
type HelmetFactory = (options?: Readonly<HelmetOptions>) => RequestHandler;
const helmet = helmetModule.default as unknown as HelmetFactory;

const app = express();

if (process.env.VERCEL === "1") {
  app.set("trust proxy", true);
} else {
  const trustHops = Number(process.env.TRUST_PROXY_HOPS);
  app.set("trust proxy", Number.isFinite(trustHops) && trustHops >= 0 ? trustHops : 1);
}

app.disable("x-powered-by");
/** CORS runs before Helmet so OPTIONS / preflight always get ACAO / ACAC headers. */
app.use(cors(corsOptions));
/**
 * CSP off for Swagger CDN UI. CORP allows cross-origin fetch (e.g. Vercel/Render → API).
 */
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(express.json({ limit: "256kb" }));
morgan.token("client-ip", (req) => getLoggedClientIp(req as express.Request));
const accessFormat =
  process.env.NODE_ENV === "production"
    ? ":client-ip :method :url HTTP/:http-version :status :res[content-length] - :response-time ms"
    : ":method :url :status :response-time ms :client-ip";
app.use(morgan(accessFormat));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "burger-shop-api" });
});

app.get("/openapi.json", (_req, res) => {
  res.json(openApiDocument);
});

const sendSwaggerUi: RequestHandler = (_req, res) => {
  res.type("html").send(swaggerDocsHtml);
};

app.get("/docs", sendSwaggerUi);
app.get("/docs/", sendSwaggerUi);
app.get("/api/docs", sendSwaggerUi);
app.get("/api/docs/", sendSwaggerUi);

app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);

app.use((_req, _res, next) => {
  next(new HttpError(404, "Not found"));
});

app.use(errorHandler);

const port = Number(process.env.PORT) || 3001;
if (process.env.VERCEL !== "1") {
  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
}

export default app;
