import API from "./api";

export const auditLogService = {
  list: ({ action, q, centerId, page = 1, limit = 50 } = {}) =>
    API.get("/logs", {
      params: {
        action: action || undefined,
        q: q || undefined,
        centerId: centerId || undefined,
        page,
        limit,
      },
    }),
};

export default auditLogService;
