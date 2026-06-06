import apiClient from './client';
import type { Settlement } from '../types';

export const getSettlements = async (projectId?: string): Promise<Settlement[]> => {
  const params = projectId ? `?projectId=${projectId}` : '';
  const { data } = await apiClient.get(`/settlements${params}`);
  return data;
};

export const createSettlement = async (settlement: Partial<Settlement>): Promise<Settlement> => {
  const { data } = await apiClient.post('/settlements', settlement);
  return data;
};

export const deleteSettlement = async (id: string) => {
  const { data } = await apiClient.delete(`/settlements/${id}`);
  return data;
};
