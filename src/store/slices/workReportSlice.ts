import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

export type WorkReport = {
  id?: number;
  report_date: string;
  tasks_completed: string;
  tasks_tomorrow: string;
  issues?: string | null;
};

export type LeaveSummary = {
  id: number;
  from_date: string;
  to_date: string;
  leave_type: string;
  status: string;
  reason?: string | null;
};

type WorkReportPayload = {
  tasks_completed: string;
  tasks_tomorrow: string;
  issues?: string;
};

type WorkReportState = {
  reports: WorkReport[];
  leaves: LeaveSummary[];
  loading: boolean;
  submitting: boolean;
  error: string | null;
};

const initialState: WorkReportState = {
  reports: [],
  leaves: [],
  loading: false,
  submitting: false,
  error: null,
};

async function getErrorMessage(response: Response, fallback: string) {
  const data = await response.json().catch(() => null);
  return data?.error || data?.message || fallback;
}

export const fetchWorkReports = createAsyncThunk(
  "workReport/fetchWorkReports",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/employee/work-report", {
        credentials: "include",
      });

      if (!response.ok) {
        return rejectWithValue(
          await getErrorMessage(response, "Failed to load work reports")
        );
      }

      return (await response.json()) as {
        reports: WorkReport[];
        leaves: LeaveSummary[];
      };
    } catch {
      return rejectWithValue("Failed to load work reports");
    }
  }
);

export const submitWorkReport = createAsyncThunk(
  "workReport/submitWorkReport",
  async (payload: WorkReportPayload, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/employee/work-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        return rejectWithValue(
          await getErrorMessage(response, "Failed to submit work report")
        );
      }

      return (await response.json()) as {
        report: WorkReport;
        message: string;
      };
    } catch {
      return rejectWithValue("Failed to submit work report");
    }
  }
);

const workReportSlice = createSlice({
  name: "workReport",
  initialState,
  reducers: {
    clearWorkReportError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkReports.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkReports.fulfilled, (state, action) => {
        state.loading = false;
        state.reports = action.payload.reports || [];
        state.leaves = action.payload.leaves || [];
      })
      .addCase(fetchWorkReports.rejected, (state, action) => {
        state.loading = false;
        state.error = String(action.payload || "Failed to load work reports");
      })
      .addCase(submitWorkReport.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(submitWorkReport.fulfilled, (state, action) => {
        state.submitting = false;
        const report = action.payload.report;
        const existingIndex = state.reports.findIndex(
          (item) => item.id === report.id
        );

        if (existingIndex >= 0) {
          state.reports[existingIndex] = report;
        } else {
          state.reports.unshift(report);
        }
      })
      .addCase(submitWorkReport.rejected, (state, action) => {
        state.submitting = false;
        state.error = String(action.payload || "Failed to submit work report");
      });
  },
});

export const { clearWorkReportError } = workReportSlice.actions;
export default workReportSlice.reducer;