// frontend/src/store/store.js
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import centerReducer from "./slices/centerSlice";
import campaignReducer from "./slices/campaignSlice";
import verificationReducer from "./slices/verificationCodeSlice";
import formFieldByCampaignReducer from "./slices/FormFieldsByCampaign";
import submitFormReducer from "./slices/submitFormSlice";
import formSetupReducer from "./slices/formSetupSlice"; 
import userReducer from "./slices/userSlice";
export const store = configureStore({
  reducer: {
    auth: authReducer,
    centers: centerReducer,
    campaigns: campaignReducer,
    verification: verificationReducer,
    formFieldByCampaign: formFieldByCampaignReducer,
    formSubmission: submitFormReducer,
    formSetup: formSetupReducer,
    users: userReducer, 
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;
