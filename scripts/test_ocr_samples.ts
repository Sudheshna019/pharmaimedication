/**
 * End-to-end OCR check: runs Tesseract + the prescription parser on every image in
 * data/sample_prescriptions (or the folder given as argument) and prints what was found.
 *   npx tsx scripts/test_ocr_samples.ts [folder]
 */
import fs from "fs";
import path from "path";
import { createWorker } from "tesseract.js";
import { parsePrescriptionOCR } from "../src/utils/prescriptionParser";

const dir = process.argv[2] || "data/sample_prescriptions";
const files = fs.readdirSync(dir).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort();
const worker = await createWorker("eng", 1, { langPath: process.cwd(), cachePath: process.cwd(), gzip: false });
for (const f of files) {
  const t0 = Date.now();
  const { data } = await worker.recognize(fs.readFileSync(path.join(dir, f)));
  const p = parsePrescriptionOCR(data.text);
  console.log(`\n=== ${f}  (OCR confidence ${data.confidence}%, ${Date.now() - t0} ms)`);
  console.log(`patient: ${p.patientName ?? "-"} | age ${p.patientAge ?? "-"} | ${p.patientGender ?? "-"}`);
  for (const m of p.medicines) console.log(`  - ${m.name} | ${m.dosage || "?"} | ${m.frequency || "?"} | ${m.matchType}`);
  if (!p.medicines.length) console.log("  (no medicines found)\n" + data.text);
}
await worker.terminate();
