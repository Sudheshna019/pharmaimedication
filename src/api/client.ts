import axios from 'axios';

// Normalize API Base URL
const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
const API_BASE_URL = rawBaseUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 90000, // 90s timeout threshold for ML & OCR processing
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to inject Firebase auth token if present
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('rx_firebase_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor for consistent error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    let errorMsg = 'Failed to connect to the ML pipeline. Is your FastAPI server running?';
    if (error.response?.data?.detail) {
      errorMsg = typeof error.response.data.detail === 'string'
        ? error.response.data.detail
        : JSON.stringify(error.response.data.detail);
    } else if (error.code === 'ECONNABORTED') {
      errorMsg = 'Request timed out while connecting to the ML processing pipeline. Please try again.';
    } else if (error.message === 'Network Error') {
      errorMsg = 'Network error: Cannot reach the backend API server. Check server status and CORS configuration.';
    }
    return Promise.reject(new Error(errorMsg));
  }
);

export const apiService = {
  verifyToken: async (idToken: string) => {
    const response = await apiClient.post('/api/v1/auth/verify-token', { idToken });
    return response.data;
  },

  extractPrescriptionOCR: async (imageBase64: string, fileName?: string) => {
    const response = await apiClient.post('/api/v1/ocr/extract-prescription', { imageBase64, fileName });
    return response.data;
  },

  predictInteraction: async (
    patientData: { age: number; gender: string; egfr: number }, 
    medications: any[],
    userId?: string
  ) => {
    const activeUserId = userId || localStorage.getItem('rx_user_uid') || 'usr_guest';
    const response = await apiClient.post('/api/v1/analysis/predict-interaction', {
      patientData,
      medications,
      userId: activeUserId
    });
    return response.data;
  },

  lookupKnowledgeBase: async (med1: string, med2: string) => {
    const response = await apiClient.get('/api/v1/kb/lookup', {
      params: { med1, med2 }
    });
    return response.data;
  },

  downloadPDFReport: async (reportPayload: any) => {
    const response = await apiClient.post('/api/v1/reports/generate-pdf', reportPayload, {
      responseType: 'blob'
    });
    return response.data;
  }
};

