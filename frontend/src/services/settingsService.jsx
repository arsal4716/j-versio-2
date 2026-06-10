import API from "./api";

export const settingsService = {
  // campaignName omitted/null => center default; provided => campaign override
  get: (centerId, campaignName) =>
    API.get(`/settings/${centerId}`, {
      params: campaignName ? { campaignName } : {},
    }),

  update: (centerId, payload) => API.put(`/settings/${centerId}`, payload),
};

export default settingsService;
