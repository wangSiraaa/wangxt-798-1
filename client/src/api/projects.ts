import apiClient from './client';
import type { IncomeProject, ProjectDetailResponse } from '../types';

export const getProjects = async (status?: string, type?: string): Promise<IncomeProject[]> => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (type) params.append('type', type);
  const { data } = await apiClient.get(`/projects?${params.toString()}`);
  return data;
};

export const getProjectDetail = async (id: string): Promise<ProjectDetailResponse> => {
  const { data } = await apiClient.get(`/projects/${id}`);
  return data;
};

export const createProject = async (project: Partial<IncomeProject>): Promise<IncomeProject> => {
  const { data } = await apiClient.post('/projects', project);
  return data;
};

export const updateProject = async (id: string, project: Partial<IncomeProject>) => {
  const { data } = await apiClient.put(`/projects/${id}`, project);
  return data;
};

export const deleteProject = async (id: string) => {
  const { data } = await apiClient.delete(`/projects/${id}`);
  return data;
};

export const updateAllocation = async (id: string, details: any[]) => {
  const { data } = await apiClient.post(`/projects/${id}/allocation`, { details });
  return data;
};
