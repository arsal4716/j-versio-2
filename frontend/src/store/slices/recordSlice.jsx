// frontend/src/store/slices/recordSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { recordService } from "../../services/recordService";

export const fetchRecords = createAsyncThunk(
  "records/fetch",
  async (params, { rejectWithValue }) => {
    try {
      const res = await recordService.list(params);
      return res.data;
    } catch (e) {
      return rejectWithValue(e.response?.data?.message || "Failed to fetch records");
    }
  }
);

const recordSlice = createSlice({
  name: "records",
  initialState: {
    items: [],
    cursor: null,
    hasMore: false,
    loading: false,
    error: null,
  },
  reducers: {
    resetRecords: (state) => {
      state.items = [];
      state.cursor = null;
      state.hasMore = false;
      state.error = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchRecords.pending, (s) => {
      s.loading = true;
      s.error = null;
    })
      .addCase(fetchRecords.fulfilled, (s, a) => {
        s.loading = false;
        s.items = a.payload.items || [];
        s.cursor = a.payload.nextCursor || null;
        s.hasMore = !!a.payload.hasMore;
      })
      .addCase(fetchRecords.rejected, (s, a) => {
        s.loading = false;
        s.error = a.payload;
      });
  },
});

export const { resetRecords } = recordSlice.actions;
export default recordSlice.reducer;