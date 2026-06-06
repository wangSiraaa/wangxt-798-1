import { getProjectDetail } from './projects';
import type { ProjectDetailResponse } from '../types';

const assertProjectDetailResponse = async (projectId: string): Promise<ProjectDetailResponse> => {
  const detail = await getProjectDetail(projectId);

  detail.project.id.toUpperCase();
  detail.contracts.map((contract) => contract.original_name);
  detail.allocations.map((allocation) => allocation.share_ratio);
  detail.publications.map((publication) => publication.allocation_version);
  detail.objections.map((objection) => objection.status);
  detail.settlement?.total_amount.toFixed(2);
  detail.archive?.archive_date.toString();
  detail.logs.map((log) => log.action);

  return detail;
};

void assertProjectDetailResponse;
