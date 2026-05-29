import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem('argus_token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

function normalizeApiError(error, fallbackMessage) {
  const message = error.response?.data?.error || fallbackMessage;
  const normalized = new Error(message);
  normalized.status = error.response?.status;
  normalized.payload = error.response?.data;
  return normalized;
}

export async function signIn(email, password) {
  try {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  } catch (error) {
    throw normalizeApiError(error, 'Failed to login.');
  }
}

export async function signUp(email, password) {
  try {
    const response = await api.post('/auth/signup', { email, password });
    return response.data;
  } catch (error) {
    throw normalizeApiError(error, 'Failed to create account.');
  }
}

export async function analyzeTranscript(file) {
  const formData = new FormData();
  const transcriptFile = typeof file === 'string'
    ? new File([file], 'pasted-transcript.txt', { type: 'text/plain' })
    : file;

  formData.append('transcript', transcriptFile);

  try {
    const response = await api.post('/analyze', formData);
    return response.data;
  } catch (error) {
    throw normalizeApiError(error, 'Failed to analyze transcript.');
  }
}

export async function fetchHistory() {
  try {
    const response = await api.get('/history');
    return response.data;
  } catch (error) {
    throw normalizeApiError(error, 'Failed to load call history.');
  }
}
