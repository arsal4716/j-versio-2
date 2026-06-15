import API from "./api";

export const recordService = {
  list: (params) => API.get(`/portal-records`, { params }),
  remove: (id) => API.delete(`/portal-records/${id}`),
};