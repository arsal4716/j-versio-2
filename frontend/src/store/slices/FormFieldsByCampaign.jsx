import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getFormFieldsByCampaign } from "../../services/formFieldsforCampaign";

export const fetchFormFields = createAsyncThunk(
  "form/fetchFields",
  async ({ centerId, campaignName }, { rejectWithValue }) => {
    try {
      const response = await getFormFieldsByCampaign(centerId, campaignName);
      return response.data;
      } catch (err) {
      return rejectWithValue(err.message || "Failed to fetch form fields");
    }
  }
);

const formSlice = createSlice({
  name: "formFieldByCampaign",
  initialState: {
    fields: [],
    centerId: null,
    campaignName: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearForm: (state) => {
      state.fields = [];
      state.centerId = null;
      state.campaignName = null;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFormFields.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFormFields.fulfilled, (state, action) => {
        state.loading = false;
        state.fields = action.payload.fields;
        state.centerId = action.payload.centerId;
        state.campaignName = action.payload.campaignName;
      })
      .addCase(fetchFormFields.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch form fields";
      });
  },
});

export const { clearForm } = formSlice.actions;
export default formSlice.reducer;
