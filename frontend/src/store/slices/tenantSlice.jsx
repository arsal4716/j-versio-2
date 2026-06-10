// frontend/src/store/slices/tenantSlice.js
import { createSlice } from "@reduxjs/toolkit";

const tenantSlice = createSlice({
  name: "tenant",
  initialState: {
    overrideCenterId: null,
  },
  reducers: {
    setOverrideCenterId: (state, action) => {
      state.overrideCenterId = action.payload || null;
    },
  },
});

export const { setOverrideCenterId } = tenantSlice.actions;
export default tenantSlice.reducer;