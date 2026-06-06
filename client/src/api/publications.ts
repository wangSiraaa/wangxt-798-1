import apiClient from './client';
import type { Publication } from '../types';

export const getPublications = async (status?: string, projectId?: string): Promise<Publication[]> => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (projectId) params.append('projectId', projectId);
  const { data } = await apiClient.get(`/publications?${params.toString()}`);
  return data;
};

export const createPublication = async (pub: Partial<Publication>): Promise<Publication> => {
  const { data } = await apiClient.post('/publications', pub);
  return data;
};

export const republish = async (id: string): Promise<Publication> => {
  const { data } = await apiClient.post(`/publications/${id}/republish`);
  return data;
};

export const deletePublication = async (id: string) => {
  const { data } = await apiClient.delete(`/publications/${id}`);
  return data;
};
