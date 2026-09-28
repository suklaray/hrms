import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import workReportReducer from "./slices/workReportSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    workReport: workReportReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
