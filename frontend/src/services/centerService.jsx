import api from "./api";

export const centerService = {
  createCenter: async (centerData) => {
    const formData = new FormData();

    // REQUIRED primitive fields
    formData.append("name", centerData.name || "");
    formData.append("verificationCode", centerData.verificationCode || "");
    formData.append("centerAdminEmail", centerData.centerAdminEmail || "");

    // The uploaded Google key lives at googleSheets.clientKeyFile in the form.
    // Multer expects the File under the top-level `clientKeyFile` field, and a
    // File would serialize to "{}" inside the JSON — so pull it out first.
    const gs = { ...(centerData.googleSheets || {}) };
    const keyFile =
      (gs.clientKeyFile instanceof File && gs.clientKeyFile) ||
      (centerData.clientKeyFile instanceof File && centerData.clientKeyFile) ||
      null;
    delete gs.clientKeyFile;
    formData.append("googleSheets", JSON.stringify(gs));

    if (centerData.settings) {
      formData.append("settings", JSON.stringify(centerData.settings));
    }

    if (centerData.proxy) {
      formData.append("proxy", JSON.stringify(centerData.proxy));
    }

    if (centerData.campaigns) {
      formData.append("campaigns", JSON.stringify(centerData.campaigns));
    }

    if (keyFile) {
      formData.append("clientKeyFile", keyFile);
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

    // Pull the nested key File out so it's sent under the field name multer
    // expects and never serialized into the googleSheets JSON.
    let keyFile = null;
    for (const [key, value] of Object.entries(centerData)) {
      if (value === undefined || value === null) continue;

      if (key === "clientKeyFile") {
        if (value instanceof File) keyFile = value;
        continue;
      }

      if (key === "googleSheets" && typeof value === "object") {
        const gs = { ...value };
        if (gs.clientKeyFile instanceof File) keyFile = gs.clientKeyFile;
        delete gs.clientKeyFile;
        formData.append("googleSheets", JSON.stringify(gs));
        continue;
      }

      if (typeof value === "object" && !(value instanceof File)) {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value);
      }
    }

    if (keyFile) {
      formData.append("clientKeyFile", keyFile);
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

  // Revoke or restore a center's access (super admin only).
  setAccess: async (id, { status, revokeMessage }) => {
    const response = await api.patch(`/centers/${id}/access`, { status, revokeMessage });
    return response.data;
  },
};
