// frontend/src/services/formSetupService.js
import api from "./api";

export const formSetupService = {
  create: async (payload) => {
    const form = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (key === "fields") {
        form.append(key, JSON.stringify(value));
      } else {
        form.append(key, typeof value === "object" ? JSON.stringify(value) : value);
      }
    });
    
    const resp = await api.post("/form-setup", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return resp.data;
  },

  update: async (id, payload) => {
    const form = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (key === "fields") form.append(key, JSON.stringify(value));
      else form.append(key, typeof value === "object" ? JSON.stringify(value) : value);
    });
    
    const resp = await api.put(`/form-setup/${id}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return resp.data;
  },

  getForCenterCampaign: async (centerId, campaignName) => {
    const resp = await api.get(
      `/form-setup/${centerId}/${encodeURIComponent(campaignName)}`
    );
    return resp.data;
  },

  list: async (params = {}) => {
    const resp = await api.get("/form-setup", { params });
    return resp.data;
  },

  delete: async (id) => {
    const resp = await api.delete(`/form-setup/${id}`);
    return resp.data;
  },

  getCampaignsForCenter: async (centerId, verificationCode) => {
    const resp = await api.get("/form-setup/center/campaigns", {
      params: { centerId, verificationCode }
    });
    return resp.data;
  },
};