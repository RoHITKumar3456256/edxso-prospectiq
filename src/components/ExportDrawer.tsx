"use client";

import React, { useState } from "react";
import { Download, FileJson, FileSpreadsheet, X } from "lucide-react";
import {
  ALL_EXPORT_COLUMNS,
  exportDiscoveryToCsv,
  exportDiscoveryToJson,
} from "@/lib/exportUtils";
import { DiscoveryResponse } from "@/types/discovery";

export function ExportDrawer({
  open,
  onClose,
  result,
  darkMode,
}: {
  open: boolean;
  onClose: () => void;
  result: DiscoveryResponse | null;
  darkMode: boolean;
}) {
  const [selectedCols, setSelectedCols] = useState<string[]>(
    ALL_EXPORT_COLUMNS.map((c) => c.key)
  );

  if (!open || !result) return null;

  function toggleCol(key: string) {
    setSelectedCols((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function triggerDownload(type: "csv" | "json") {
    if (!result) return;
    const content =
      type === "csv"
        ? exportDiscoveryToCsv(result, selectedCols)
        : exportDiscoveryToJson(result);
    const blob = new Blob([content], {
      type: type === "csv" ? "text/csv;charset=utf-8" : "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `edxso-prospects-${result.runId}.${type}`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-xs">
      <div
        className={`flex h-full w-full max-w-md flex-col justify-between p-6 shadow-2xl ${
          darkMode
            ? "bg-slate-900 text-slate-100 border-l border-slate-800"
            : "bg-white text-slate-900 border-l border-slate-200"
        }`}
      >
        <div className="overflow-y-auto pr-1">
          <div className="flex items-center justify-between border-b border-slate-200/20 pb-4">
            <div>
              <h2 className="text-lg font-bold">Export Prospect Results</h2>
              <p className="text-xs opacity-70">
                Includes {result.commenters.length} Original Commenters &amp;{" "}
                {result.lookalikes.length} AI Lookalikes
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 hover:bg-slate-500/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs">
            <span className="font-semibold">
              Select CSV Columns ({selectedCols.length}/{ALL_EXPORT_COLUMNS.length})
            </span>
            <button
              type="button"
              onClick={() =>
                setSelectedCols(
                  selectedCols.length === ALL_EXPORT_COLUMNS.length
                    ? ["category", "name", "linkedin_profile_url", "relevance_score"]
                    : ALL_EXPORT_COLUMNS.map((c) => c.key)
                )
              }
              className="font-semibold text-indigo-500 hover:underline"
            >
              {selectedCols.length === ALL_EXPORT_COLUMNS.length
                ? "Minimal Set"
                : "Select All"}
            </button>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2">
            {ALL_EXPORT_COLUMNS.map((col) => {
              const checked = selectedCols.includes(col.key);
              return (
                <label
                  key={col.key}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-xs transition ${
                    darkMode
                      ? "border-slate-800 hover:bg-slate-800/60"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCol(col.key)}
                    className="h-4 w-4 rounded accent-indigo-600"
                  />
                  <span className="font-medium">{col.label}</span>
                  <span className="ml-auto font-mono text-[10px] opacity-55">
                    {col.key}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex gap-2 border-t border-slate-200/20 pt-4">
          <button
            type="button"
            disabled={selectedCols.length === 0}
            onClick={() => triggerDownload("csv")}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Download CSV
          </button>
          <button
            type="button"
            onClick={() => triggerDownload("json")}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border px-4 py-2.5 text-xs font-semibold ${
              darkMode
                ? "border-slate-700 bg-slate-800 hover:bg-slate-700"
                : "border-slate-200 bg-slate-50 hover:bg-slate-100"
            }`}
          >
            <FileJson className="h-4 w-4" />
            Download JSON
          </button>
        </div>
      </div>
    </div>
  );
}

