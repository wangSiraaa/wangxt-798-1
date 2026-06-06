export interface IncomeProject {
  id: string;
  name: string;
  type: string;
  amount: number;
  description: string;
  status: 'draft' | 'published' | 'settled' | 'archived';
  created_by: string;
  created_at: string;
  updated_at: string;
  allocation_rules: string;
  allocation_version: number;
  ruleStatus?: RuleStatus;
}

export interface RuleStatus {
  hasContract: boolean;
  inPublicationPeriod: boolean;
  hasUnrepliedObjections: boolean;
  allocationChanged: boolean;
  isSettled: boolean;
}

export interface Contract {
  id: string;
  project_id: string;
  filename: string;
  original_name: string;
  file_path: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at: string;
}

export interface AllocationDetail {
  id: string;
  project_id: string;
  owner_name: string;
  unit_number: string;
  share_ratio: number;
  amount: number;
  created_at: string;
  version: number;
}

export interface Publication {
  id: string;
  project_id: string;
  title: string;
  start_date: string;
  end_date: string;
  status: string;
  published_by: string;
  created_at: string;
  allocation_version: number;
}

export interface Objection {
  id: string;
  project_id: string;
  publication_id?: string;
  owner_name: string;
  contact: string;
  content: string;
  status: 'pending' | 'replied';
  reply?: string;
  replied_at?: string;
  replied_by?: string;
  created_at: string;
}

export interface Settlement {
  id: string;
  project_id: string;
  settlement_date: string;
  total_amount: number;
  status: string;
  created_by: string;
  created_at: string;
  remarks: string;
}

export interface Archive {
  id: string;
  project_id: string;
  archive_date: string;
  archived_by: string;
  status: string;
  created_at: string;
}

export interface OperationLog {
  id: string;
  project_id?: string;
  action: string;
  operator: string;
  details?: string;
  created_at: string;
  ip_address?: string;
}

export interface RuleError {
  rule: string;
  message: string;
}

export interface ProjectDetailResponse {
  project: IncomeProject;
  contracts: Contract[];
  allocations: AllocationDetail[];
  publications: Publication[];
  objections: Objection[];
  settlement: Settlement | null;
  archive: Archive | null;
  logs: OperationLog[];
}

export type ProjectType = 'parking' | 'advertisement' | 'booth' | 'other';

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  parking: '停车费',
  advertisement: '广告位',
  booth: '摊位',
  other: '其他'
};

export const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  published: '公示中',
  settled: '已结转',
  archived: '已归档'
};

export const STATUS_COLORS: Record<string, string> = {
  draft: '#9ca3af',
  published: '#3b82f6',
  settled: '#10b981',
  archived: '#6b7280'
};
