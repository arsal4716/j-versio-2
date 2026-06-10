import API from "./api";

export const dncService = {
  // Real-time phone check used on the form page.
  check: ({ centerId, campaignName = null, phone }) =>
    API.post("/dnc/check", { centerId, campaignName, phone }),

  // Internal DNC management.
  stats: (centerId) => API.get("/dnc/internal/stats", { params: { centerId } }),

  list: (centerId, campaignName, { page = 1, limit = 50, q = "" } = {}) =>
    API.get("/dnc/internal", {
      params: { centerId, campaignName: campaignName || undefined, page, limit, q },
    }),

  upload: (centerId, campaignName, file) => {
    const form = new FormData();
    form.append("file", file);
    form.append("centerId", centerId);
    if (campaignName) form.append("campaignName", campaignName);
    return API.post("/dnc/internal/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  add: (centerId, campaignName, phones) =>
    API.post("/dnc/internal", { centerId, campaignName: campaignName || null, phones }),

  remove: (centerId, id) =>
    API.delete(`/dnc/internal/${id}`, { params: { centerId } }),

  clear: (centerId, campaignName) =>
    API.delete("/dnc/internal", {
      params: { centerId, campaignName: campaignName || undefined },
    }),
};

export default dncService;
