import API from "./api";

export const recordService = {
  list: (params) => API.get(`/portal-records`, { params }),
};