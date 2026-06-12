import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import API from "../../services/api";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Maps a BullMQ job state to a user-facing phase + coarse progress %.
const PHASES = {
  queued: { label: "Queued — waiting for an available worker", progress: 15 },
  waiting: { label: "Queued — waiting for an available worker", progress: 15 },
  delayed: { label: "Queued — retrying shortly", progress: 15 },
  active: { label: "Processing — running the automation", progress: 60 },
  completed: { label: "Completed", progress: 100 },
  failed: { label: "Failed", progress: 100 },
};

export const submitCampaignForm = createAsyncThunk(
  "formSubmission/submit",
  async ({ centerId, campaignName, formData }, { dispatch, rejectWithValue }) => {
    try {
      const res = await API.post(`/submit-form/${centerId}/${campaignName}`, formData);
      const body = res.data || {};
      const jobId = body?.data?.jobId;

      // Legacy / synchronous path: no jobId means the result is already here.
      if (!jobId) return body;

      dispatch(setSubmissionPhase(PHASES.queued));

      // Poll the job until it completes or fails. Automation runs 15-40s, so we
      // allow a generous window before giving up the live wait.
      const maxMs = 180000;
      const intervalMs = 2000;
      const deadline = Date.now() + maxMs;

      while (Date.now() < deadline) {
        await sleep(intervalMs);
        let statusRes;
        try {
          statusRes = await API.get(`/submit-form/status/${jobId}`);
        } catch {
          continue; // transient; keep polling
        }
        const payload = statusRes.data?.data || {};
        const phase = PHASES[payload.state] || PHASES.active;
        dispatch(setSubmissionPhase(phase));

        if (payload.state === "completed") {
          return {
            success: true,
            message: payload.message || "Form submitted successfully",
            data: payload.data || null,
          };
        }
        if (payload.state === "failed") {
          return rejectWithValue({
            success: false,
            message: payload.error || "Submission failed",
          });
        }
      }

      // Still running after the wait window — it remains queued/processing in the
      // background; the agent can find the result in Records.
      return {
        success: true,
        message: "Submission is still processing. Check Records for the result.",
        data: null,
      };
    } catch (error) {
      const payload =
        error?.response?.data ||
        { success: false, message: error?.message || "Something went wrong" };
      return rejectWithValue(payload);
    }
  }
);

const initialState = {
  loading: false,
  success: false,
  error: false,
  message: "",
  errors: null,
  data: null,
  phase: null,
  progress: 0,
};

const submitFormSlice = createSlice({
  name: "formSubmission",
  initialState,
  reducers: {
    resetSubmissionState: (state) => {
      Object.assign(state, initialState);
    },
    setSubmissionPhase: (state, action) => {
      state.phase = action.payload?.label || null;
      state.progress = action.payload?.progress ?? state.progress;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitCampaignForm.pending, (state) => {
        Object.assign(state, initialState);
        state.loading = true;
        state.phase = "Submitting…";
        state.progress = 5;
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
        state.phase = null;
        state.progress = ok ? 100 : 0;
      })
      .addCase(submitCampaignForm.rejected, (state, action) => {
        state.loading = false;
        state.success = false;
        state.error = true;
        const payload = action.payload;
        if (typeof payload === "string") {
          state.message = payload;
          state.errors = null;
          state.data = null;
        } else {
          state.message = payload?.message || "Something went wrong";
          state.errors = payload?.errors || null;
          state.data = payload?.data || null;
        }
        state.phase = null;
        state.progress = 0;
      });
  },
});

export const { resetSubmissionState, setSubmissionPhase } = submitFormSlice.actions;
export default submitFormSlice.reducer;
