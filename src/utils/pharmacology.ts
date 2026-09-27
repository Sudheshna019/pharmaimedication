import { MedicineItem, DrugInteraction, ShapFeature, AnalysisResult, SeverityLevel } from '../types';

export interface DrugKnowledge {
  purpose: string;
  targetOrgan: string;
  mechanismOfAction: string;
  commonUse: string;
  foodInteractions: string;
  category: string;
  isVerified?: boolean;
}

export const DRUG_KNOWLEDGE_BASE: Record<string, DrugKnowledge> = {
  'paracetamol': {
    purpose: 'Analgesic & Antipyretic medication used to relieve mild-to-moderate pain and reduce fever.',
    targetOrgan: 'Central Nervous System & Hypothalamic Heat-Regulating Center',
    mechanismOfAction: 'Inhibits central prostaglandin synthesis via COX-3/COX-1 variant enzymes and activates descending serotonergic pain pathways.',
    commonUse: 'Prescribed for Fever, Headache, Muscle Aches, Post-operative Pain, and Symptomatic Dengue/Viral Recovery.',
    foodInteractions: 'Can be taken with or without food. Avoid excessive alcohol consumption to prevent hepatic stress.',
    category: 'Analgesic & Antipyretic',
    isVerified: true
  },
  'ibuprofen': {
    purpose: 'Nonsteroidal Anti-inflammatory Drug (NSAID) used to reduce pain, fever, and tissue inflammation.',
    targetOrgan: 'Musculoskeletal System, Vascular Endothelium & Gastric Mucosa',
    mechanismOfAction: 'Reversibly inhibits Cyclooxygenase-1 and 2 (COX-1 & COX-2) enzymes, reducing peripheral inflammatory prostaglandin production.',
    commonUse: 'Prescribed for Osteoarthritis, Rheumatoid Arthritis, Dysmenorrhea, Musculoskeletal Pain, and Fever.',
    foodInteractions: 'Take with food or milk to minimize stomach irritation. Limit alcohol and avoid combining with other oral NSAIDs.',
    category: 'Nonsteroidal Anti-inflammatory Drug (NSAID)',
    isVerified: true
  },
  'naproxen': {
    purpose: 'Long-acting NSAID that reduces pain, joint stiffness, swelling, and systemic inflammatory responses.',
    targetOrgan: 'Joints, Musculoskeletal System & Gastric Mucosa',
    mechanismOfAction: 'Inhibits arachidonic acid conversion to inflammatory prostaglandins via non-selective COX-1 and COX-2 inhibition.',
    commonUse: 'Prescribed for Ankylosing Spondylitis, Joint Stiffness, Migraines, Tendonitis, and Acute Gout.',
    foodInteractions: 'Take with a full glass of water or food to protect gastric mucosal lining.',
    category: 'NSAID Anti-inflammatory',
    isVerified: true
  },
  'warfarin': {
    purpose: 'Oral Anticoagulant (Blood Thinner) that prevents blood clots from forming or expanding in blood vessels and the heart.',
    targetOrgan: 'Liver & Cardiovascular System (Clotting Factors II, VII, IX, X)',
    mechanismOfAction: 'Inhibits Vitamin K epoxide reductase (VKORC1) enzyme, blocking the gamma-carboxylation of Vitamin K-dependent coagulation factors.',
    commonUse: 'Prescribed for Atrial Fibrillation, Deep Vein Thrombosis (DVT), Pulmonary Embolism, and Mechanical Heart Valves.',
    foodInteractions: 'Maintain consistent daily intake of Vitamin K rich green leafy vegetables (spinach, kale, broccoli) and avoid alcohol.',
    category: 'Anticoagulant / Vitamin K Antagonist',
    isVerified: true
  },
  'aspirin': {
    purpose: 'Antiplatelet agent & NSAID that prevents blood platelets from sticking together to form arterial clots.',
    targetOrgan: 'Blood Platelets, Arterial Endothelium & Gastric Mucosa',
    mechanismOfAction: 'Irreversibly acetylates Cyclooxygenase-1 (COX-1), blocking thromboxane A2 (TXA2) synthesis for the lifetime of the platelet (7-10 days).',
    commonUse: 'Prescribed for Heart Attack prevention, Stroke prevention, Post-Stent placement, and Angina.',
    foodInteractions: 'Take with food or milk to minimize stomach irritation. Limit alcohol to prevent gastric bleeding.',
    category: 'Antiplatelet / Salicylate NSAID',
    isVerified: true
  },
  'lisinopril': {
    purpose: 'ACE Inhibitor that relaxes and dilates blood vessels to lower high blood pressure and reduce workload on the heart.',
    targetOrgan: 'Cardiovascular System & Kidneys (Renin-Angiotensin-Aldosterone System)',
    mechanismOfAction: 'Inhibits Angiotensin-Converting Enzyme (ACE), preventing conversion of Angiotensin I to the potent vasoconstrictor Angiotensin II.',
    commonUse: 'Prescribed for Hypertension, Heart Failure management, and Post-Myocardial Infarction kidney protection.',
    foodInteractions: 'Avoid high-potassium salt substitutes or excessive potassium supplements without blood monitoring.',
    category: 'ACE Inhibitor / Antihypertensive',
    isVerified: true
  },
  'metformin': {
    purpose: 'Biguanide Antidiabetic medication that lowers blood glucose levels and improves insulin sensitivity.',
    targetOrgan: 'Liver (Hepatic Gluconeogenesis) & Gastrointestinal Tract',
    mechanismOfAction: 'Activates AMP-activated protein kinase (AMPK), suppressing liver glucose production and increasing muscle glucose uptake.',
    commonUse: 'First-line treatment for Type 2 Diabetes Mellitus and Insulin Resistance.',
    foodInteractions: 'Take directly with meals to reduce GI upset. Ensure adequate Vitamin B12 intake during prolonged use.',
    category: 'Biguanide Antidiabetic',
    isVerified: true
  },
  'clopidogrel': {
    purpose: 'P2Y12 ADP Receptor Antagonist that stops blood platelets from aggregating and forming blood clots in stents or arteries.',
    targetOrgan: 'Blood Platelets & Coronary Vasculature',
    mechanismOfAction: 'Irreversibly blocks the P2Y12 adenosine diphosphate (ADP) receptor on platelet surfaces, suppressing glycoprotein IIb/IIIa activation.',
    commonUse: 'Prescribed for Coronary Artery Disease, Acute Coronary Syndrome, Recent Ischemic Stroke, and Peripheral Artery Disease.',
    foodInteractions: 'Can be taken with or without food. Avoid grapefruit juice in large quantities.',
    category: 'P2Y12 Antiplatelet',
    isVerified: true
  },
  'omeprazole': {
    purpose: 'Proton Pump Inhibitor (PPI) that decreases stomach acid production to heal ulcers and treat acid reflux (GERD).',
    targetOrgan: 'Gastrointestinal System (Gastric Parietal Cells)',
    mechanismOfAction: 'Irreversibly binds to H+/K+ ATPase enzyme system (proton pump) in gastric parietal cells, blocking terminal acid secretion.',
    commonUse: 'Prescribed for Gastroesophageal Reflux Disease (GERD), Gastric Ulcers, and Erosive Esophagitis.',
    foodInteractions: 'Take 30-60 minutes before breakfast for maximum acid suppression efficacy.',
    category: 'Proton Pump Inhibitor (PPI)',
    isVerified: true
  },
  'pantoprazole': {
    purpose: 'Proton Pump Inhibitor (PPI) used for acid suppression and stomach ulcer healing.',
    targetOrgan: 'Gastrointestinal System (Gastric Parietal Cells)',
    mechanismOfAction: 'Inhibits gastric parietal cell proton pumps without interfering with hepatic CYP2C19 antiplatelet metabolism.',
    commonUse: 'Prescribed for GERD, Gastritis, and Peptic Ulcers.',
    foodInteractions: 'Take before morning meal as directed.',
    category: 'Proton Pump Inhibitor (PPI)',
    isVerified: true
  },
  'fluoxetine': {
    purpose: 'Selective Serotonin Reuptake Inhibitor (SSRI) used for mood regulation and anxiety management.',
    targetOrgan: 'Central Nervous System (Serotonergic Synapses)',
    mechanismOfAction: 'Selectively blocks presynaptic serotonin reuptake transporters (SERT), increasing synaptic serotonin concentrations.',
    commonUse: 'Prescribed for Major Depressive Disorder, Panic Disorder, and OCD.',
    foodInteractions: 'Avoid combining with St. John\'s Wort or alcohol.',
    category: 'SSRI Antidepressant',
    isVerified: true
  },
  'tramadol': {
    purpose: 'Central-acting analgesic used for moderate-to-severe pain management.',
    targetOrgan: 'Central Nervous System (Mu-Opioid Receptors & Monoamine Transporters)',
    mechanismOfAction: 'Binds mu-opioid receptors and inhibits norepinephrine and serotonin reuptake in central pain pathways.',
    commonUse: 'Prescribed for Moderate to Severe Acute or Chronic Pain.',
    foodInteractions: 'Strictly avoid alcohol consumption.',
    category: 'Opioid Analgesic',
    isVerified: true
  },
  'amoxicillin': {
    purpose: 'Beta-lactam Antibiotic used to treat susceptible bacterial infections.',
    targetOrgan: 'Bacterial Cell Wall & Systemic Circulation',
    mechanismOfAction: 'Inhibits bacterial penicillin-binding proteins (PBPs), preventing cell wall peptidoglycan synthesis.',
    commonUse: 'Prescribed for Respiratory Tract Infections, Otitis Media, and Skin Infections.',
    foodInteractions: 'Take with food to minimize stomach upset.',
    category: 'Penicillin Antibiotic',
    isVerified: true
  },
  'rantac': {
    purpose: 'H2-Receptor Antagonist that reduces stomach acid output to protect gastric mucosa.',
    targetOrgan: 'Gastrointestinal System (Gastric Parietal H2 Receptors)',
    mechanismOfAction: 'Competitive inhibition of histamine at parietal cell H2 receptors, suppressing basal and nocturnal gastric acid output.',
    commonUse: 'Prescribed for Gastritis, Dengue fever stomach protection, GERD, and Peptic Ulcers.',
    foodInteractions: 'Take after meals as directed on prescription. Avoid excessive caffeine and alcohol.',
    category: 'H2 Receptor Antagonist / Anti-Ulcer',
    isVerified: true
  },
  'ranitidine': {
    purpose: 'H2-Receptor Antagonist that reduces stomach acid output to protect gastric mucosa.',
    targetOrgan: 'Gastrointestinal System (Gastric Parietal H2 Receptors)',
    mechanismOfAction: 'Competitive inhibition of histamine at parietal cell H2 receptors, suppressing basal and nocturnal gastric acid output.',
    commonUse: 'Prescribed for Gastritis, Dengue fever stomach protection, GERD, and Peptic Ulcers.',
    foodInteractions: 'Take after meals as directed on prescription.',
    category: 'H2 Receptor Antagonist / Anti-Ulcer',
    isVerified: true
  },
  'fibro': {
    purpose: 'Nutritional Antioxidant & Support Supplement containing essential vitamins, zinc, and antioxidants.',
    targetOrgan: 'Cellular Metabolism & Vascular Endothelium',
    mechanismOfAction: 'Scavenges reactive oxygen species (ROS) and supports connective tissue recovery during viral infection convalescence.',
    commonUse: 'Prescribed for General Weakness, Dengue recovery, and Immunomodulatory support.',
    foodInteractions: 'Take with water after meals. Food enhances absorption of lipid-soluble components.',
    category: 'Nutritional Supplement / Antioxidant',
    isVerified: true
  },
  'sm fibro': {
    purpose: 'Nutritional Antioxidant & Support Supplement containing essential vitamins, zinc, and antioxidants.',
    targetOrgan: 'Cellular Metabolism & Vascular Endothelium',
    mechanismOfAction: 'Scavenges reactive oxygen species (ROS) and supports connective tissue recovery during viral infection convalescence.',
    commonUse: 'Prescribed for General Weakness, Dengue recovery, and Immunomodulatory support.',
    foodInteractions: 'Take with water after meals.',
    category: 'Nutritional Supplement / Antioxidant',
    isVerified: true
  },
  'dolo': {
    purpose: 'Analgesic & Antipyretic (Paracetamol 650mg) used to relieve fever and body pain.',
    targetOrgan: 'Central Nervous System & Hypothalamic Heat-Regulating Center',
    mechanismOfAction: 'Inhibits central prostaglandin synthesis via COX-3/COX-1 variant enzymes.',
    commonUse: 'Prescribed for Fever, Dengue recovery, Body aches, and Headache.',
    foodInteractions: 'Can be taken with or without food. Avoid excessive alcohol.',
    category: 'Analgesic & Antipyretic',
    isVerified: true
  },
  'crocin': {
    purpose: 'Analgesic & Antipyretic (Paracetamol 500mg/650mg) for fever and pain relief.',
    targetOrgan: 'Central Nervous System & Hypothalamic Heat-Regulating Center',
    mechanismOfAction: 'Inhibits central prostaglandin synthesis.',
    commonUse: 'Prescribed for Fever and Body pain.',
    foodInteractions: 'Take with or without food.',
    category: 'Analgesic & Antipyretic',
    isVerified: true
  },
  'combiflam': {
    purpose: 'Combination NSAID & Analgesic (Ibuprofen + Paracetamol) for acute pain and swelling.',
    targetOrgan: 'Musculoskeletal System & Central Nervous System',
    mechanismOfAction: 'Dual peripheral COX-1/COX-2 inhibition combined with central pain pathway activation.',
    commonUse: 'Prescribed for Joint pain, Dental pain, Dysmenorrhea, and Musculoskeletal injury.',
    foodInteractions: 'Take with food or milk to protect stomach lining.',
    category: 'Combination NSAID & Analgesic',
    isVerified: true
  },
  'pantocid': {
    purpose: 'Proton Pump Inhibitor (Pantoprazole 40mg) for acid suppression.',
    targetOrgan: 'Gastrointestinal System (Gastric Parietal Cells)',
    mechanismOfAction: 'Inhibits parietal cell H+/K+ ATPase proton pumps.',
    commonUse: 'Prescribed for Gastritis, GERD, and Acid Peptic Disease.',
    foodInteractions: 'Take 30 minutes before morning meal.',
    category: 'Proton Pump Inhibitor (PPI)',
    isVerified: true
  },
  'azithromycin': {
    purpose: 'Macrolide Antibiotic used to treat respiratory and soft tissue bacterial infections.',
    targetOrgan: 'Bacterial 50S Ribosomal Subunit & Respiratory Tract',
    mechanismOfAction: 'Binds 50S ribosomal subunit of susceptible microorganisms, suppressing protein synthesis.',
    commonUse: 'Prescribed for Pneumonia, Bronchitis, Sinusitis, and Pharyngitis.',
    foodInteractions: 'Can be taken with or without food.',
    category: 'Macrolide Antibiotic',
    isVerified: true
  },
  'cetirizine': {
    purpose: 'Second-generation Antihistamine used to relieve allergic symptoms.',
    targetOrgan: 'Peripheral H1 Histamine Receptors',
    mechanismOfAction: 'Selective peripheral H1 receptor antagonist preventing histamine-mediated allergic response.',
    commonUse: 'Prescribed for Allergic Rhinitis, Hives, and Sneezing.',
    foodInteractions: 'Avoid alcohol as it may increase drowsiness.',
    category: 'H1 Antihistamine',
    isVerified: true
  },
  'losartan': {
    purpose: 'Angiotensin II Receptor Blocker (ARB) used to lower high blood pressure and protect kidneys.',
    targetOrgan: 'Cardiovascular System & Kidneys (AT1 Receptors)',
    mechanismOfAction: 'Selectively blocks AT1 receptor subtype, suppressing vasoconstriction and aldosterone secretion.',
    commonUse: 'Prescribed for Hypertension and Diabetic Nephropathy.',
    foodInteractions: 'Avoid high potassium salt substitutes.',
    category: 'Angiotensin Receptor Blocker (ARB)',
    isVerified: true
  },
  'atorvastatin': {
    purpose: 'HMG-CoA Reductase Inhibitor (Statin) used to lower LDL cholesterol and prevent cardiovascular events.',
    targetOrgan: 'Liver (HMG-CoA Reductase Enzyme)',
    mechanismOfAction: 'Competitive inhibitor of HMG-CoA reductase, reducing hepatic cholesterol synthesis.',
    commonUse: 'Prescribed for Hyperlipidemia and Prevention of Heart Attack / Stroke.',
    foodInteractions: 'Avoid excessive grapefruit juice.',
    category: 'HMG-CoA Reductase Inhibitor (Statin)',
    isVerified: true
  },
  'abciximab': {
    purpose: 'Potent Glycoprotein IIb/IIIa receptor antagonist antiplatelet drug used to prevent blood clot formation.',
    targetOrgan: 'Blood Platelets & Vascular Endothelium (GPIIb/IIIa Receptors)',
    mechanismOfAction: 'Binds to the intact human platelet GPIIb/IIIa receptor, blocking fibrinogen binding and preventing platelet aggregation.',
    commonUse: 'Prescribed during percutaneous coronary intervention (PCI) and unstable angina. High bleeding precaution required if co-administered.',
    foodInteractions: 'Administered under medical supervision. Avoid combining with unprescribed antiplatelet/anticoagulants.',
    category: 'Glycoprotein IIb/IIIa Antiplatelet',
    isVerified: true
  },
  'vomilast': {
    purpose: 'Antiemetic & Antinauseant combination (Doxylamine 10mg + Pyridoxine 10mg + Folic Acid 2.5mg) used to relieve nausea and vomiting.',
    targetOrgan: 'Central Nervous System (H1 Receptors & Chemoreceptor Trigger Zone)',
    mechanismOfAction: 'Competitive H1-receptor antagonism combined with Vitamin B6 coenzyme action to suppress central nausea pathways.',
    commonUse: 'Prescribed for Nausea, Vomiting, Morning Sickness, and symptomatic viral gastritis/fever recovery.',
    foodInteractions: 'Take after meals as prescribed. May cause mild drowsiness.',
    category: 'Antiemetic / Anti-Nausea Combination',
    isVerified: true
  },
  'doxylamine': {
    purpose: 'Antiemetic & Antinauseant combination used to suppress nausea and vomiting.',
    targetOrgan: 'Central Nervous System (H1 Receptors & CTZ)',
    mechanismOfAction: 'H1-receptor antagonism combined with Pyridoxine coenzyme activity.',
    commonUse: 'Prescribed for Nausea, Vomiting, and Gastrointestinal Distress.',
    foodInteractions: 'Take after food with water.',
    category: 'Antiemetic / Anti-Nausea Combination',
    isVerified: true
  },
  'zoclar': {
    purpose: 'Broad-spectrum Macrolide Antibiotic (Clarithromycin 500mg) used to treat bacterial infections.',
    targetOrgan: 'Bacterial 50S Ribosomal Subunit & Respiratory Tract',
    mechanismOfAction: 'Binds reversibly to the 50S ribosomal subunit of sensitive microorganisms, inhibiting bacterial protein synthesis.',
    commonUse: 'Prescribed for Respiratory Tract Infections, Sinusitis, Skin Infections, and bacterial fever co-infections.',
    foodInteractions: 'Can be taken with or without food. Take at evenly spaced intervals.',
    category: 'Macrolide Antibiotic',
    isVerified: true
  },
  'clarithromycin': {
    purpose: 'Macrolide Antibiotic used to eliminate susceptible bacterial pathogens.',
    targetOrgan: 'Bacterial 50S Ribosomal Subunit',
    mechanismOfAction: 'Inhibits bacterial protein translation by binding to 50S ribosomal subunit.',
    commonUse: 'Prescribed for Bronchitis, Pneumonia, Sinusitis, and Bacterial Infections.',
    foodInteractions: 'Take with water. Maintain fluid intake.',
    category: 'Macrolide Antibiotic',
    isVerified: true
  },
  'gestakind': {
    purpose: 'Peripheral Vasodilator & Uterine Smooth Muscle Relaxant (Isoxsuprine 10mg SR) used to improve perfusion and relax vascular/uterine smooth muscle.',
    targetOrgan: 'Vascular Smooth Muscle & Uterine Myometrium (Beta-Adrenergic Receptors)',
    mechanismOfAction: 'Direct vascular smooth muscle relaxation via beta-adrenoceptor stimulation, producing peripheral vasodilation.',
    commonUse: 'Prescribed for Peripheral Vascular Disorders, Vascular Spasms, and Smooth Muscle Relaxation.',
    foodInteractions: 'Take after meals. Change positions slowly if mild lightheadedness occurs.',
    category: 'Smooth Muscle Relaxant & Peripheral Vasodilator',
    isVerified: true
  },
  'isoxsuprine': {
    purpose: 'Beta-adrenergic Agonist Vasodilator & Smooth Muscle Relaxant.',
    targetOrgan: 'Vascular & Uterine Smooth Muscle',
    mechanismOfAction: 'Stimulates beta-adrenergic receptors causing vascular smooth muscle relaxation.',
    commonUse: 'Prescribed for Peripheral Vascular Disease and Smooth Muscle Spasms.',
    foodInteractions: 'Take after meals.',
    category: 'Smooth Muscle Relaxant & Peripheral Vasodilator',
    isVerified: true
  },
  'digoxin': {
    purpose: 'Cardiac Glycoside used to manage heart failure and slow ventricular rate in atrial fibrillation.',
    targetOrgan: 'Myocardium & Cardiac Na+/K+ ATPase Pump',
    mechanismOfAction: 'Inhibits cardiac Na+/K+ ATPase, increasing intracellular calcium concentration and inotropic heart contractility.',
    commonUse: 'Prescribed for Congestive Heart Failure and Atrial Fibrillation rate control.',
    foodInteractions: 'Take consistently. Avoid high-fiber meals immediately after dosing.',
    category: 'Cardiac Glycoside',
    isVerified: true
  }
};

Object.assign(DRUG_KNOWLEDGE_BASE, {
  'furosemide': {
    purpose: 'Loop diuretic ("water pill") that removes excess fluid from the body.',
    targetOrgan: 'Kidney (loop of Henle)',
    mechanismOfAction: 'Blocks the Na+/K+/2Cl- co-transporter in the thick ascending loop of Henle, increasing salt and water excretion.',
    commonUse: 'Prescribed for fluid overload in heart failure, oedema and high blood pressure.',
    foodInteractions: 'Can lower potassium - potassium-rich foods (bananas, oranges) may be advised. Limit alcohol.',
    category: 'Loop Diuretic',
    isVerified: true
  },
  'amlodipine': {
    purpose: 'Calcium channel blocker that lowers blood pressure and prevents angina.',
    targetOrgan: 'Arterial smooth muscle & coronary arteries',
    mechanismOfAction: 'Blocks L-type calcium channels in vascular smooth muscle, relaxing and widening blood vessels.',
    commonUse: 'Prescribed for hypertension and stable angina.',
    foodInteractions: 'Large amounts of grapefruit juice can modestly raise its level.',
    category: 'Calcium Channel Blocker',
    isVerified: true
  },
  'telmisartan': {
    purpose: 'Angiotensin II receptor blocker (ARB) that lowers blood pressure.',
    targetOrgan: 'Blood vessels, kidney & adrenal gland (AT1 receptors)',
    mechanismOfAction: 'Blocks angiotensin II at AT1 receptors, relaxing blood vessels and reducing aldosterone release.',
    commonUse: 'Prescribed for hypertension and cardiovascular risk reduction.',
    foodInteractions: 'Avoid potassium supplements or salt substitutes unless advised (risk of high potassium).',
    category: 'Angiotensin Receptor Blocker',
    isVerified: true
  },
  'montelukast': {
    purpose: 'Leukotriene receptor antagonist that prevents asthma and allergy symptoms.',
    targetOrgan: 'Airways (bronchial smooth muscle) & nasal mucosa',
    mechanismOfAction: 'Blocks cysteinyl-leukotriene (CysLT1) receptors, reducing airway inflammation and constriction.',
    commonUse: 'Prescribed for asthma prevention and allergic rhinitis.',
    foodInteractions: 'No significant food interactions; usually taken in the evening.',
    category: 'Leukotriene Receptor Antagonist',
    isVerified: true
  },
  'spironolactone': {
    purpose: 'Potassium-sparing diuretic and aldosterone antagonist.',
    targetOrgan: 'Kidney (distal tubule / collecting duct)',
    mechanismOfAction: 'Blocks aldosterone receptors, increasing sodium and water excretion while retaining potassium.',
    commonUse: 'Prescribed for heart failure, resistant hypertension, oedema and hyperaldosteronism.',
    foodInteractions: 'Avoid potassium supplements and salt substitutes (risk of high potassium).',
    category: 'Potassium-Sparing Diuretic',
    isVerified: true
  }
});

export function getDrugKnowledge(medName: string): DrugKnowledge {
  const clean = medName.toLowerCase();
  for (const [key, kb] of Object.entries(DRUG_KNOWLEDGE_BASE)) {
    if (clean.includes(key)) {
      return { ...kb, isVerified: true };
    }
  }

  // Strict Unverified Drug Handling - No generic fake fallback profiles!
  return {
    purpose: `⚠️ Drug not found in official pharmacopeia database. Please check spelling or verify full brand name.`,
    targetOrgan: `Unverified Target`,
    mechanismOfAction: `No verified pharmacological profile available. Unverified entries are safely bypassed from chemical interaction risk modeling.`,
    commonUse: `Unrecognized Entry - Verify exact spelling with physician or pharmacist.`,
    foodInteractions: `Unknown dietary interactions for unverified drug entry.`,
    category: `Unverified Entry`,
    isVerified: false
  };
}

export function enrichAnalysisWithDetails(result: AnalysisResult): AnalysisResult {
  const rawMeds = result?.detectedMedicines || (result as any)?.medicationsAnalyzed || [];
  const rawInteractions = result?.drugInteractions || (result as any)?.interactions || [];

  // 1. Enrich Detected Medicines with Strict Verification Check
  const enrichedMeds = rawMeds.map((med: any) => {
    const medName = typeof med === 'string' ? med : (med.name || 'Unknown Drug');
    const medObj = typeof med === 'string' ? { name: med, dosage: 'Standard', frequency: 'Daily', route: 'Oral' } : med;
    const kb = getDrugKnowledge(medName);
    const isVerified = medObj.isVerified !== undefined ? medObj.isVerified : kb.isVerified;

    if (!isVerified) {
      return {
        ...medObj,
        isVerified: false,
        purpose: '⚠️ Drug not found in official pharmacopeia database. Please check spelling or verify full brand name.',
        targetOrgan: 'Unverified Target',
        mechanismOfAction: 'No verified pharmacological profile available. Unverified entries are safely bypassed from chemical interaction risk modeling.',
        commonUse: 'Unrecognized Entry - Verify spelling with physician.',
        foodInteractions: 'Unknown dietary interactions for unverified entry.',
        category: 'Unverified Entry'
      };
    }

    if (!kb.isVerified) {
      // recognised by the drug dictionary but no detailed profile in this local knowledge base
      const cls = medObj.category || 'Medicine';
      const ingredients = (medObj.ingredients || []).join(' + ') || medName;
      return {
        ...medObj,
        isVerified: true,
        purpose: `${ingredients} - ${cls}.`,
        targetOrgan: 'See product information',
        mechanismOfAction: `Pharmacological class: ${cls}.`,
        commonUse: `Recognised medicine (${ingredients}); detailed profile not in the local knowledge base.`,
        foodInteractions: 'Follow the label and pharmacist advice.',
        category: cls
      };
    }

    return {
      ...medObj,
      isVerified: true,
      purpose: medObj.purpose || kb.purpose,
      targetOrgan: medObj.targetOrgan || kb.targetOrgan,
      mechanismOfAction: medObj.mechanismOfAction || kb.mechanismOfAction,
      commonUse: medObj.commonUse || kb.commonUse,
      foodInteractions: medObj.foodInteractions || kb.foodInteractions,
      category: medObj.category || kb.category
    };
  });

  // 2. Enrich Drug Interactions with "Why Reaction Happened" details
  const enrichedInteractions = rawInteractions.map((inter: any) => {
    let whyReactionHappens = inter.whyReactionHappens;
    let biochemicalPathway = inter.biochemicalPathway;
    let symptomsToWatch = inter.symptomsToWatch;
    let saferAlternative = inter.saferAlternative;
    const med1Name = inter.med1 || inter.pair?.split(' ')[0] || 'Drug 1';
    const med2Name = inter.med2 || inter.pair?.split(' ')[2] || 'Drug 2';

    const pairStr = `${med1Name} ${med2Name}`.toLowerCase();

    if (!whyReactionHappens) {
      if (pairStr.includes('warfarin') && pairStr.includes('aspirin')) {
        whyReactionHappens = 'Why Reaction Happened: Warfarin disables chemical clotting proteins made in your liver, while Aspirin stops blood platelets from sticking together. When taken together, your body loses both major safety nets that stop internal bleeding, causing a synergistic multiplication of hemorrhage risk.';
        biochemicalPathway = 'Dual Pathway Hemostasis Blockade (VKORC1 + COX-1 Suppression)';
        symptomsToWatch = ['Dark black or tarry stools', 'Unexplained dark purple skin bruises', 'Persistent nosebleeds (>15 mins)', 'Blood in urine or coughing up blood'];
        saferAlternative = 'Re-evaluate aspirin indication with your cardiologist. If antiplatelet therapy is necessary, add a protective PPI (Pantoprazole 40mg) to shield the stomach wall.';
      } else if (pairStr.includes('clopidogrel') && pairStr.includes('omeprazole')) {
        whyReactionHappens = 'Why Reaction Happened: Clopidogrel is an inactive prodrug that requires a liver enzyme called CYP2C19 to convert it into its active form. Omeprazole strongly occupies and blocks CYP2C19, preventing Clopidogrel from being activated, leaving your cardiac stents unprotected against blood clots.';
        biochemicalPathway = 'Competitive CYP2C19 Substrate Inhibition';
        symptomsToWatch = ['Chest discomfort / Angina', 'Shortness of breath on exertion', 'Transient ischemic neurological attacks'];
        saferAlternative = 'Switch acid reducer from Omeprazole to Pantoprazole 40mg daily, which does not interfere with CYP2C19 activation.';
      } else if (pairStr.includes('ibuprofen') && pairStr.includes('naproxen')) {
        whyReactionHappens = 'Why Reaction Happened: Ibuprofen and Naproxen Sodium are both strong oral NSAIDs. Taking two systemic NSAIDs together produces additive COX-1 and COX-2 blockade, multiplying stomach ulceration and acute kidney injury risk without providing additional pain relief.';
        biochemicalPathway = 'Additive Systemic COX-1/COX-2 & Renal Prostaglandin Suppression';
        symptomsToWatch = ['Severe epigastric stomach pain', 'Dark coffee-ground vomitus or tarry stools', 'Sudden decrease in urination or swelling in ankles'];
        saferAlternative = 'Discontinue either Ibuprofen or Naproxen. Never combine two systemic oral NSAIDs simultaneously.';
      } else {
        whyReactionHappens = `Why Reaction Happened: Pharmacological interaction detected between ${med1Name} and ${med2Name}. Combined metabolic pathways increase exposure levels.`;
        biochemicalPathway = inter.mechanism || 'Metabolic Pathway Competition';
        symptomsToWatch = ['Dizziness or lightheadedness', 'Nausea or gastric discomfort', 'Unusual fatigue'];
        saferAlternative = 'Discuss dose spacing or therapeutic alternative with your attending clinician.';
      }
    }

    return {
      ...inter,
      whyReactionHappens,
      biochemicalPathway,
      symptomsToWatch,
      saferAlternative
    };
  });

  // 3. Enrich Dynamic Clinical Recommendations
  let enrichedRecs = result.clinicalRecommendations || [];
  if (enrichedRecs.length === 0 || (enrichedRecs.length === 1 && enrichedRecs[0].includes('Standard therapeutic monitoring advised'))) {
    enrichedRecs = [];
    const DRUG_REC_MAP: Record<string, string> = {
      'paracetamol': 'Administer Paracetamol 500mg as directed for pain/fever. Do not exceed 4,000 mg total daily dosage to prevent hepatotoxicity.',
      'ibuprofen': 'Take Ibuprofen with meals or milk to minimize stomach irritation. Avoid combining with other NSAIDs.',
      'naproxen': 'Take Naproxen Sodium with food to minimize gastric acid distress. Maintain adequate fluid intake.',
      'rantac': 'Administer Rantac (Ranitidine 150mg) after meals as prescribed to suppress gastric H2 acid secretion and protect stomach mucosal lining.',
      'ranitidine': 'Administer Ranitidine 150mg after meals to reduce gastric acid production and prevent mucosal irritation.',
      'fibro': 'Take Cap SM Fibro with water after meals to optimize absorption of essential micronutrients and antioxidants during recovery.',
      'sm fibro': 'Take Cap SM Fibro with water after meals to optimize absorption of essential micronutrients and antioxidants during recovery.',
      'aspirin': 'Take Aspirin with food or milk to minimize stomach irritation. Report any unexplained dark bruising or tarry stools immediately.',
      'warfarin': 'Maintain consistent daily Vitamin K dietary intake (green leafy vegetables). Perform routine INR blood clotting tests.',
      'lisinopril': 'Monitor resting blood pressure regularly and consult clinician regarding periodic serum potassium and renal eGFR tests.',
      'metformin': 'Take Metformin with meals to minimize gastrointestinal upset. Ensure annual Vitamin B12 level assessments.',
      'clopidogrel': 'Maintain daily regimen without abrupt discontinuation. Avoid unprescribed OTC NSAIDs.',
      'omeprazole': 'Take Omeprazole 30-60 minutes before breakfast for optimal gastric parietal cell acid suppression.',
      'pantoprazole': 'Take Pantoprazole before morning meal as directed for mucosal ulcer protection.',
      'abciximab': 'Monitor patient closely for potential bleeding hazards. Verify antiplatelet indication with attending physician.',
      'vomilast': 'Take Tab Vomilast after food as prescribed for nausea and vomiting control.',
      'doxylamine': 'Take Doxylamine combination after food. Avoid driving if drowsiness occurs.',
      'zoclar': 'Complete full 3-day course of Cap Zoclar 500 (Clarithromycin) as directed. Do not skip doses.',
      'clarithromycin': 'Administer Clarithromycin at fixed time intervals. Complete full antibiotic course.',
      'gestakind': 'Take Tab Gestakind 10/SR at night as directed. Change positions slowly to avoid orthostatic dizziness.',
      'isoxsuprine': 'Take Isoxsuprine after meals. Monitor blood pressure and pulse rate during therapy.',
      'digoxin': 'Monitor serum potassium levels and digoxin therapeutic concentration (0.5-2.0 ng/mL) regularly.'
    };

    enrichedMeds.filter(m => m.isVerified !== false).forEach((m) => {
      const mLower = m.name.toLowerCase();
      for (const [key, rec] of Object.entries(DRUG_REC_MAP)) {
        if (mLower.includes(key) && !enrichedRecs.includes(rec)) {
          enrichedRecs.push(rec);
        }
      }
    });

    if (enrichedRecs.length === 0) {
      enrichedRecs = [
        'Take all medications strictly as directed on the prescription label.',
        'Maintain optimal daily hydration and schedule routine follow-up checkups with your attending physician.'
      ];
    }
  }

  // 4. Overall risk: keep the level computed by the ML service; derive it only for records without one
  const ORDER: SeverityLevel[] = ['Low', 'Medium', 'High', 'Critical'];
  const derivedRisk = enrichedInteractions.reduce((worst: SeverityLevel, i: any) => {
    const sev = ORDER.includes(i.severity) ? (i.severity as SeverityLevel) : 'Low';
    return ORDER.indexOf(sev) > ORDER.indexOf(worst) ? sev : worst;
  }, 'Low' as SeverityLevel);

  return {
    ...result,
    overallRiskLevel: result.overallRiskLevel || derivedRisk,
    overallConfidenceScore: result.overallConfidenceScore ?? 0,
    detectedMedicines: enrichedMeds,
    drugInteractions: enrichedInteractions,
    clinicalRecommendations: enrichedRecs,
    shapFeatures: result.shapFeatures || []
  };
}
