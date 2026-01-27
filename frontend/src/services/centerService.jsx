import api from "./api";

export const centerService = {
  createCenter: async (centerData) => {
    const formData = new FormData();

    // REQUIRED primitive fields
    formData.append("name", centerData.name || "");
    formData.append("verificationCode", centerData.verificationCode || "");
    formData.append("centerAdminEmail", centerData.centerAdminEmail || "");

    // Objects
    if (centerData.googleSheets) {
      formData.append(
        "googleSheets",
        JSON.stringify(centerData.googleSheets)
      );
    }

    if (centerData.settings) {
      formData.append("settings", JSON.stringify(centerData.settings));
    }

    if (centerData.proxy) {
      formData.append("proxy", JSON.stringify(centerData.proxy));
    }

    if (centerData.campaigns) {
      formData.append("campaigns", JSON.stringify(centerData.campaigns));
    }

    // File (top-level, correct)
    if (centerData.clientKeyFile instanceof File) {
      formData.append("clientKeyFile", centerData.clientKeyFile);
    }

    const response = await api.post("/centers", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        const percent = Math.round((e.loaded * 100) / e.total);
      },
    });

    return response.data;
  },

  updateCenter: async (id, centerData) => {
    const formData = new FormData();

    for (const [key, value] of Object.entries(centerData)) {
      if (value === undefined || value === null) continue;

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
