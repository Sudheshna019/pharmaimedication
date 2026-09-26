from fastapi import APIRouter, Response, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from backend.services.pdf_generator import pdf_service

router = APIRouter(prefix="/reports", tags=["Report Generation"])

class PDFReportRequest(BaseModel):
    id: Optional[str] = "ANALYSIS-9902"
    timestamp: Optional[str] = "2026-07-22"
    patientAge: Optional[int] = 72
    riskScore: Optional[float] = 0.88
    riskLevel: Optional[str] = "High Risk"
    medications: Optional[List[Dict[str, Any]]] = []
    interactions: Optional[List[Dict[str, Any]]] = []

@router.post("/generate-pdf")
def generate_pdf_report(payload: PDFReportRequest):
    """
    Generates a 2-page ReportLab clinical PDF report.
    """
    try:
        pdf_bytes = pdf_service.generate_clinical_pdf(payload.model_dump())
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=RxShield_Report_{payload.id}.pdf"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation error: {str(e)}")
