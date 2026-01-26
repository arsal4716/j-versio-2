import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { centerService } from "../../services/centerService.jsx";
import { handleApiResponse, showToast } from "../../utils/Notifications.jsx";

export const createCenter = createAsyncThunk(
  "centers/create",
  async (centerData, { rejectWithValue }) => {
    try {
      const response = await centerService.createCenter(centerData);
      handleApiResponse(response);
      return response.data;
    } catch (error) {
      handleApiResponse(error.response?.data);
      return rejectWithValue(error.response?.data);
    }
  }
);

export const getCenters = createAsyncThunk(
  "centers/getAll",
  async (params, { rejectWithValue }) => {
    try {
      const response = await centerService.getCenters(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data);
    }
  }
);

export const updateCenter = createAsyncThunk(
  "centers/update",
  async ({ id, centerData }, { rejectWithValue }) => {
    try {
      const response = await centerService.updateCenter(id, centerData);
      handleApiResponse(response);
      return response.data;
    } catch (error) {
      handleApiResponse(error.response?.data);
      return rejectWithValue(error.response?.data);
    }
  }
);

export const deleteCenter = createAsyncThunk(
  "centers/delete",
  async (id, { rejectWithValue }) => {
    try {
      const response = await centerService.deleteCenter(id);
      handleApiResponse(response);
      return id;
    } catch (error) {
      handleApiResponse(error.response?.data);
      return rejectWithValue(error.response?.data);
    }
  }
);

const centerSlice = createSlice({
  name: "centers",
  initialState: {
    centers: [],
    currentCenter: null,
    loading: false,
    error: null,
    totalPages: 1,
    currentPage: 1,
    total: 0,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentCenter: (state, action) => {
      state.currentCenter = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create Center
      .addCase(createCenter.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCenter.fulfilled, (state, action) => {
        state.loading = false;
        state.centers.unshift(action.payload);
      })
      .addCase(createCenter.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get Centers
      .addCase(getCenters.pending, (state) => {
        state.loading = true;
      })
      .addCase(getCenters.fulfilled, (state, action) => {
        state.loading = false;
        state.centers = action.payload.centers;
        state.totalPages = action.payload.totalPages;
        state.currentPage = action.payload.currentPage;
        state.total = action.payload.total;
      })
      .addCase(getCenters.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;initialState
      })
      // Update Center
      .addCase(updateCenter.fulfilled, (state, action) => {
        const index = state.centers.findIndex(
          (center) => center._id === action.payload._id
        );
        if (index !== -1) {
          state.centers[index] = action.payload;
        }
        if (
          state.currentCenter &&
          state.currentCenter._id === action.payload._id
        ) {
          state.currentCenter = action.payload;
        }
      })
      .addCase(deleteCenter.fulfilled, (state, action) => {
        state.centers = state.centers.filter(
          (center) => center._id !== action.payload
        );
      });
  },
});

export const { clearError, setCurrentCenter } = centerSlice.actions;
export default centerSlice.reducer;
