import apiClient from './client';
import type { Objection } from '../types';

export const getObjections = async (status?: string, projectId?: string): Promise<Objection[]> => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (projectId) params.append('projectId', projectId);
  const { data } = await apiClient.get(`/objections?${params.toString()}`);
  return data;
};

export const createObjection = async (obj: Partial<Objection>): Promise<Objection> => {
  const { data } = await apiClient.post('/objections', obj);
  return data;
};

export const replyObjection = async (id: string, reply: string) => {
  const { data } = await apiClient.post(`/objections/${id}/reply`, { reply });
  return data;
};

export const deleteObjection = async (id: string) => {
  const { data } = await apiClient.delete(`/objections/${id}`);
  return data;
};
