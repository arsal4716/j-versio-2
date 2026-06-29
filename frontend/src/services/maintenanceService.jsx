import API from "./api";

export const maintenanceService = {
  // Public status: { enabled, until, message, active }
  get: () => API.get(`/maintenance`),
  // super_admin only: { enabled, until?, message? }
  set: (payload) => API.post(`/maintenance`, payload),
};

export default maintenanceService;
