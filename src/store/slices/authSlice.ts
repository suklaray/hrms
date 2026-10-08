import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AuthUser } from "@/types";

export type AuthState = {
  user: AuthUser | null;
  permissions: string[];
  isAuthenticated: boolean;
  loading: boolean;
  initialized: boolean;
  loggingOut: boolean;
};

type LoginSuccessPayload = {
  user: AuthUser;
  permissions?: string[];
};

const initialState: AuthState = {
  user: null,
  permissions: [],
  isAuthenticated: false,
  loading: true,
  initialized: false,
  loggingOut: false,
};

export const fetchCurrentUser = createAsyncThunk(
  "auth/fetchCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (!res.ok) {
        return rejectWithValue("Unauthorized");
      }

      const data = await res.json();
      const user = data.user ?? null;
      const permissions = Array.isArray(data.permissions) ? data.permissions : [];

      return {
        user,
        permissions,
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : "Failed to fetch user");
    }
  }
);

export const logoutUser = createAsyncThunk<void, void>(
  "auth/logoutUser",
  async (_, { dispatch }) => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      dispatch(logoutSuccess());

      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("employee_user");
        document.cookie = "token=; Max-Age=0; path=/";
        window.location.href = "/login";
      }
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginSuccess: (state, action: PayloadAction<LoginSuccessPayload>) => {
      state.user = action.payload.user;
      state.permissions = action.payload.permissions ?? action.payload.user.permissions ?? [];
      state.isAuthenticated = true;
      state.loading = false;
      state.initialized = true;
      state.loggingOut = false;
    },
    setAuthUser: (state, action: PayloadAction<AuthUser | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      state.loading = false;
      state.initialized = true;
      state.loggingOut = false;
    },
    setPermissions: (state, action: PayloadAction<string[]>) => {
      state.permissions = action.payload;
    },
    logoutSuccess: (state) => {
      state.user = null;
      state.permissions = [];
      state.isAuthenticated = false;
      state.loading = false;
      state.initialized = true;
      state.loggingOut = false;
    },
    setAuthLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.permissions = action.payload.permissions;
        state.isAuthenticated = !!action.payload.user;
        state.loading = false;
        state.initialized = true;
        state.loggingOut = false;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        if (state.isAuthenticated) {
          state.loading = false;
          state.initialized = true;
          state.loggingOut = false;
          return;
        }
        state.user = null;
        state.permissions = [];
        state.isAuthenticated = false;
        state.loading = false;
        state.initialized = true;
        state.loggingOut = false;
      })
      .addCase(logoutUser.pending, (state) => {
        state.loggingOut = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.loggingOut = false;
      });
  },
});

export const { loginSuccess, setAuthUser, setPermissions, logoutSuccess, setAuthLoading } = authSlice.actions;
export default authSlice.reducer;