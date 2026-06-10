// frontend/src/store/slices/apiConfigSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { apiConfigService } from "../../services/apiConfigService";

export const fetchApiConfigs = createAsyncThunk(
  "apiConfigs/fetch",
  async ({ centerId, campaignId }, { rejectWithValue }) => {
    try {
      const res = await apiConfigService.list({ centerId, campaignId });
      return res.data.data || [];
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || "Failed to fetch API configs");
    }
  }
);

export const createApiConfig = createAsyncThunk(
  "apiConfigs/create",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await apiConfigService.create(payload);
      return res.data.data;
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || "Failed to create API config");
    }
  }
);

export const updateApiConfig = createAsyncThunk(
  "apiConfigs/update",
  async ({ id, patch }, { rejectWithValue }) => {
    try {
      const res = await apiConfigService.update(id, patch);
      return res.data.data;
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || "Failed to update API config");
    }
  }
);

export const toggleApiConfig = createAsyncThunk(
  "apiConfigs/toggle",
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const res = await apiConfigService.toggle(id, status);
      return res.data.data;
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || "Failed to toggle API config");
    }
  }
);

export const deleteApiConfig = createAsyncThunk(
  "apiConfigs/delete",
  async (id, { rejectWithValue }) => {
    try {
      await apiConfigService.remove(id);
      return id;
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || "Failed to delete API config");
    }
  }
);

const apiConfigSlice = createSlice({
  name: "apiConfigs",
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearApiConfigError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchApiConfigs.pending, (s) => {
      s.loading = true;
      s.error = null;
    })
      .addCase(fetchApiConfigs.fulfilled, (s, a) => {
        s.loading = false;
        s.items = a.payload;
      })
      .addCase(fetchApiConfigs.rejected, (s, a) => {
        s.loading = false;
        s.error = a.payload;
      })
      .addCase(createApiConfig.fulfilled, (s, a) => {
        s.items = [a.payload, ...s.items];
      })
      .addCase(updateApiConfig.fulfilled, (s, a) => {
        const i = s.items.findIndex((x) => x._id === a.payload._id);
        if (i !== -1) s.items[i] = a.payload;
      })
      .addCase(toggleApiConfig.fulfilled, (s, a) => {
        const i = s.items.findIndex((x) => x._id === a.payload._id);
        if (i !== -1) s.items[i] = a.payload;
      })
      .addCase(deleteApiConfig.fulfilled, (s, a) => {
        s.items = s.items.filter((x) => x._id !== a.payload);
      });
  },
});

export const { clearApiConfigError } = apiConfigSlice.actions;
export default apiConfigSlice.reducer;