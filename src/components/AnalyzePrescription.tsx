import React, { useState, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import { apiService } from '../api/client';
import { 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  X, 
  CheckCircle2, 
  Sparkles, 
  AlertCircle, 
  ArrowRight,
  ZoomIn,
  Loader2,
  ScanText,
  Brain,
  Zap,
  RotateCcw,
  Lock,
  UserCheck
} from 'lucide-react';
import { AnalysisResult, ClinicianUser } from '../types';
import { enrichAnalysisWithDetails } from '../utils/pharmacology';
import { parsePrescriptionOCR } from '../utils/prescriptionParser';

import { syncAnalysisToFirestore } from '../firebase';

import * as pdfjsLib from 'pdfjs-dist';

// Set GlobalWorkerOptions workerSrc for pdfjs-dist
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
}

interface AnalyzePrescriptionProps {
  onAnalysisComplete: (result: AnalysisResult) => void;
  onRunDemo: () => void;
  clinician: ClinicianUser;
  onOpenAuth: () => void;
}

export const AnalyzePrescription: React.FC<AnalyzePrescriptionProps> = ({
  onAnalysisComplete,
  onRunDemo,
  clinician,
  onOpenAuth
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [extractedPdfText, setExtractedPdfText] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const processFile = useCallback(async (file: File) => {
    if (!clinician.authenticated) {
      setErrorMsg('Authentication required. Please sign in or create an account to run prescription analysis.');
      onOpenAuth();
      return;
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.pdf')) {
      setErrorMsg('Invalid file format. Please upload PNG, JPEG, JPG, or PDF.');
      return;
    }

    setErrorMsg(null);
    setSelectedFile(file);
    setUploadProgress(10);
    setExtractedPdfText('');

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      try {
        setUploadProgress(40);
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdf = await loadingTask.promise;

        let pdfTextCombined = '';
        for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageStrings = textContent.items.map((item: any) => item.str);
          pdfTextCombined += pageStrings.join(' ') + '\n';
        }
        setExtractedPdfText(pdfTextCombined);

        // Render Page 1 to High-Resolution Canvas Image (2.0x scale)
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          await page.render({ canvasContext: ctx, viewport }).promise;
          const canvasJpeg = canvas.toDataURL('image/jpeg', 0.90);
          setFilePreviewUrl(canvasJpeg);
        } else {
          const reader = new FileReader();
          reader.onload = () => setFilePreviewUrl(reader.result as string);
          reader.readAsDataURL(file);
        }
        setUploadProgress(100);
      } catch (pdfErr) {
        console.warn('PDF.js client render notice, falling back to FileReader:', pdfErr);
        const reader = new FileReader();
        reader.onload = () => {
          setFilePreviewUrl(reader.result as string);
          setUploadProgress(100);
        };
        reader.readAsDataURL(file);
      }
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const rawDataUrl = reader.result as string;
        
        // Client-side Canvas Image Compression for Instant Upload
        const img = new Image();
        img.onload = () => {
          const maxDim = 2000;
          const minDim = 1400; // small photos are upscaled so Tesseract can read the text
          let width = img.width;
          let height = img.height;

          if (Math.max(width, height) < minDim) {
            const scale = minDim / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          } else if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            setFilePreviewUrl(canvas.toDataURL('image/jpeg', 0.90));
          } else {
            setFilePreviewUrl(rawDataUrl);
          }
          setUploadProgress(100);
        };
        img.onerror = () => {
          setFilePreviewUrl(rawDataUrl);
          setUploadProgress(100);
        };
        img.src = rawDataUrl;
      };
      reader.readAsDataURL(file);
    }
  }, [clinician, onOpenAuth]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles[0]) {
      processFile(acceptedFiles[0]);
    }
  }, [processFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/pdf': ['.pdf']
    },
    noClick: !clinician.authenticated
  });

  const handleClearFile = () => {
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setUploadProgress(0);
    setErrorMsg(null);
  };

  const executeExtraction = async () => {
    if (!clinician.authenticated) {
      setErrorMsg('Authentication required. Please sign in or create an account to run prescription analysis.');
      onOpenAuth();
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);

    const steps = [
      'OCR: Reading the printed prescription text...',
      'Medicine Normalization: Mapping brand names to generic drugs...',
      'Interaction Engine: Checking every pair of medicines...',
      'ML Models: Predicting interactions & adverse reactions...'
    ];

    for (let i = 0; i < steps.length; i++) {
      setAnalysisStep(steps[i]);
      await new Promise((r) => setTimeout(r, 400));
    }

    try {
      // 1. Text: digital PDFs use their text layer; images are read by Tesseract OCR on the server
      let parsedData = extractedPdfText ? parsePrescriptionOCR(extractedPdfText) : null;
      if (!parsedData || parsedData.medicines.length === 0) {
        const ocrResult = await apiService.extractPrescriptionOCR(filePreviewUrl || '', selectedFile?.name || '');
        parsedData = ocrResult?.data?.parsed || parsePrescriptionOCR(ocrResult?.data?.extracted_text || '');
      }
      const extractedMeds = (parsedData?.medicines || []).map((m) => ({
        id: m.id, name: m.name, dosage: m.dosage, frequency: m.frequency, route: m.route
      }));
      if (extractedMeds.length === 0) {
        setErrorMsg('No medication names could be automatically recognized from this image/document. Please ensure the prescription photo is clear and well-lit, or use Manual Entry.');
        setIsAnalyzing(false);
        return;
      }

      // 2. Patient details are taken only from the prescription itself
      const patientName = parsedData!.patientName || 'Not mentioned in prescription';
      const patientAge = parsedData!.patientAge || 0;
      const patientGender = parsedData!.patientGender || 'Not mentioned';

      // 3. ML pipeline (interaction + adverse reaction models)
      const mlResponse = await apiService.predictInteraction(
        { age: patientAge || null, gender: patientGender, egfr: null },
        extractedMeds,
        clinician.id
      );

      if (mlResponse.success) {
        const resultData: AnalysisResult = {
          ...mlResponse.data,
          id: mlResponse.data?.id || `ANALYSIS-${Date.now().toString().slice(-4)}`,
          timestamp: new Date().toLocaleString(),
          patientId: 'PAT-OCR',
          patientName,
          patientAge,
          patientGender,
          status: 'Completed'
        };
        const enriched = enrichAnalysisWithDetails(resultData);
        syncAnalysisToFirestore(clinician.id, enriched);
        onAnalysisComplete(enriched);
      }
    } catch (err: any) {
      console.error('Analysis failed:', err);
      setErrorMsg(err.message || "Prescription extraction encountered a timeout notice. Please check server connectivity or try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-6">
      {/* Page Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-black text-[#1565C0] bg-blue-50 border border-blue-100 px-3 py-1 rounded-full mb-2 uppercase tracking-wider">
            <ScanText className="w-3.5 h-3.5" /> Prescription OCR Module
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-poppins tracking-tight">
            Analyze Prescription Image / PDF
          </h1>
        </div>
      </div>

      {/* Main Drag and Drop Container */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
        {!clinician.authenticated ? (
          /* Authentication Lock Card */
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white rounded-3xl p-8 sm:p-10 text-center space-y-6 border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-rose-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-8 h-8" />
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-xl font-extrabold font-poppins text-white">
                Authentication Required to Upload Prescriptions
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-normal">
                Uploading prescription files (PDF or Images) is restricted for unauthenticated users to enforce HIPAA compliance and audit trails. Please sign in or create an account to enable uploading.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={onOpenAuth}
                className="w-full sm:w-auto bg-[#1565C0] hover:bg-blue-600 text-white font-bold text-xs px-6 py-3 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserCheck className="w-4 h-4 text-sky-200" />
                Sign In / Create Account
              </button>

              <button
                onClick={onRunDemo}
                className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs px-5 py-3 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Zap className="w-4 h-4 text-amber-400" />
                Try Sample Polypharmacy Demo
              </button>
            </div>
          </div>
        ) : !selectedFile ? (
          /* Logged In File Drop Zone using react-dropzone */
          <div
            {...getRootProps()}
            className={`border-2 border-dashed ${isDragActive ? 'border-[#1565C0] bg-blue-50/80 scale-[1.01]' : 'border-slate-200 hover:border-[#1565C0] bg-slate-50 hover:bg-blue-50/50'} rounded-3xl p-10 text-center transition-all cursor-pointer group space-y-4`}
          >
            <input {...getInputProps()} />
            <div className="w-16 h-16 rounded-2xl bg-white text-[#1565C0] border border-slate-200 flex items-center justify-center mx-auto shadow-sm group-hover:scale-105 transition-transform">
              <Upload className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <p className="text-base font-bold text-slate-900 font-poppins">
                {isDragActive ? 'Drop prescription file here...' : 'Drag and drop your prescription file here'}
              </p>
              <p className="text-xs text-slate-400 font-medium">
                Supports <span className="font-bold text-slate-700">PNG, JPEG, JPG, or PDF</span> up to 25 MB
              </p>
            </div>

            <Button
              variant="contained"
              sx={{
                bgcolor: '#1565C0',
                '&:hover': { bgcolor: '#0D47A1' },
                textTransform: 'none',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '0.8125rem'
              }}
            >
              Browse Local Files
            </Button>
          </div>
        ) : (
          /* File Preview State */
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-[#1565C0] flex items-center justify-center font-bold">
                  {selectedFile.type.includes('pdf') ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 font-poppins">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB • Ready for AI Parsing</p>
                </div>
              </div>

              <button
                onClick={handleClearFile}
                disabled={isAnalyzing}
                className="text-slate-400 hover:text-rose-600 p-2 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
                title="Remove file"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Upload Progress Bar */}
            {uploadProgress > 0 && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-600">
                  <span>Upload & Buffer Status</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Image Preview Canvas */}
            {filePreviewUrl && (
              <div className="relative bg-slate-900 rounded-xl overflow-hidden border border-slate-700 p-2 max-h-96 flex items-center justify-center group">
                <img
                  src={filePreviewUrl}
                  alt="Prescription Preview"
                  className="max-h-88 object-contain rounded-lg"
                />
                <div className="absolute top-4 right-4 bg-slate-900/80 text-white text-[11px] font-mono px-3 py-1 rounded-full backdrop-blur-xs flex items-center gap-1.5 border border-slate-700">
                  <ZoomIn className="w-3.5 h-3.5 text-sky-400" /> Image Inspector Ready
                </div>
              </div>
            )}

            {/* Extraction Trigger Button */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={handleClearFile}
                disabled={isAnalyzing}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Choose Different File
              </button>

              <button
                onClick={executeExtraction}
                disabled={isAnalyzing}
                className="bg-[#1565C0] hover:bg-blue-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    Executing OCR & AI Analysis...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-sky-200" />
                    Extract Medicines & Predict Risks
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Loading Overlay State */}
        {isAnalyzing && (
          <div className="bg-slate-900 text-white rounded-xl p-6 space-y-4 border border-slate-800 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 text-sky-400 flex items-center justify-center">
                <Brain className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-bold font-poppins text-slate-100">AI Deep Neural Network Analysis in Progress</p>
                <p className="text-xs text-sky-300 font-mono">{analysisStep}</p>
              </div>
            </div>

            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-sky-400 via-blue-500 to-emerald-400 h-full w-full animate-pulse"></div>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 flex items-center gap-3 text-xs">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <p className="font-medium">{errorMsg}</p>
          </div>
        )}
      </div>
    </div>
  );
};
