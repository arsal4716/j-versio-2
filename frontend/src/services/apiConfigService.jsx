import API from "./api";   

export const apiConfigService = {
  list: ({ centerId, campaignId }) =>
    API.get(`/api-configs`, { params: { centerId, campaignId } }),

  create: (data) => API.post(`/api-configs`, data),

  update: (id, patch) =>
    API.patch(`/api-configs/${id}`, patch),

  toggle: (id, status) =>
    API.patch(`/api-configs/${id}/toggle`, { status }),

  remove: (id) =>
    API.delete(`/api-configs/${id}`),

  execute: (id, runtime) =>
    API.post(`/api-configs/${id}/execute`, runtime || {}),
};