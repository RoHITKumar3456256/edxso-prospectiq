"use client";

import React from "react";
import { Filter, X } from "lucide-react";

export interface ProspectFilters {
  persona: string;
  location: string;
  skillKeyword: string;
  minScore: number;
}

export function FilterModal({
  open,
  onClose,
  filters,
  onChange,
  personas,
  darkMode,
}: {
  open: boolean;
  onClose: () => void;
  filters: ProspectFilters;
  onChange: (next: ProspectFilters) => void;
  personas: string[];
  darkMode: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
      <div
        className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl ${
          darkMode
            ? "border-slate-800 bg-slate-900 text-slate-100"
            : "border-slate-200 bg-white text-slate-900"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200/20 pb-3">
          <h2 className="inline-flex items-center gap-2 text-base font-bold">
            <Filter className="h-4 w-4 text-indigo-500" />
            Prospect Search Filters
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-slate-500/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold mb-1">
              Target Persona
            </label>
            <select
              value={filters.persona}
              onChange={(e) =>
                onChange({ ...filters, persona: e.target.value })
              }
              className={`w-full rounded-lg border px-3 py-2 text-xs ${
                darkMode
                  ? "border-slate-700 bg-slate-800 text-slate-100"
                  : "border-slate-300 bg-white text-slate-900"
              }`}
            >
              <option value="ALL">All Target Personas</option>
              {personas.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">
              City / State / Region
            </label>
            <input
              type="text"
              value={filters.location}
              onChange={(e) =>
                onChange({ ...filters, location: e.target.value })
              }
              placeholder="e.g. Pune, Bengaluru, India"
              className={`w-full rounded-lg border px-3 py-2 text-xs ${
                darkMode
                  ? "border-slate-700 bg-slate-800 text-slate-100"
                  : "border-slate-300 bg-white text-slate-900"
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">
              Skill / Role Keyword
            </label>
            <input
              type="text"
              value={filters.skillKeyword}
              onChange={(e) =>
                onChange({ ...filters, skillKeyword: e.target.value })
              }
              placeholder="e.g. Principal, CBSE, Trustee"
              className={`w-full rounded-lg border px-3 py-2 text-xs ${
                darkMode
                  ? "border-slate-700 bg-slate-800 text-slate-100"
                  : "border-slate-300 bg-white text-slate-900"
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">
              Minimum Relevance Score ({filters.minScore}%)
            </label>
            <input
              type="range"
              min={0}
              max={90}
              step={5}
              value={filters.minScore}
              onChange={(e) =>
                onChange({ ...filters, minScore: Number(e.target.value) })
              }
              className="mt-2 w-full accent-indigo-600"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-between gap-3 border-t border-slate-200/20 pt-4">
          <button
            type="button"
            onClick={() =>
              onChange({
                persona: "ALL",
                location: "",
                skillKeyword: "",
                minScore: 0,
              })
            }
            className="rounded-lg px-3 py-2 text-xs font-semibold opacity-70 hover:opacity-100"
          >
            Clear Filters
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}

