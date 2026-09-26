# backend/services/feature_engineering.py

def _compile_keyword_sets():
    """Compiles lists of high-risk medication and ADR keywords."""
    return {
        "blood_thinners": ["warfarin", "aspirin", "heparin", "clopidogrel", "plavix", "eliquis"],
        "nsaids": ["ibuprofen", "naproxen", "celebrex", "meloxicam", "diclofenac"],
        "adr_symptoms": ["bleeding", "bruising", "nausea", "dizziness", "ulcer", "rash"]
    }

def _count_keyword_matches(text: str, keyword_set: list) -> int:
    """Counts how many times keywords from a specific set appear in the OCR text."""
    if not text:
        return 0
    
    text_lower = text.lower()
    count = 0
    for word in keyword_set:
        if word.lower() in text_lower:
            count += 1
            
    return count

def _derive_clinical_severity(high_risk_count: int, moderate_risk_count: int, patient_age: int) -> str:
    """Derives the clinical severity risk level for the SHAP UI."""
    # Elderly patients with high-risk drugs are automatically elevated
    if high_risk_count >= 2 or (high_risk_count >= 1 and patient_age > 65):
        return "High"
    elif high_risk_count == 1 or moderate_risk_count >= 2:
        return "Moderate"
    else:
        return "Low"