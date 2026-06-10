// frontend/src/store/slices/campaignSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { campaignService } from "../../services/campaignService";

export const getAllCampaigns = createAsyncThunk(
  "campaigns/getAll",
  async ({ centerId, verificationCode }, { rejectWithValue }) => {
    try {
      const response = await campaignService.getAllCampaigns({ centerId, verificationCode });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to fetch campaigns");
    }
  }
);

const campaignSlice = createSlice({
  name: "campaigns",
  initialState: {
    campaigns: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getAllCampaigns.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllCampaigns.fulfilled, (state, action) => {
        state.loading = false;
        state.campaigns = action.payload;
      })
      .addCase(getAllCampaigns.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default campaignSlice.reducer;
