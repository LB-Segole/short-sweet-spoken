
import api from './api';
import { Campaign } from '../types';

class CampaignService {
  async getAllCampaigns(): Promise<Campaign[]> {
    const response = await api.get('/campaigns');
    return response.data;
  }

  async getCampaignById(id: string): Promise<Campaign> {
    const response = await api.get(`/campaigns/${id}`);
    return response.data;
  }

  async createCampaign(campaignData: Partial<Campaign>): Promise<Campaign> {
    const response = await api.post('/campaigns', campaignData);
    return response.data;
  }

  async updateCampaign(id: string, campaignData: Partial<Campaign>): Promise<Campaign> {
    const response = await api.put(`/campaigns/${id}`, campaignData);
    return response.data;
  }

  async deleteCampaign(id: string): Promise<void> {
    await api.delete(`/campaigns/${id}`);
  }
}

export const campaignService = new CampaignService();
