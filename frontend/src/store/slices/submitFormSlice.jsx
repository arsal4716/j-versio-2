import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import API from "../../services/api";

export const submitCampaignForm = createAsyncThunk(
  "formSubmission/submit",
  async ({ centerId, campaignName, formData }, { rejectWithValue }) => {
    try {
      const res = await API.post(`/submit-form/${centerId}/${campaignName}`, formData);
      // res.data should be: { success, message, data, errors }
      return res.data;
    } catch (error) {
      // backend should return { success:false, message, errors }
      const payload =
        error?.response?.data ||
        ({ success: false, message: error?.message || "Something went wrong" });

      return rejectWithValue(payload);
    }
  }
);

const submitFormSlice = createSlice({
  name: "formSubmission",
  initialState: {
    loading: false,
    success: false,
    error: false,
    message: "",
    errors: null,
    data: null,
  },
  reducers: {
    resetSubmissionState: (state) => {
      state.loading = false;
      state.success = false;
      state.error = false;
      state.message = "";
      state.errors = null;
      state.data = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitCampaignForm.pending, (state) => {
        state.loading = true;
        state.success = false;
        state.error = false;
        state.message = "";
        state.errors = null;
        state.data = null;
      })
      .addCase(submitCampaignForm.fulfilled, (state, action) => {
        state.loading = false;

        const payload = action.payload || {};
        const ok = !!payload.success;

        state.success = ok;
        state.error = !ok;

        state.message = payload.message || (ok ? "Submitted successfully" : "Submission failed");
        state.errors = payload.errors || null;
        state.data = payload.data || null;
      })
      .addCase(submitCampaignForm.rejected, (state, action) => {
        state.loading = false;
        state.success = false;
        state.error = true;

        const payload = action.payload;

        // payload might be object or string
        if (typeof payload === "string") {
          state.message = payload;
          state.errors = null;
          state.data = null;
        } else {
          state.message = payload?.message || "Something went wrong";
          state.errors = payload?.errors || null;
          state.data = payload?.data || null;
        }
      });
  },
});

export const { resetSubmissionState } = submitFormSlice.actions;
export default submitFormSlice.reducer;
