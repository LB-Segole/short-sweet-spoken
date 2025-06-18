
import api from './api';
import { Call } from '../types';

class CallService {
  async getAllCalls(): Promise<Call[]> {
    const response = await api.get('/calls');
    return response.data;
  }

  async getCallById(id: string): Promise<Call> {
    const response = await api.get(`/calls/${id}`);
    return response.data;
  }

  async getCallsByCampaign(campaignId: string): Promise<Call[]> {
    const response = await api.get(`/campaigns/${campaignId}/calls`);
    return response.data;
  }

  async initiateCall(campaignId: string, contactId: string): Promise<Call> {
    const response = await api.post('/calls', { campaignId, contactId });
    return response.data;
  }

  async updateCallStatus(id: string, status: Call['status']): Promise<Call> {
    const response = await api.put(`/calls/${id}/status`, { status });
    return response.data;
  }
}

export const callService = new CallService();
