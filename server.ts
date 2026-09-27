import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createWorker, type Worker } from "tesseract.js";
import { parsePrescriptionOCR } from "./src/utils/prescriptionParser";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
// Python FastAPI service that runs the ML models (see backend/).
// On Render (which sets RENDER=true) the deployed pharmai-ml service is used; locally, port 8000.
const DEPLOYED_ML_URL = "https://pharmai-ml.onrender.com";
const ML_API_URL = (process.env.ML_API_URL || (process.env.RENDER ? DEPLOYED_ML_URL : "http://127.0.0.1:8000")).replace(/\/$/, "");
const ROOT = process.cwd();

app.use(express.json({ limit: "25mb" }));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ---------------------------------------------------------------------------
// OCR: Tesseract.js (LSTM engine) with the bundled eng.traineddata model
// ---------------------------------------------------------------------------
let ocrWorker: Promise<Worker> | null = null;

function getOcrWorker(): Promise<Worker> {
  if (!ocrWorker) {
    const hasLocalModel = fs.existsSync(path.join(ROOT, "eng.traineddata"));
    ocrWorker = createWorker("eng", 1, hasLocalModel ? { langPath: ROOT, cachePath: ROOT, gzip: false } : {})
      .catch((err) => {
        ocrWorker = null;
        throw err;
      });
  }
  return ocrWorker;
}

app.post("/api/v1/ocr/extract-prescription", async (req, res) => {
  const { imageBase64 } = req.body || {};
  if (!imageBase64 || typeof imageBase64 !== "string") {
    return res.status(400).json({ success: false, detail: "No image was provided." });
  }
  const match = imageBase64.match(/^data:([^;]+);base64,/);
  const mime = match?.[1] || "image/jpeg";
  if (!mime.startsWith("image/")) {
    return res.status(400).json({ success: false, detail: "Please upload an image (PDFs are converted to an image in the browser)." });
  }

  try {
    const started = Date.now();
    const buffer = Buffer.from(imageBase64.replace(/^data:[^;]+;base64,/, ""), "base64");
    const worker = await getOcrWorker();
    const { data } = await worker.recognize(buffer);
    const text = (data.text || "").trim();
    const parsed = parsePrescriptionOCR(text);
    return res.json({
      success: true,
      data: {
        extracted_text: text,
        confidence_score: Math.round((data.confidence || 0) * 10) / 10,
        provider: "Tesseract.js OCR (LSTM, English model)",
        processing_ms: Date.now() - started,
        parsed,
      },
    });
  } catch (err: any) {
    console.error("OCR failed:", err);
    return res.status(500).json({ success: false, detail: `OCR failed: ${err?.message || err}` });
  }
});

// Parse text that was already extracted (e.g. from a PDF text layer)
app.post("/api/v1/ocr/parse-text", (req, res) => {
  const text = String(req.body?.text || "");
  return res.json({ success: true, data: { parsed: parsePrescriptionOCR(text) } });
});

// ---------------------------------------------------------------------------
// ML analysis: forwarded to the Python FastAPI service
// ---------------------------------------------------------------------------
async function forwardToML(req: express.Request, res: express.Response, mlPath: string) {
  try {
    const response = await fetch(`${ML_API_URL}${mlPath}`, {
      method: req.method,
      headers: { "Content-Type": "application/json" },
      body: req.method === "GET" ? undefined : JSON.stringify(req.body),
      // free hosting tiers can take ~60 s to wake the ML service up
      signal: AbortSignal.timeout(120_000),
    });
    const body = await response.text();
    res.status(response.status).type("application/json").send(body);
  } catch (err: any) {
    console.error(`ML service unreachable at ${ML_API_URL}:`, err?.message || err);
    res.status(503).json({
      success: false,
      detail: "The ML analysis service is not running. Start it with `npm run dev` (starts both servers) or check ML_API_URL.",
    });
  }
}

app.post("/api/v1/analysis/predict-interaction", (req, res) => forwardToML(req, res, "/api/v1/analysis/predict-interaction"));

// Free hosting tiers put idle services to sleep. Whenever the website is opened, wake the ML
// service in the background so it is ready by the time the user uploads a prescription.
let lastWake = 0;
function wakeML() {
  if (Date.now() - lastWake < 60_000) return;
  lastWake = Date.now();
  fetch(`${ML_API_URL}/health`, { signal: AbortSignal.timeout(90_000) }).catch(() => {});
}
app.use((req, _res, next) => {
  if (req.method === "GET" && !req.path.startsWith("/api/")) wakeML();
  next();
});

// Real test-set metrics of the trained models (read from the training output files)
app.get("/api/v1/model-metrics", (_req, res) => {
  const read = (p: string) => JSON.parse(fs.readFileSync(path.join(ROOT, "backend", "ml_artifacts", p), "utf-8"));
  try {
    const ddiType = read("ddi/ddi_type_metrics.json");
    delete ddiType.classification_report;
    res.json({
      success: true,
      data: {
        ddi_type_model: ddiType,
        ddi_detection_model: read("ddi/ddi_detect_metrics.json"),
        adr_model: read("adr/adr_metrics.json"),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, detail: `Model metrics unavailable: ${err?.message || err}` });
  }
});

app.get("/api/health", async (_req, res) => {
  let ml = "unreachable";
  try {
    const r = await fetch(`${ML_API_URL}/health`, { signal: AbortSignal.timeout(5000) });
    ml = r.ok ? "ok" : `status ${r.status}`;
  } catch {
    /* keep unreachable */
  }
  res.json({ web: "ok", ml, mlApiUrl: ML_API_URL });
});

// ---------------------------------------------------------------------------
// Frontend (Vite in development, static build in production)
// ---------------------------------------------------------------------------
async function main() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      try {
        let template = fs.readFileSync(path.resolve(ROOT, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(ROOT, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PharmAI web server on http://localhost:${PORT}  (ML service: ${ML_API_URL})`);
    getOcrWorker().then(() => console.log("OCR engine ready")).catch((e) => console.error("OCR init failed:", e));
    wakeML();
  });
}

main();
