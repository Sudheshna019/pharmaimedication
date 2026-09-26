import base64
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional, Dict, Any
from backend.services.textract_ocr import textract_service

router = APIRouter(prefix="/ocr", tags=["OCR Extraction"])

class OCRBase64Request(BaseModel):
    imageBase64: str
    filename: Optional[str] = "prescription.png"

@router.post("/extract-prescription")
def extract_prescription_text(payload: OCRBase64Request):
    """
    Extracts text and structured prescription line items using AWS Textract.
    """
    try:
        raw_b64 = payload.imageBase64
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",")[1]
        
        image_bytes = base64.b64decode(raw_b64)
        result = textract_service.extract_prescription_text(image_bytes)
        
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Textract extraction failed: {str(e)}")
