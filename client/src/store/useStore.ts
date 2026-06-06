import { create } from 'zustand';
import type { IncomeProject, Contract, Publication, Objection, Settlement, Archive, AllocationDetail, OperationLog } from '../types';
import * as projectApi from '../api/projects';
import * as publicationApi from '../api/publications';
import * as objectionApi from '../api/objections';
import * as settlementApi from '../api/settlements';
import * as archiveApi from '../api/archives';

interface AppState {
  projects: IncomeProject[];
  selectedProject: IncomeProject | null;
  projectDetail: {
    contracts: Contract[];
    allocations: AllocationDetail[];
    publications: Publication[];
    objections: Objection[];
    settlement: Settlement | null;
    archive: Archive | null;
    logs: OperationLog[];
  } | null;
  loading: boolean;
  error: string | null;
  
  fetchProjects: (status?: string, type?: string) => Promise<void>;
  fetchProjectDetail: (id: string) => Promise<void>;
  createProject: (project: Partial<IncomeProject>) => Promise<any>;
  updateProject: (id: string, project: Partial<IncomeProject>) => Promise<any>;
  deleteProject: (id: string) => Promise<void>;
  
  createPublication: (pub: any) => Promise<any>;
  createObjection: (obj: any) => Promise<any>;
  replyObjection: (id: string, reply: string) => Promise<any>;
  createSettlement: (data: any) => Promise<any>;
  createArchive: (data: any) => Promise<any>;
  
  clearSelected: () => void;
  setError: (error: string | null) => void;
}

export const useStore = create<AppState>((set, get) => ({
  projects: [],
  selectedProject: null,
  projectDetail: null,
  loading: false,
  error: null,

  fetchProjects: async (status, type) => {
    set({ loading: true, error: null });
    try {
      const projects = await projectApi.getProjects(status, type);
      set({ projects, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, loading: false });
    }
  },

  fetchProjectDetail: async (id) => {
    set({ loading: true, error: null });
    try {
      const detail = await projectApi.getProjectDetail(id);
      set({ 
        selectedProject: detail.project,
        projectDetail: {
          contracts: detail.contracts,
          allocations: detail.allocations,
          publications: detail.publications,
          objections: detail.objections,
          settlement: detail.settlement,
          archive: detail.archive,
          logs: detail.logs
        },
        loading: false 
      });
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, loading: false });
    }
  },

  createProject: async (project) => {
    set({ loading: true, error: null });
    try {
      const result = await projectApi.createProject(project);
      await get().fetchProjects();
      set({ loading: false });
      return result;
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, loading: false });
      throw err;
    }
  },

  updateProject: async (id, project) => {
    set({ loading: true, error: null });
    try {
      const result = await projectApi.updateProject(id, project);
      await get().fetchProjects();
      await get().fetchProjectDetail(id);
      set({ loading: false });
      return result;
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, loading: false });
      throw err;
    }
  },

  deleteProject: async (id) => {
    set({ loading: true, error: null });
    try {
      await projectApi.deleteProject(id);
      await get().fetchProjects();
      set({ selectedProject: null, projectDetail: null, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, loading: false });
      throw err;
    }
  },

  createPublication: async (pub) => {
    set({ loading: true, error: null });
    try {
      const result = await publicationApi.createPublication(pub);
      if (pub.project_id) {
        await get().fetchProjectDetail(pub.project_id);
      }
      await get().fetchProjects();
      set({ loading: false });
      return result;
    } catch (err: any) {
      set({ error: err.response?.data?.errors?.[0]?.message || err.message, loading: false });
      throw err;
    }
  },

  createObjection: async (obj) => {
    set({ loading: true, error: null });
    try {
      const result = await objectionApi.createObjection(obj);
      if (obj.project_id) {
        await get().fetchProjectDetail(obj.project_id);
      }
      set({ loading: false });
      return result;
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, loading: false });
      throw err;
    }
  },

  replyObjection: async (id, reply) => {
    set({ loading: true, error: null });
    try {
      const result = await objectionApi.replyObjection(id, reply);
      const selected = get().selectedProject;
      if (selected) {
        await get().fetchProjectDetail(selected.id);
      }
      set({ loading: false });
      return result;
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, loading: false });
      throw err;
    }
  },

  createSettlement: async (data) => {
    set({ loading: true, error: null });
    try {
      const result = await settlementApi.createSettlement(data);
      if (data.project_id) {
        await get().fetchProjectDetail(data.project_id);
      }
      await get().fetchProjects();
      set({ loading: false });
      return result;
    } catch (err: any) {
      set({ error: err.response?.data?.errors?.[0]?.message || err.message, loading: false });
      throw err;
    }
  },

  createArchive: async (data) => {
    set({ loading: true, error: null });
    try {
      const result = await archiveApi.createArchive(data);
      if (data.project_id) {
        await get().fetchProjectDetail(data.project_id);
      }
      await get().fetchProjects();
      set({ loading: false });
      return result;
    } catch (err: any) {
      set({ error: err.response?.data?.errors?.[0]?.message || err.message, loading: false });
      throw err;
    }
  },

  clearSelected: () => {
    set({ selectedProject: null, projectDetail: null });
  },

  setError: (error) => set({ error })
}));
