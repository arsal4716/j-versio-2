import API from "./api";

export const settingsService = {
  // campaignName omitted/null => center default; provided => campaign override
  get: (centerId, campaignName) =>
    API.get(`/settings/${centerId}`, {
      params: campaignName ? { campaignName } : {},
    }),

  update: (centerId, payload) => API.put(`/settings/${centerId}`, payload),

  // { agentCrm } for the logged-in user's center — drives CRM visibility.
  getUiAccess: () => API.get(`/settings/ui-access`),
};

export default settingsService;
