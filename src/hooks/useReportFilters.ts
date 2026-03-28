import { useMemo, useState } from "react";
import * as XLSX from "xlsx";

export interface ReportRow {
  sessionId: string;
  studentName: string;
  studentEmail: string;
  examId: string;
  examTitle: string;
  examSubject: string;
  score: number | null;
  totalMarks: number | null;
  status: string;
  submittedAt: string | null;
  correct: number;
  incorrect: number;
  unanswered: number;
  totalQuestions: number;
  percentage: number | null;
  tabSwitches: number;
  fullscreenExits: number;
  suspiciousScore: "Low" | "Medium" | "High";
}

export function useReportFilters(reports: ReportRow[]) {
  const [examFilter, setExamFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<"percentage" | "studentName">("percentage");
  const [sortAsc, setSortAsc] = useState(false);

  const toggleSort = (field: "percentage" | "studentName") => {
    if (sortField === field) setSortAsc((v) => !v);
    else { setSortField(field); setSortAsc(false); }
  };

  const filtered = useMemo(() => {
    let rows = reports.filter((r) => r.status === "submitted");
    if (examFilter !== "all") rows = rows.filter((r) => r.examId === examFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.studentName.toLowerCase().includes(q) ||
          r.studentEmail.toLowerCase().includes(q)
      );
    }
    rows = [...rows].sort((a, b) => {
      if (sortField === "percentage") {
        return sortAsc
          ? (a.percentage ?? -1) - (b.percentage ?? -1)
          : (b.percentage ?? -1) - (a.percentage ?? -1);
      }
      return sortAsc
        ? a.studentName.localeCompare(b.studentName)
        : b.studentName.localeCompare(a.studentName);
    });
    return rows;
  }, [reports, examFilter, search, sortField, sortAsc]);

  const exportXLSX = (filename = "results.xlsx") => {
    if (!filtered.length) return;
    const data = filtered.map((r, i) => ({
      Rank: i + 1,
      "Student Name": r.studentName,
      Email: r.studentEmail,
      Exam: r.examTitle,
      Subject: r.examSubject,
      Score: r.score ?? 0,
      "Total Marks": r.totalMarks ?? 0,
      "%": r.percentage ?? 0,
      Correct: r.correct,
      Incorrect: r.incorrect,
      Unanswered: r.unanswered,
      Risk: r.suspiciousScore,
      "Submitted At": r.submittedAt
        ? new Date(r.submittedAt).toLocaleString()
        : "—",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Results");
    XLSX.writeFile(wb, filename);
  };

  return {
    examFilter, setExamFilter,
    search, setSearch,
    sortField, sortAsc, toggleSort,
    filtered,
    exportXLSX,
  };
}
