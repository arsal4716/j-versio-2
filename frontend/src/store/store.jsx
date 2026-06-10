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
import apiConfigReducer from "./slices/apiConfigSlice";
import recordReducer from "./slices/recordSlice";
import tenantReducer from "./slices/tenantSlice";
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
    apiConfigs: apiConfigReducer,
records: recordReducer,
tenant: tenantReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;
