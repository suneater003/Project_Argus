import axios from 'axios';

const API_URL = 'http://localhost:3001/api/analyze';

export const analyzeTranscript = async (file) => {
  const formData = new FormData();
  formData.append('transcript', file);

  try {
    const response = await axios.post(API_URL, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    throw error.response?.data?.error || 'Failed to analyze transcript.';
  }
};