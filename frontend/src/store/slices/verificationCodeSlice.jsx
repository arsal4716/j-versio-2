import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import verificationService from "../../services/verificationCodeService";

export const verifyCode = createAsyncThunk(
  "verification/verifyCode",
  async (code, { rejectWithValue }) => {
    try {
      const res = await verificationService.verifyCode(code);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

const verificationSlice = createSlice({
  name: "verification",
  initialState: {
    loading: false,
    centerId: null,
    centerName: "",
    verificationCode: null, 
    error: null,
    verified: false,
  },
  reducers: {
    resetVerification: (state) => {
      state.centerId = null;
      state.centerName = "";
      state.verificationCode = null; 
      state.verified = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(verifyCode.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyCode.fulfilled, (state, action) => {
        state.loading = false;
        state.centerId = action.payload.centerId;
        state.centerName = action.payload.centerName;
        state.verificationCode = action.meta.arg;
        state.verified = true;
      })
      .addCase(verifyCode.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});


export const { resetVerification } = verificationSlice.actions;
export default verificationSlice.reducer;
