import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { authService } from "../../services/authService";

export const signupUser = createAsyncThunk(
  "auth/signup",
  async (userData, { rejectWithValue }) => {
    try {
      const response = await authService.signup(userData);
      return response;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Signup failed" }
      );
    }
  }
);

export const loginUser = createAsyncThunk(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      return response;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Login failed" }
      );
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState: {
        isAuthenticated: false,
    user: authService.getCurrentUser(),
    token: localStorage.getItem("token"),
    allowedCampaigns: JSON.parse(localStorage.getItem("allowedCampaigns")) || [],
    loading: false,
    error: null,
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.allowedCampaigns = [];
      authService.logout();
      localStorage.removeItem("allowedCampaigns");
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signupUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signupUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.data.user;
        state.token = action.payload.data.token;
        localStorage.setItem("token", action.payload.data.token);
        localStorage.setItem("user", JSON.stringify(action.payload.data.user));
        if (action.payload.data.user?.allowedCampaigns) {
          state.allowedCampaigns = action.payload.data.user.allowedCampaigns;
          localStorage.setItem(
            "allowedCampaigns",
            JSON.stringify(action.payload.data.user.allowedCampaigns)
          );
        }
      })
      .addCase(signupUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Signup failed";
      })

      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.data.user;
        state.token = action.payload.data.token;

        localStorage.setItem("token", action.payload.data.token);
        localStorage.setItem("user", JSON.stringify(action.payload.data.user));
        if (action.payload.data.user?.allowedCampaigns) {
          state.allowedCampaigns = action.payload.data.user.allowedCampaigns;
          localStorage.setItem(
            "allowedCampaigns",
            JSON.stringify(action.payload.data.user.allowedCampaigns)
          );
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Login failed";
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
