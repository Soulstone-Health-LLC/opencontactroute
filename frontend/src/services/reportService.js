import api from "./api";

export const getPathwayViews = (params) =>
  api.get("/reports/pathway-views", { params });
export const getTopPathways = (params) =>
  api.get("/reports/top-pathways", { params });
export const getTopTopics = (params) =>
  api.get("/reports/top-topics", { params });
export const getTopAudiences = (params) =>
  api.get("/reports/top-audiences", { params });
export const getTopPlans = (params) =>
  api.get("/reports/top-plans", { params });
export const getPathwayCoverage = () => api.get("/reports/pathway-coverage");
export const getContentAudit = (params) =>
  api.get("/reports/content-audit", { params });
export const getAuditLog = (params) =>
  api.get("/reports/audit-log", { params });
