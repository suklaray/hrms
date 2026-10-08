"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import SideBar from "@/Components/SideBar";
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

interface Candidate {
  candidate_id: string;
  name: string;
  email: string;
  status: string;
}

interface MatchItem {
  candidate: Candidate;
  score: number;
  explanation: string;
  breakdown: Record<string, string | number>;
  missingSkills: string[];
}

interface MatchData {
  success: boolean;
  job?: {
    title: string;
  };
  totalMatched: number;
  totalEligible: number;
  results: MatchItem[];
}

interface InterviewItem {
  candidate: Candidate;
}

type Action = "SHORTLISTED" | "REJECTED" | "INTERVIEW";

export default function CandidateMatchesClient({
  permissions = [],
}: {
  permissions?: string[];
}) {
  const userPermissions = new Set(permissions);
  const canShortlist = userPermissions.has(PERMISSION_KEYS.JOB_APPLICATION_SHORTLIST);
  const canReject = userPermissions.has(PERMISSION_KEYS.JOB_APPLICATION_REJECT);
  const canSchedule = userPermissions.has(PERMISSION_KEYS.JOB_APPLICATION_SCHEDULE);
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [data, setData] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [acting, setActing] = useState<string | null>(null);
  const [interview, setInterview] = useState<InterviewItem | null>(null);

  useEffect(() => {
    document.title = `${data?.job?.title || "Candidate Matches"} - HRMS`;
  }, [data?.job?.title]);

  const loadMatches = useCallback(async () => {
    if (!id) return;

    setLoading(true);

    try {
      const response = await fetch(
        `/api/recruitment/job-description/${id}/matches`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to load matches");
      }

      setData(result);
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Unable to load matches"
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const act = async (
    candidateId: string,
    action: Action,
    details: Record<string, string> = {}
  ) => {
    const allowed =
      action === "SHORTLISTED"
        ? canShortlist
        : action === "REJECTED"
          ? canReject
          : canSchedule;
    if (!allowed) {
      toast.error("Permission denied: You cannot perform this candidate action");
      return;
    }

    setActing(candidateId);

    try {
      const response = await fetch(
        `/api/recruitment/job-description/${id}/matches`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            candidateId,
            action,
            ...details,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Action failed");
      }

      toast.success(
        action === "INTERVIEW"
          ? "Interview scheduled"
          : `Candidate ${action.toLowerCase()}`
      );

      setInterview(null);
      await loadMatches();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setActing(null);
    }
  };

  const results = (data?.results || []).filter((item) =>
    `${item.candidate.name} ${item.candidate.email}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SideBar />

      <main className="flex-1 overflow-auto p-6 lg:p-10">
        <Link
          href="/Recruitment/job-description"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Job descriptions
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-2">
              AI candidate matching
            </p>

            <h1 className="text-3xl font-bold text-gray-900">
              {data?.job?.title || "Ranked candidates"}
            </h1>

            <p className="text-gray-500 mt-1">
              {data
                ? `${data.totalMatched} of ${data.totalEligible} eligible candidates have parsed profiles`
                : "Compare candidates against this job description"}
            </p>
          </div>

          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search ranked candidates"
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-200 focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center text-gray-500">
            Comparing eligible profiles...
          </div>
        ) : results.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
            <Sparkles className="w-10 h-10 text-indigo-300 mx-auto mb-3" />

            <p className="font-semibold text-gray-700">
              No parsed candidate profiles found
            </p>

            <p className="text-sm text-gray-400 mt-1">
              Parse resumes before running matching.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((item, index) => (
              <article
                key={item.candidate.candidate_id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
              >
                <div className="flex flex-col xl:flex-row xl:items-center gap-5">
                  <div className="flex items-center gap-4 min-w-[260px]">
                    <span className="text-2xl font-bold text-gray-300 w-8">
                      #{index + 1}
                    </span>

                    <div className="w-11 h-11 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold">
                      {item.candidate.name?.charAt(0) || "?"}
                    </div>

                    <div>
                      <h2 className="font-bold text-gray-900">
                        {item.candidate.name}
                      </h2>

                      <p className="text-sm text-gray-500">
                        {item.candidate.email}
                      </p>

                      <span className="text-xs text-gray-400">
                        {item.candidate.status}
                      </span>
                    </div>
                  </div>

                  <div className="w-28 text-center">
                    <p className="text-3xl font-bold text-indigo-600">
                      {item.score}
                    </p>

                    <p className="text-xs text-gray-400 uppercase tracking-wide">
                      Match score
                    </p>
                  </div>

                  <div className="flex-1">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {item.explanation}
                    </p>

                    <div className="flex flex-wrap gap-2 mt-3">
                      {Object.entries(item.breakdown).map(
                        ([key, value]) => (
                          <span
                            key={key}
                            className="text-xs px-2.5 py-1 rounded-lg bg-gray-50 text-gray-600"
                          >
                            {key}: {value}
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap xl:flex-col gap-2 xl:w-36">
                    {canShortlist && <button
                      disabled={acting === item.candidate.candidate_id}
                      onClick={() =>
                        act(
                          item.candidate.candidate_id,
                          "SHORTLISTED"
                        )
                      }
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      Shortlist
                    </button>}

                    {canReject && <button
                      disabled={acting === item.candidate.candidate_id}
                      onClick={() =>
                        act(
                          item.candidate.candidate_id,
                          "REJECTED"
                        )
                      }
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </button>}

                    {canSchedule && <button
                      disabled={acting === item.candidate.candidate_id}
                      onClick={() => setInterview(item)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 disabled:opacity-50"
                    >
                      <Calendar className="w-4 h-4" />
                      Schedule
                    </button>}
                  </div>
                </div>

                {item.missingSkills.length > 0 && (
                  <p className="text-xs text-red-500 mt-4">
                    Missing required: {item.missingSkills.join(", ")}
                  </p>
                )}

                {interview?.candidate.candidate_id ===
                  item.candidate.candidate_id && (
                  <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap items-end gap-3">
                    <label className="text-xs font-semibold text-gray-500">
                      Date
                      <input
                        id="interview-date"
                        type="date"
                        className="block mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                    </label>

                    <label className="text-xs font-semibold text-gray-500">
                      From
                      <input
                        id="interview-from"
                        type="time"
                        className="block mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                    </label>

                    <label className="text-xs font-semibold text-gray-500">
                      To
                      <input
                        id="interview-to"
                        type="time"
                        className="block mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                    </label>

                    <button
                      onClick={() => {
                        const date = document.getElementById(
                          "interview-date"
                        ) as HTMLInputElement | null;

                        const from = document.getElementById(
                          "interview-from"
                        ) as HTMLInputElement | null;

                        const to = document.getElementById(
                          "interview-to"
                        ) as HTMLInputElement | null;

                        act(
                          item.candidate.candidate_id,
                          "INTERVIEW",
                          {
                            interviewDate: date?.value || "",
                            interviewTimeFrom: from?.value || "",
                            interviewTimeTo: to?.value || "",
                          }
                        );
                      }}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
                    >
                      <Clock className="w-4 h-4 inline mr-1" />
                      Confirm
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}