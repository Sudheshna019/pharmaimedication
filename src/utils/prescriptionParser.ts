/**
 * Prescription text parser: turns OCR text into patient details + medicine line items.
 *
 * Medicine names are recognised with shared/drug_vocabulary.json (generic names,
 * Indian/US brand names, combination products) — the same dictionary the Python
 * ML service uses — plus tolerance for small OCR spelling errors.
 * Used by the Node server (OCR endpoint) and by the browser.
 */
import vocabulary from '../../shared/drug_vocabulary.json';

export interface ParsedMedicine {
  id: string;
  name: string;          // name as written on the prescription (cleaned)
  matchedAs: string;     // normalised display name, e.g. "Pantocid (Pantoprazole)"
  generics: string[];    // active ingredients
  dosage: string;
  frequency: string;
  duration?: string;
  route: string;
  matchType: 'generic' | 'brand' | 'combination' | 'non_chemical' | 'fuzzy';
  sourceLine: string;
}

export interface ParsedPrescription {
  patientName?: string;
  patientAge?: number;
  patientGender?: string;
  diagnosis?: string;
  medicines: ParsedMedicine[];
}

type Kind = 'generic' | 'brand' | 'combination' | 'non_chemical';

interface VocabDrug { name: string; class: string | null; synonyms: string[]; extended?: boolean }
const drugs = (vocabulary as any).drugs as Record<string, VocabDrug>;
const combos = (vocabulary as any).combinations as Record<string, { name: string; components: string[] }>;
const nonChemical = (vocabulary as any).non_chemical_products as Record<string, { name: string; class: string }>;
const SALT_WORDS = new Set<string>((vocabulary as any).salt_words);

const FORM_WORDS = new Set(['tab', 'tabs', 'tablet', 'tablets', 'cap', 'caps', 'capsule', 'capsules', 'syp', 'syrup',
  'inj', 'injection', 'susp', 'suspension', 'oral', 'drops', 'gel', 'cream', 'mg', 'mcg', 'g', 'ml', 'iu', 'meq', 'units', 'rx']);
// Words that look like drug names to the fuzzy matcher but are common on prescriptions
const FUZZY_STOPWORDS = new Set(['patient', 'doctor', 'daily', 'morning', 'evening', 'tablet', 'tablets', 'capsule',
  'before', 'after', 'meals', 'dinner', 'breakfast', 'bedtime', 'hospital', 'clinic', 'medical', 'prescription',
  'diagnosis', 'female', 'gender', 'address', 'signature', 'refills', 'dispense', 'quantity', 'directions', 'medicine',
  'medication', 'medications', 'physician', 'general', 'center', 'centre', 'health', 'record', 'hypertension', 'diabetes',
  'fever', 'infection', 'pressure', 'weeks', 'months', 'twice', 'thrice', 'needed', 'mouth']);

const clean = (t: string) => t.toLowerCase()
  .replace(/(\d)([a-z])/g, '$1 $2')
  .replace(/[^a-z0-9+ ]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const LOOKUP = new Map<string, { kind: Kind; key: string }>();
for (const [g, d] of Object.entries(drugs)) {
  LOOKUP.set(clean(g), { kind: 'generic', key: g });
  for (const s of d.synonyms) if (!LOOKUP.has(clean(s))) LOOKUP.set(clean(s), { kind: 'brand', key: g });
}
for (const b of Object.keys(combos)) LOOKUP.set(clean(b), { kind: 'combination', key: b });
for (const n of Object.keys(nonChemical)) if (!LOOKUP.has(clean(n))) LOOKUP.set(clean(n), { kind: 'non_chemical', key: n });
// OCR often drops the space in short brand names: "Pan D" -> "PanD", "Pan 40" -> "Pan40"
for (const [k, v] of [...LOOKUP.entries()]) {
  const joined = k.replace(/ /g, '');
  if (k.includes(' ') && joined.length >= 4 && !LOOKUP.has(joined)) LOOKUP.set(joined, v);
}
const MAX_NGRAM = Math.max(...[...LOOKUP.keys()].map((k) => k.split(' ').length));
// spelling correction only for the curated drugs (the extended DrugBank names match exactly)
const FUZZY_KEYS = [...LOOKUP.entries()]
  .filter(([k, v]) => !k.includes(' ') && k.length >= 5 && !(drugs[v.key] as any)?.extended)
  .map(([k]) => k);

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

function displayName(generic: string): string {
  return drugs[generic]?.name || nonChemical[generic]?.name || titleCase(generic);
}

/** Normalised Levenshtein similarity: 1 - editDistance / longerLength. */
function similarity(a: string, b: string): number {
  const m = a.length, n = b.length;
  const d: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return 1 - d[n] / Math.max(m, n);
}

function fuzzyLookup(token: string) {
  if (token.length < 5 || FORM_WORDS.has(token) || SALT_WORDS.has(token) || FUZZY_STOPWORDS.has(token)) return null;
  let best: string | null = null;
  let bestScore = 0;
  for (const k of FUZZY_KEYS) {
    if (Math.abs(k.length - token.length) > 2) continue;
    const s = similarity(token, k);
    if (s > bestScore) { bestScore = s; best = k; }
  }
  // at most one edit for short words, two for long words
  const needed = token.length >= 9 ? 0.78 : 0.83;
  return best && bestScore >= needed ? LOOKUP.get(best)! : null;
}

export interface DrugMention { kind: Kind | 'fuzzy'; key: string; generics: string[]; text: string; display: string }

/** Find every drug mentioned in a line of text (longest match first). */
export function findDrugs(text: string): DrugMention[] {
  const tokens = clean(text).split(' ').filter(Boolean);
  const found: DrugMention[] = [];
  let i = 0;
  while (i < tokens.length) {
    let hit: { n: number; kind: Kind; key: string; fuzzy: boolean } | null = null;
    for (let n = Math.min(MAX_NGRAM, tokens.length - i); n > 0; n--) {
      const entry = LOOKUP.get(tokens.slice(i, i + n).join(' '));
      if (entry) { hit = { n, ...entry, fuzzy: false }; break; }
    }
    if (!hit) {
      // OCR sometimes glues the dosage form to the name: "TabPanD", "CapZoclar"
      const glued = tokens[i].match(/^(tab|tabs|cap|caps|inj|syp|syr)([a-z0-9]{3,})$/);
      const entry = glued ? LOOKUP.get(glued[2]) : undefined;
      if (entry) hit = { n: 1, ...entry, fuzzy: false };
    }
    if (!hit) {
      const fz = fuzzyLookup(tokens[i]);
      if (fz) hit = { n: 1, ...fz, fuzzy: true };
    }
    if (hit) {
      const generics = hit.kind === 'combination' ? combos[hit.key].components : [hit.key];
      const text = tokens.slice(i, i + hit.n).join(' ');
      let display: string;
      if (hit.kind === 'combination') display = `${combos[hit.key].name} (${generics.map(displayName).join(' + ')})`;
      else if (hit.kind === 'brand') display = `${titleCase(text)} (${displayName(hit.key)})`;
      else display = displayName(hit.key);
      found.push({ kind: hit.fuzzy ? 'fuzzy' : hit.kind, key: hit.key, generics, text, display });
      i += hit.n;
      while (i < tokens.length && SALT_WORDS.has(tokens[i])) i++; // "Losartan Potassium"
    } else {
      i++;
    }
  }
  return found;
}

const DOSE_RE = /(\d+(?:\.\d+)?\s*(?:\/\s*\d+(?:\.\d+)?\s*)?(?:mg|mcg|µg|g|ml|iu|meq|units?)\b)/i;

function extractFrequency(line: string): string {
  const l = line.toLowerCase();
  const pattern = l.match(/\b([01])\s*-\s*([01])\s*-\s*([01])\b/);
  if (pattern) {
    const n = pattern.slice(1).filter((x) => x === '1').length;
    const label = n === 3 ? 'Three times daily' : n === 2 ? 'Twice daily' : 'Once daily';
    return `${label} (${pattern[1]}-${pattern[2]}-${pattern[3]})`;
  }
  const every = l.match(/every\s+(\d+)\s*(?:hours|hrs|hr|h)\b/);
  if (every) return `Every ${every[1]} hours${/prn|as needed/.test(l) ? ' as needed' : ''}`;
  if (/\b(thrice|three times)\b|\btds\b|\btid\b/.test(l)) return 'Three times daily';
  if (/\b(twice|two times)\b|\bbd\b|\bbid\b/.test(l)) return 'Twice daily';
  if (/\bqid\b|four times/.test(l)) return 'Four times daily';
  if (/\bhs\b|bedtime|at night|\bnight\b/.test(l)) return 'Once daily at bedtime';
  if (/\bonce\b|\bod\b|\bdaily\b|every day|\bqd\b/.test(l)) return /morning/.test(l) ? 'Once daily (morning)' : 'Once daily';
  if (/\bprn\b|as needed|sos/.test(l)) return 'As needed';
  return '';
}

function extractRoute(line: string): string {
  const l = line.toLowerCase();
  if (/\binj\b|injection|\biv\b|\bim\b|subcut/.test(l)) return 'Injection';
  if (/inhal|puff|inhaler/.test(l)) return 'Inhalation';
  if (/cream|ointment|gel\b|topical/.test(l)) return 'Topical';
  if (/drops?\b/.test(l)) return 'Drops';
  return 'Oral';
}

export function parsePrescriptionOCR(ocrText: string): ParsedPrescription {
  if (!ocrText || !ocrText.trim()) return { medicines: [] };

  const lines = ocrText.split(/\r?\n/).map((l) => l.replace(/[|[\]{}]/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);

  // ---- patient details ----------------------------------------------------
  let patientName: string | undefined;
  const nameMatch = ocrText.match(/(?:patient(?:\s*name)?|name)\s*[:\-]\s*([A-Za-z][A-Za-z .'\-]{1,40})/i);
  if (nameMatch) {
    const raw = nameMatch[1].split(/\s{2,}|\b(?:age|gender|sex|date|dob|clinic|id|mob|phone)\b|\(|,/i)[0].trim();
    if (raw.length >= 3 && findDrugs(raw).length === 0) patientName = titleCase(raw.toLowerCase());
  }

  let patientAge: number | undefined;
  const ageMatch = ocrText.match(/\bage\s*[:\-/]?\s*(\d{1,3})/i) || ocrText.match(/\b(\d{1,3})\s*(?:yrs?|years?|y\/o)\b/i);
  if (ageMatch) {
    const a = parseInt(ageMatch[1], 10);
    if (a > 0 && a < 120) patientAge = a;
  }

  let patientGender: string | undefined;
  const genderMatch = ocrText.match(/\b(?:gender|sex)\s*[:\-]?\s*(male|female|m|f)\b/i);
  if (genderMatch) patientGender = genderMatch[1].toLowerCase().startsWith('f') ? 'Female' : 'Male';
  else if (/\bfemale\b/i.test(ocrText)) patientGender = 'Female';
  else if (/\bmale\b/i.test(ocrText)) patientGender = 'Male';

  // table layout: "PATIENT: AGE: GENDER:" header with the values on the next line
  const headerIdx = lines.findIndex((l) => /patient\s*:?\s*age\s*:?/i.test(l));
  if (headerIdx >= 0 && lines[headerIdx + 1]) {
    const row = lines[headerIdx + 1].match(/^([A-Za-z][A-Za-z .'\-]+?)\s+(\d{1,3})\s+(male|female|m|f)\b/i);
    if (row) {
      patientName = patientName || titleCase(row[1].toLowerCase());
      patientAge = patientAge || parseInt(row[2], 10);
      patientGender = patientGender || (row[3].toLowerCase().startsWith('f') ? 'Female' : 'Male');
    }
  }

  // "Patient Information" heading with the bare name on the next line (two-column layouts)
  if (!patientName) {
    const infoIdx = lines.findIndex((l) => /^patient\s+(information|details)/i.test(l));
    const next = infoIdx >= 0 ? lines[infoIdx + 1] : undefined;
    const bare = next?.split(/\s+(?:dr\.?|doctor)\s/i)[0].match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/);
    if (bare && findDrugs(bare[1]).length === 0) patientName = bare[1];
  }

  let diagnosis: string | undefined;
  const diagMatch = ocrText.match(/(?:diagnosis|dx|impression)\s*[:\-]\s*([^\n\r]+)/i);
  if (diagMatch) diagnosis = diagMatch[1].trim();

  // ---- medicines ------------------------------------------------------------
  const medicines: ParsedMedicine[] = [];
  const seen = new Set<string>();
  const skipLine = /^(?:patient|name|age|gender|sex|date|dob|diagnosis|dr\b|doctor|reg|phone|address|clinic|hospital|signature)/i;

  lines.forEach((line, idx) => {
    if (skipLine.test(line) && !DOSE_RE.test(line)) return;
    const mentions = findDrugs(line);
    if (!mentions.length) return;
    // directions often follow on the next lines ("Sig: Take 1 tablet daily") until the next medicine
    const following: string[] = [];
    for (let k = idx + 1; k < Math.min(lines.length, idx + 6); k++) {
      if (findDrugs(lines[k]).length || skipLine.test(lines[k]) || /^(advice|review|note|follow|investigation)/i.test(lines[k])) break;
      following.push(lines[k]);
    }
    const context = [line, ...following].join(' ');
    // a line like "Combiflam (Ibuprofen 400mg + Paracetamol 325mg)" is one product
    const primary = mentions[0].kind === 'combination' ? [mentions[0]] : mentions.filter((m, k) =>
      k === 0 || !mentions.slice(0, k).some((prev) => prev.kind === 'brand' && prev.generics.some((g) => m.generics.includes(g))));
    for (const m of primary) {
      const dedupeKey = m.generics.slice().sort().join('+');
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      const afterName = line.toLowerCase().indexOf(m.text.split(' ')[0]);
      const doseSource = afterName >= 0 ? line.slice(afterName) : line;
      // "Dolo 650" / "Augmentin 625": a bare number right after the name is the strength in mg
      const bare = doseSource.slice(m.text.length).match(/^[\s.:-]*(\d{2,4})(?![\d-])(?=\s|$)/);
      const dose = doseSource.match(DOSE_RE)?.[1]?.replace(/\s+/g, '') || (bare ? `${bare[1]}mg` : '');
      const duration = context.match(/(?:for\s+)?(\d+)\s*(days?|weeks?|months?)\b/i);
      medicines.push({
        id: `ocr-med-${medicines.length + 1}`,
        name: m.display,
        matchedAs: m.display,
        generics: m.generics,
        dosage: dose,
        frequency: extractFrequency(context),
        duration: duration ? `${duration[1]} ${duration[2]}` : undefined,
        route: extractRoute(line),
        matchType: m.kind,
        sourceLine: line,
      });
    }
  });

  return { patientName, patientAge, patientGender, diagnosis, medicines };
}

/** Normalise a single medicine name typed by the user (Manual Entry autocomplete / review step). */
export function normalizeMedicineName(name: string): DrugMention | null {
  return findDrugs(name)[0] || null;
}

/** All names the dictionary knows (for autocomplete). */
export function knownMedicineNames(): string[] {
  const names = new Set<string>();
  for (const [g, d] of Object.entries(drugs)) {
    names.add(displayName(g));
    for (const s of d.synonyms) if (s.length > 3) names.add(`${titleCase(s)} (${displayName(g)})`);
  }
  for (const [b, c] of Object.entries(combos)) names.add(`${c.name} (${c.components.map(displayName).join(' + ')})`);
  return [...names].sort();
}
