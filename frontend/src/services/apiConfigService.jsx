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

  // Portal: list a campaign's APIs by name (all roles).
  listByCampaign: ({ centerId, campaignName }) =>
    API.get(`/api-configs/by-campaign`, { params: { centerId, campaignName } }),

  // Portal: push a specific lead through an API and get back request + response.
  executeForLead: (id, { recordId, customValues }) =>
    API.post(`/api-configs/${id}/execute-lead`, { recordId, customValues: customValues || {} }),
};