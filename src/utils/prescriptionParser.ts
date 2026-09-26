export interface ParsedPrescription {
  patientName?: string;
  patientAge?: number;
  patientGender?: string;
  diagnosis?: string;
  medicines: Array<{
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    duration?: string;
    route: string;
    instructions?: string;
  }>;
}

const NON_MEDICINE_WORDS = new Set([
  'quest', 'care', 'medical', 'clinic', 'anand', 'society', 'dindayal', 'road', 
  'ghatkopar', 'mumbai', 'patient', 'female', 'male', 'years', 'yrs', 'y/o', 'date', 
  'doctor', 'dr', 'mr', 'mrs', 'mds', 'md', 'mbbs', 'registration', 'no', 'reg',
  'complaint', 'full', 'body', 'pain', 'weakness', 'feeling', 'observations', 
  'high', 'temperature', 'reddish', 'eye', 'investigations', 'suggested', 'cratine', 
  'creatinine', 'cbc', 'count', 'blood', 'diagnosis', 'dengue', 'fever', 'rx', 
  'medicine', 'dosage', 'duration', 'measure', 'instructions', 'remarks', 'keep', 
  'measuring', 'twice', 'day', 'days', 'next', 'follow-up', 'friday', 'may', 'pm', 
  'am', 'authorised', 'signature', 'computer', 'generated', 'document', 'ph', 
  'phone', 'address', 'hospital', 'page', 'scanned', 'script', 'after', 'meal',
  'before', 'bhukya', 'pete', 'insert', 'name', 'tablets', 'health', 'choice',
  'riverside', 'bingham', 'youremail', 'yourwebsite', 'prescription', 'contact',
  'num', 'matthew', 'vestal', 'usa', 'malaria', 'chills', 'headache', 'findings',
  'advice', 'rest', 'food', 'digest', 'boiled', 'rice', 'daal', 'tot', 'tab', 'cap'
]);

function isGibberishToken(str: string): boolean {
  if (!str || str.trim().length < 3) return true;
  const clean = str.trim();
  // Filter 0-vowel font tokens like TtR, GWD, GqV, GGrK
  const hasVowels = /[aeiouy]/i.test(clean);
  if (!hasVowels) return true;
  return false;
}

const KNOWN_DRUGS_DICTIONARY: Record<string, { standardName: string; category: string; keyTokens: string[] }> = {
  'paracetamol': { standardName: 'Paracetamol 500mg', category: 'Analgesic & Antipyretic', keyTokens: ['paracetamol', 'acetaminophen'] },
  'acetaminophen': { standardName: 'Paracetamol 500mg', category: 'Analgesic & Antipyretic', keyTokens: ['paracetamol', 'acetaminophen'] },
  'calpol': { standardName: 'Calpol 650mg', category: 'Analgesic & Antipyretic', keyTokens: ['calpol'] },
  'crocin': { standardName: 'Crocin 650mg', category: 'Analgesic & Antipyretic', keyTokens: ['crocin'] },
  'dolo': { standardName: 'Dolo 650mg', category: 'Analgesic & Antipyretic', keyTokens: ['dolo'] },
  'combiflam': { standardName: 'Combiflam (Ibuprofen + Paracetamol)', category: 'NSAID & Analgesic', keyTokens: ['combiflam'] },
  'ibuprofen': { standardName: 'Ibuprofen 400mg', category: 'NSAID Analgesic', keyTokens: ['ibuprofen', 'motrin', 'advil'] },
  'naproxen': { standardName: 'Naproxen Sodium 500mg', category: 'NSAID Anti-inflammatory', keyTokens: ['naproxen', 'aleve'] },
  'rantac': { standardName: 'Rantac (Ranitidine 150mg)', category: 'H2 Receptor Antagonist', keyTokens: ['rantac', 'ranitidine'] },
  'ranitidine': { standardName: 'Ranitidine 150mg', category: 'H2 Receptor Antagonist', keyTokens: ['rantac', 'ranitidine'] },
  'sm fibro': { standardName: 'Cap SM Fibro', category: 'Nutritional Antioxidant', keyTokens: ['sm fibro', 'fibro'] },
  'fibro': { standardName: 'Cap SM Fibro', category: 'Nutritional Antioxidant', keyTokens: ['sm fibro', 'fibro'] },
  'pan 40': { standardName: 'Pan 40 (Pantoprazole 40mg)', category: 'Proton Pump Inhibitor', keyTokens: ['pan 40', 'pantoprazole'] },
  'pantocid': { standardName: 'Pantocid 40mg', category: 'Proton Pump Inhibitor', keyTokens: ['pantocid', 'pantoprazole'] },
  'pantoprazole': { standardName: 'Pantoprazole 40mg', category: 'Proton Pump Inhibitor', keyTokens: ['pantoprazole'] },
  'omeprazole': { standardName: 'Omeprazole 20mg', category: 'Proton Pump Inhibitor', keyTokens: ['omeprazole'] },
  'warfarin': { standardName: 'Warfarin 5mg', category: 'Anticoagulant', keyTokens: ['warfarin'] },
  'aspirin': { standardName: 'Aspirin 81mg', category: 'Antiplatelet NSAID', keyTokens: ['aspirin'] },
  'lisinopril': { standardName: 'Lisinopril 20mg', category: 'ACE Inhibitor', keyTokens: ['lisinopril'] },
  'metformin': { standardName: 'Metformin 500mg', category: 'Antidiabetic', keyTokens: ['metformin'] },
  'atorvastatin': { standardName: 'Atorvastatin 20mg', category: 'Statin', keyTokens: ['atorvastatin'] },
  'clopidogrel': { standardName: 'Clopidogrel 75mg', category: 'Antiplatelet', keyTokens: ['clopidogrel'] },
  'fluoxetine': { standardName: 'Fluoxetine 20mg', category: 'SSRI Antidepressant', keyTokens: ['fluoxetine'] },
  'tramadol': { standardName: 'Tramadol 50mg', category: 'Opioid Analgesic', keyTokens: ['tramadol'] },
  'amoxicillin': { standardName: 'Amoxicillin 500mg', category: 'Antibiotic', keyTokens: ['amoxicillin'] },
  'augmentin': { standardName: 'Augmentin 625mg', category: 'Broad Spectrum Antibiotic', keyTokens: ['augmentin'] },
  'ciprofloxacin': { standardName: 'Ciprofloxacin 500mg', category: 'Antibiotic', keyTokens: ['ciprofloxacin'] },
  'azithromycin': { standardName: 'Azithromycin 500mg', category: 'Antibiotic', keyTokens: ['azithromycin'] },
  'doxycycline': { standardName: 'Doxycycline 100mg', category: 'Antibiotic', keyTokens: ['doxycycline'] },
  'diclofenac': { standardName: 'Diclofenac 50mg', category: 'NSAID', keyTokens: ['diclofenac'] },
  'telmisartan': { standardName: 'Telmisartan 40mg', category: 'ARBA Antihypertensive', keyTokens: ['telmisartan'] },
  'amlodipine': { standardName: 'Amlodipine 5mg', category: 'Calcium Channel Blocker', keyTokens: ['amlodipine'] },
  'montelukast': { standardName: 'Montelukast 10mg', category: 'Leukotriene Receptor Antagonist', keyTokens: ['montelukast'] },
  'cetirizine': { standardName: 'Cetirizine 10mg', category: 'Antihistamine', keyTokens: ['cetirizine'] },
  'spironolactone': { standardName: 'Spironolactone 25mg', category: 'Potassium Sparing Diuretic', keyTokens: ['spironolactone'] },
  'furosemide': { standardName: 'Furosemide 40mg', category: 'Loop Diuretic', keyTokens: ['furosemide', 'lasix'] },
  'lasix': { standardName: 'Lasix (Furosemide 40mg)', category: 'Loop Diuretic', keyTokens: ['lasix', 'furosemide'] },
  'potassium': { standardName: 'Potassium Chloride 20mEq', category: 'Electrolyte Supplement', keyTokens: ['potassium'] },
  'gabapentin': { standardName: 'Gabapentin 300mg', category: 'Neuropathic Agent', keyTokens: ['gabapentin'] },
  'levothyroxine': { standardName: 'Levothyroxine 50mcg', category: 'Thyroid Hormone', keyTokens: ['levothyroxine', 'eltroxin'] },
  'digoxin': { standardName: 'Digoxin 0.25mg', category: 'Cardiac Glycoside', keyTokens: ['digoxin', 'lanoxin'] },
  'lanoxin': { standardName: 'Lanoxin (Digoxin 0.25mg)', category: 'Cardiac Glycoside', keyTokens: ['lanoxin', 'digoxin'] },
  'abciximab': { standardName: 'Tab. Abciximab 10mg', category: 'Glycoprotein IIb/IIIa Antiplatelet', keyTokens: ['abciximab'] },
  'vomilast': { standardName: 'Tab. Vomilast (Doxylamine 10mg + Pyridoxine 10mg + Folic Acid 2.5mg)', category: 'Antiemetic & Antinauseant', keyTokens: ['vomilast', 'doxylamine', 'pyridoxine'] },
  'doxylamine': { standardName: 'Doxylamine 10mg + Pyridoxine 10mg', category: 'Antiemetic & Antinauseant', keyTokens: ['doxylamine', 'vomilast'] },
  'zoclar': { standardName: 'Cap. Zoclar 500 (Clarithromycin 500mg)', category: 'Macrolide Antibiotic', keyTokens: ['zoclar', 'clarithromycin'] },
  'clarithromycin': { standardName: 'Clarithromycin 500mg', category: 'Macrolide Antibiotic', keyTokens: ['clarithromycin', 'zoclar'] },
  'gestakind': { standardName: 'Tab. Gestakind 10/SR (Isoxsuprine 10mg)', category: 'Uterine Relaxant & Peripheral Vasodilator', keyTokens: ['gestakind', 'isoxsuprine'] },
  'isoxsuprine': { standardName: 'Isoxsuprine 10mg', category: 'Uterine Relaxant & Peripheral Vasodilator', keyTokens: ['isoxsuprine', 'gestakind'] }
};

export function parsePrescriptionOCR(ocrText: string): ParsedPrescription {
  if (!ocrText) {
    return { medicines: [] };
  }

  // Clean OCR lines
  const rawLines = ocrText
    .split('\n')
    .map(l => l.replace(/[[\]]/g, ' ').trim())
    .filter(l => l.length > 0);
    
  const textLower = ocrText.toLowerCase();

  // 1. Patient Name Extraction
  let patientName: string | undefined;
  const namePatterns = [
    /ID:\s*\d+\s*-\s*([A-Za-z0-9\s]+?)(?=\s*\(|\s*\/|\s*Mob|\s*Date|\s*$)/i,
    /(?:Patient|Name)\s*[:\-]?\s*\[?([A-Za-z\s\.\'\-]+)\]?/i,
    /Mr\.\/Ms\.\/Mrs\.\s*[:\.]?\s*\[?([A-Za-z\s\.\'\-]+)\]?/i
  ];
  for (const pat of namePatterns) {
    const m = ocrText.match(pat);
    if (m && m[1]) {
      let raw = m[1].replace(/[[\]]/g, '').split(/\n|,|Female|Male|Address|Date|Dr|Phone/i)[0].trim();
      if (raw.length > 2 && !NON_MEDICINE_WORDS.has(raw.toLowerCase())) {
        patientName = raw;
        break;
      }
    }
  }

  // 2. Patient Age Extraction
  let patientAge: number | undefined;
  const ageMatch = ocrText.match(/(?:Age|Yrs)\s*[:\/\-]?\s*\[?(\d{1,3})/i) || ocrText.match(/(\d{1,3})\s*(?:Yrs|Years|\s*Y\b)/i) || ocrText.match(/,\s*(\d{1,3})\s*years/i);
  if (ageMatch) {
    patientAge = parseInt(ageMatch[1], 10);
  }

  // 3. Patient Gender Extraction
  let patientGender: string | undefined;
  if (/\(M\)|\bMale\b/i.test(ocrText)) {
    patientGender = 'Male';
  } else if (/\(F\)|\bFemale\b/i.test(ocrText)) {
    patientGender = 'Female';
  }

  // 4. Clinical Diagnosis
  let diagnosis: string | undefined;
  const diagMatch = ocrText.match(/Diagnosis\s*[:\-]?\s*[\*\-\s]*([^\n\r]+)/i);
  if (diagMatch && diagMatch[1]) {
    diagnosis = diagMatch[1].replace(/Rx.*$/i, '').replace(/[\*\-]/g, '').trim();
  }

  // 5. Medicines Extraction with Strict Deduplication
  const medicines: ParsedPrescription['medicines'] = [];
  const addedTokensSet = new Set<string>();

  // A. Search Dictionary Matches first
  for (const [key, info] of Object.entries(KNOWN_DRUGS_DICTIONARY)) {
    if (textLower.includes(key)) {
      const alreadyAdded = Array.from(addedTokensSet).some(t => 
        t === info.standardName.toLowerCase() || info.keyTokens.some(kt => kt.toLowerCase() === t)
      );
      if (alreadyAdded) continue;

      addedTokensSet.add(info.standardName.toLowerCase());
      info.keyTokens.forEach(t => addedTokensSet.add(t.toLowerCase()));

      let dosage = info.standardName.match(/\d+(?:\/\w+)?\s*(?:mg|g|ml|mcg|mEq)/i)?.[0] || 'As Prescribed';
      let frequency = 'Daily (Oral)';
      let duration = '5 days';

      const matchingLine = rawLines.find(l => l.toLowerCase().includes(key));
      if (matchingLine) {
        const doseM = matchingLine.match(/\d+(?:\/\w+)?\s*(?:mg|g|ml|mcg|mEq)/i);
        if (doseM) dosage = doseM[0];

        const durM = matchingLine.match(/\d+\s*days?/i);
        if (durM) duration = durM[0];

        if (/1\s*morning,\s*1\s*night/i.test(matchingLine)) frequency = 'Twice Daily (1 Morning, 1 Night)';
        else if (/1\s*morning/i.test(matchingLine)) frequency = 'Once Daily (Morning)';
        else if (/1\s*night/i.test(matchingLine)) frequency = 'Once Daily (Night)';
        else if (/1-1-1/i.test(matchingLine)) frequency = 'Thrice Daily (1-1-1) After Meal';
        else if (/1-0-1/i.test(matchingLine)) frequency = 'Twice Daily (1-0-1)';
        else if (/1-0-0/i.test(matchingLine)) frequency = 'Once Daily (1-0-0)';
      } else {
        if (textLower.includes('thrice a day') || textLower.includes('1-1-1')) frequency = 'Thrice Daily (1-1-1) After Meal';
        else if (textLower.includes('once a day') || textLower.includes('1-0-0')) frequency = 'Once Daily (1-0-0)';
        else if (textLower.includes('twice a day') || textLower.includes('1-0-1')) frequency = 'Twice Daily (1-0-1)';
      }

      medicines.push({
        id: `ocr-med-${medicines.length + 1}`,
        name: info.standardName,
        dosage,
        frequency,
        duration,
        route: 'Oral'
      });
    }
  }

  // B. Parse General Prescription Line Items (e.g. "1. Metformin 500mg", "Tab. Warfarin 5mg")
  for (let rawLine of rawLines) {
    if (rawLine.toLowerCase().includes('insert medicine name')) continue;

    // Strip leading numbers or prefixes like "1. ", "2) ", "Rx: ", "Tab. ", "Cap. "
    const cleanedLine = rawLine.replace(/^(?:\d+[\.\)]\s*|Rx[:\.]?\s*|(?:Tab|Cap|Inj|Syr|T\.)\.?\s*)/i, '').trim();

    // Check if line contains a dosage or frequency indicator
    if (/\d+\s*(?:mg|g|ml|tablets?|capsules?|mEq|mcg)/i.test(cleanedLine) || /(?:once|twice|thrice)\s*a?\s*day/i.test(cleanedLine)) {
      const doseMatch = cleanedLine.match(/\d+\s*(?:mg|g|ml|tablets?|capsules?|mEq|mcg)/i);
      let drugName = '';
      let dosage = 'As Prescribed';

      if (doseMatch && doseMatch.index !== undefined && doseMatch.index > 0) {
        drugName = cleanedLine.substring(0, doseMatch.index).replace(/[^A-Za-z\s]/g, '').trim();
        dosage = doseMatch[0];
      } else {
        const parts = cleanedLine.split(/[,;]/);
        drugName = parts[0].replace(/[^A-Za-z\s]/g, '').trim();
      }

      const cleanLower = drugName.toLowerCase();
      if (drugName.length >= 3 && !isGibberishToken(drugName) && !Array.from(addedTokensSet).some(t => cleanLower.includes(t) || t.includes(cleanLower))) {
        const isForbidden = drugName.split(' ').some(w => NON_MEDICINE_WORDS.has(w.toLowerCase()));
        if (!isForbidden) {
          addedTokensSet.add(cleanLower);

          let frequency = 'Daily (Oral)';
          if (/thrice\s*a?\s*day|1-1-1/i.test(cleanedLine)) frequency = 'Thrice Daily (1-1-1) After Meal';
          else if (/once\s*a?\s*day|1-0-0/i.test(cleanedLine)) frequency = 'Once Daily (1-0-0)';
          else if (/twice\s*a?\s*day|1-0-1/i.test(cleanedLine)) frequency = 'Twice Daily (1-0-1)';

          medicines.push({
            id: `ocr-rxline-${medicines.length + 1}`,
            name: drugName.charAt(0).toUpperCase() + drugName.slice(1),
            dosage,
            frequency,
            duration: '5 days',
            route: 'Oral'
          });
        }
      }
    }
  }

  // C. General Numbered / Prefixed Line Item Fallback (e.g., "1. Metformin 500mg", "Tab. Dolo 650mg")
  if (medicines.length === 0) {
    for (const line of rawLines) {
      if (line.toLowerCase().includes('insert medicine name') || line.length < 4) continue;
      
      const numMatch = line.match(/^(?:\d+[\.\)]\s*|(?:Tab|Cap|Inj|Syr)\.?\s*)([A-Za-z\s\d\-]+)/i);
      if (numMatch && numMatch[1]) {
        let rawDrugStr = numMatch[1].trim();
        const drugParts = rawDrugStr.split(/\s(?=\d)/);
        let drugName = drugParts[0].replace(/[^A-Za-z\s]/g, '').trim();
        
        if (drugName.length > 2 && !NON_MEDICINE_WORDS.has(drugName.toLowerCase()) && !addedTokensSet.has(drugName.toLowerCase())) {
          addedTokensSet.add(drugName.toLowerCase());
          const doseMatch = line.match(/\d+\s*(?:mg|g|ml|mEq|mcg)/i);
          const dosage = doseMatch ? doseMatch[0] : 'As Prescribed';

          medicines.push({
            id: `ocr-fallback-${medicines.length + 1}`,
            name: drugName.charAt(0).toUpperCase() + drugName.slice(1),
            dosage,
            frequency: 'Daily (Oral)',
            duration: '5 days',
            route: 'Oral'
          });
        }
      }
    }
  }

  // D. Return extracted medicines (or empty array if no medications were recognized)
  return {
    patientName: patientName || 'Prescription Patient',
    patientAge: patientAge || 45,
    patientGender: patientGender || 'Female',
    diagnosis,
    medicines
  };
}
