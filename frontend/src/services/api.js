
import axios from 'axios';

const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');
const API_BASE_URL = configuredApiBaseUrl;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
});

const requireApiBaseUrl = () => {
  if (!API_BASE_URL) {
    throw new Error(
      'VITE_API_BASE_URL is not configured. Set it in Vercel to the Render backend External URL.'
    );
  }
};

export const uploadImages = async (files, onUploadProgress) => {
  requireApiBaseUrl();
  if (!files || files.length !== 5) {
    throw new Error('Please select exactly five thermal TIFF images.');
  }

  const formData = new FormData();

  files.forEach((file) => {
    formData.append('files', file);
  });

  const response = await api.post('/upload', formData, {
    onUploadProgress,
  });

  return response.data;
};

export const predict = async (sequence = '') => {
  requireApiBaseUrl();
  const response = await api.post('/predict', {
    sequence: sequence || '',
  });

  return response.data;
};

export const checkHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

export default api;
