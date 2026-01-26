import api from "./api";

export const centerService = {
  createCenter: async (centerData) => {
    const formData = new FormData();
    console.log('formData',formData)
    for (const [key, value] of Object.entries(centerData)) {
      if (key === "googleSheets" && value.clientKeyFile instanceof File) {
        formData.append("clientKeyFile", value.clientKeyFile);
        formData.append(key, JSON.stringify({ ...value, clientKeyFile: null }));
      } else if (typeof value === "object" && !(value instanceof File)) {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value);
      }
    }

    const response = await api.post("/centers", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (progressEvent) => {
        const percent = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        console.log(`Upload progress: ${percent}%`);
      },
    });

    return response.data;
  },
  updateCenter: async (id, centerData) => {
    const formData = new FormData();
    for (const [key, value] of Object.entries(centerData)) {
      if (typeof value === "object" && !(value instanceof File)) {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value);
      }
    }

    const response = await api.put(`/centers/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  getCenters: async (params = {}) => {
    const response = await api.get("/centers", { params });
    return response.data;
  },

  getCenterById: async (id) => {
    const response = await api.get(`/centers/${id}`);
    return response.data;
  },

  deleteCenter: async (id) => {
    const response = await api.delete(`/centers/${id}`);
    return response.data;
  },
};
