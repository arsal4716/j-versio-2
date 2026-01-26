// frontend/src/store/slices/formSetupSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { formSetupService } from "../../services/formSetupService";
import { handleApiResponse } from "../../utils/Notifications";

export const createFormSetup = createAsyncThunk(
  "formSetup/create",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await formSetupService.create(payload);
      handleApiResponse(res);
      return res.data;
    } catch (err) {
      handleApiResponse(err.response?.data);
      return rejectWithValue(err.response?.data);
    }
  },
);

export const updateFormSetup = createAsyncThunk(
  "formSetup/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const res = await formSetupService.update(id, payload);
      handleApiResponse(res);
      return res.data;
    } catch (err) {
      handleApiResponse(err.response?.data);
      return rejectWithValue(err.response?.data);
    }
  },
);

export const getFormSetupsList = createAsyncThunk(
  "formSetup/getList",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await formSetupService.list(params);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data);
    }
  },
);

export const getCampaignsForCenter = createAsyncThunk(
  "formSetup/getCampaignsForCenter",
  async ({ centerId, verificationCode }, { rejectWithValue }) => {
    try {
      const res = await formSetupService.getCampaignsForCenter(
        centerId,
        verificationCode,
      );
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data);
    }
  },
);

export const getFormSetup = createAsyncThunk(
  "formSetup/get",
  async ({ centerId, campaignName }, { rejectWithValue }) => {
    try {
      const res = await formSetupService.getForCenterCampaign(
        centerId,
        campaignName,
      );
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data);
    }
  },
);

export const deleteFormSetup = createAsyncThunk(
  "formSetup/delete",
  async (id, { rejectWithValue }) => {
    try {
      const res = await formSetupService.delete(id);
      handleApiResponse(res);
      return id;
    } catch (err) {
      handleApiResponse(err.response?.data);
      return rejectWithValue(err.response?.data);
    }
  },
);

const slice = createSlice({
  name: "formSetup",
  initialState: {
    loading: false,
    campaignsLoading: false,
    error: null,
    current: null,
    list: [],
    campaigns: [],
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      pages: 0,
    },
  },
  reducers: {
    clearFormSetupError: (s) => {
      s.error = null;
    },
    setCurrentFormSetup: (s, a) => {
      s.current = a.payload;
    },
    clearCampaigns: (s) => {
      s.campaigns = [];
    },
    resetCurrent: (s) => {
      s.current = null;
    },
  },
  extraReducers: (builder) => {
    // Create
    builder
      .addCase(createFormSetup.pending, (s) => {
        s.loading = true;
        s.error = null;
      })
      .addCase(createFormSetup.fulfilled, (s, a) => {
        s.loading = false;
        s.list.unshift(a.payload);
        s.current = a.payload;
      })
      .addCase(createFormSetup.rejected, (s, a) => {
        s.loading = false;
        s.error = a.payload;
      })

      // Update
      .addCase(updateFormSetup.pending, (s) => {
        s.loading = true;
        s.error = null;
      })
      .addCase(updateFormSetup.fulfilled, (s, a) => {
        s.loading = false;
        s.current = a.payload;
        // Update in list
        const index = s.list.findIndex((item) => item._id === a.payload._id);
        if (index !== -1) {
          s.list[index] = a.payload;
        }
      })
      .addCase(updateFormSetup.rejected, (s, a) => {
        s.loading = false;
        s.error = a.payload;
      })

      // Get list
      .addCase(getFormSetupsList.pending, (s) => {
        s.loading = true;
        s.error = null;
      })
      .addCase(getFormSetupsList.fulfilled, (s, a) => {
        s.loading = false;
        s.list = a.payload.setups || [];
        s.pagination = {
          page: a.payload.page || 1,
          total: a.payload.total || 0,
          pages: Math.ceil((a.payload.total || 0) / (s.pagination.limit || 10)),
        };
      })
      .addCase(getFormSetupsList.rejected, (s, a) => {
        s.loading = false;
        s.error = a.payload;
      })

      // Get campaigns
      .addCase(getCampaignsForCenter.pending, (s) => {
        s.campaignsLoading = true;
        s.error = null;
      })
      .addCase(getCampaignsForCenter.fulfilled, (s, a) => {
        console.log("REDUCER CAMPAIGNS PAYLOAD:", a.payload);
        s.campaignsLoading = false;
        s.campaigns = a.payload || [];
      })
      .addCase(getCampaignsForCenter.rejected, (s, a) => {
        s.campaignsLoading = false;
        s.campaigns = [];
        s.error = a.payload;
      })

      .addCase(getFormSetup.pending, (s) => {
        s.loading = true;
        s.error = null;
      })
      .addCase(getFormSetup.fulfilled, (s, a) => {
        s.loading = false;
        s.current = a.payload;
      })
      .addCase(getFormSetup.rejected, (s, a) => {
        s.loading = false;
        s.error = a.payload;
      })
      .addCase(deleteFormSetup.fulfilled, (s, a) => {
        s.loading = false;
        s.list = s.list.filter((item) => item._id !== a.payload);
        if (s.current && s.current._id === a.payload) {
          s.current = null;
        }
      });
  },
});

export const {
  clearFormSetupError,
  setCurrentFormSetup,
  clearCampaigns,
  resetCurrent,
} = slice.actions;
export default slice.reducer;
