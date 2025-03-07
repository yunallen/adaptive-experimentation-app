import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = {
  // Create a new experiment
  createExperiment: async (experimentData) => {
    const response = await axios.post(`${API_URL}/experiments`, experimentData);
    return response.data;
  },
  
  // Get parameters for the next trial
  getNextTrial: async (experimentId) => {
    const response = await axios.get(`${API_URL}/experiments/${experimentId}/next_trial`);
    return response.data;
  },
  
  // Submit trial results
  completeTrialResult: async (experimentId, trialData) => {
    const response = await axios.post(`${API_URL}/experiments/${experimentId}/complete_trial`, trialData);
    return response.data;
  },
  
  // Get Pareto front (for multi-objective optimization)
  getParetoFront: async (experimentId) => {
    const response = await axios.get(`${API_URL}/experiments/${experimentId}/pareto_front`);
    return response.data;
  }
};

export default api;