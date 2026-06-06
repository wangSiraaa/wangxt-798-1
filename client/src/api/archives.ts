import apiClient from './client';
import type { Archive } from '../types';

export const getArchives = async (projectId?: string): Promise<Archive[]> => {
  const params = projectId ? `?projectId=${projectId}` : '';
  const { data } = await apiClient.get(`/archives${params}`);
  return data;
};

export const createArchive = async (archive: Partial<Archive>): Promise<Archive> => {
  const { data } = await apiClient.post('/archives', archive);
  return data;
};

export const deleteArchive = async (id: string) => {
  const { data } = await apiClient.delete(`/archives/${id}`);
  return data;
};
