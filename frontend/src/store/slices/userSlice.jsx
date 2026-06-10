// frontend/src/store/slices/userSlice.jsx
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { userService } from "../../services/userService";
import { handleApiResponse } from "../../utils/Notifications";

export const getUsers = createAsyncThunk(
  "users/getAll",
  async (params, { rejectWithValue }) => {
    try {
      const response = await userService.getUsers(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data);
    }
  }
);

export const createUser = createAsyncThunk(
  "users/create",
  async (userData, { rejectWithValue }) => {
    try {
      const response = await userService.createUser(userData);
      handleApiResponse(response);
      return response.data;
    } catch (error) {
      handleApiResponse(error.response?.data);
      return rejectWithValue(error.response?.data);
    }
  }
);

export const updateUser = createAsyncThunk(
  "users/update",
  async ({ id, userData }, { rejectWithValue }) => {
    try {
      const response = await userService.updateUser(id, userData);
      handleApiResponse(response);
      return response.data;
    } catch (error) {
      handleApiResponse(error.response?.data);
      return rejectWithValue(error.response?.data);
    }
  }
);

export const deleteUser = createAsyncThunk(
  "users/delete",
  async (id, { rejectWithValue }) => {
    try {
      const response = await userService.deleteUser(id);
      handleApiResponse(response);
      return id;
    } catch (error) {
      handleApiResponse(error.response?.data);
      return rejectWithValue(error.response?.data);
    }
  }
);

const userSlice = createSlice({
  name: "users",
  initialState: {
    users: [],
    currentUser: null,
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
    setCurrentUser: (state, action) => {
      state.currentUser = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload.users || action.payload.data || [];
        state.totalPages = action.payload.totalPages || 1;
        state.currentPage = action.payload.currentPage || 1;
        state.total = action.payload.total || 0;
      })
      .addCase(getUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.users.unshift(action.payload);
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        const index = state.users.findIndex(
          (user) => user._id === action.payload._id
        );
        if (index !== -1) {
          state.users[index] = action.payload;
        }
        if (state.currentUser && state.currentUser._id === action.payload._id) {
          state.currentUser = action.payload;
        }
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.users = state.users.filter(
          (user) => user._id !== action.payload
        );
      });
  },
});

export const { clearError, setCurrentUser } = userSlice.actions;
export default userSlice.reducer;