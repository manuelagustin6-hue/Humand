"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { DollarSign, Download, Plus, X, Loader2, TrendingUp } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";

interface SalaryRecord {
  id: string;
  period: string;
  grossAmount: number;
  netAmount: number;
  currency: string;
  breakdown: string | null;
  fileUrl: string | null;
  createdAt: string;
  user: { id: string; name: string; position: string | null; department: string | null };
}

interface Employee {
  id: string;
  name: string;
  position: string | null;
  department: string | null;
}

interface Props {
  isAdmin: boolean;
  currentUserId: string;
}

export default function SalariesClient({ isAdmin, currentUserId }: Props) {
  const t = useTranslations("salaries");
  const tc = useTranslations("common");
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [form, setForm] = useState({
    userId: "", period: "", grossAmount: "", netAmount: "",
    currency: "ARS", breakdown: "", fileUrl: "",
  });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const url = isAdmin && selectedEmployee
      ? `/api/salaries?userId=${selectedEmployee}`
      : "/api/salaries";

    fetch(url)
      .then((r) => r.json())
      .then((data) => { setSalaries(data); setLoading(false); });

    if (isAdmin) {
      fetch("/api/employees")
        .then((r) => r.json())
        .then(setEmployees);
    }
  }, [isAdmin, selectedEmployee]);

  async function handleCreate() {
    if (!form.userId || !form.period || !form.grossAmount || !form.netAmount) return;
    setSaving(true);
    const res = await fetch("/api/salaries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        grossAmount: parseFloat(form.grossAmount),
        netAmount: parseFloat(form.netAmount),
      }),
    });
    if (res.ok) {
      const salary = await res.json();
      setSalaries((prev) => [salary, ...prev]);
      setShowForm(false);
      setForm({ userId: "", period: "", grossAmount: "", netAmount: "", currency: "ARS", breakdown: "", fileUrl: "" });
    }
    setSaving(false);
  }

  const currentSalary = salaries[0];
  const previousSalary = salaries[1];
  const variation = currentSalary && previousSalary
    ? ((currentSalary.netAmount - previousSalary.netAmount) / previousSalary.netAmount) * 100
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      {/* Summary card */}
      {currentSalary && !isAdmin && (
        <div className="bg-gradient-to-r from-brand-700 to-brand-900 rounded-2xl p-6 mb-6 text-white">
          <p className="text-brand-300 text-sm mb-1">{t("period")}: {currentSalary.period}</p>
          <p className="text-3xl font-bold mb-1">{formatCurrency(currentSalary.netAmount, currentSalary.currency)}</p>
          <p className="text-brand-300 text-sm">
            {t("grossAmount")}: {formatCurrency(currentSalary.grossAmount, currentSalary.currency)}
          </p>
          {variation !== null && (
            <div className={cn("flex items-center gap-1 mt-2 text-sm font-medium", variation >= 0 ? "text-green-300" : "text-red-300")}>
              <TrendingUp className="w-4 h-4" />
              {variation >= 0 ? "+" : ""}{variation.toFixed(1)}% vs. período anterior
            </div>
          )}
        </div>
      )}

      {/* Admin controls */}
      {isAdmin && (
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <select
            value={selectedEmployee}
            onChange={(e) => { setSelectedEmployee(e.target.value); setLoading(true); }}
            className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            <option value="">Todos los empleados</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            {t("addRecord")}
          </button>
        </div>
      )}

      {/* New salary modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">{t("addRecord")}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <select
                value={form.userId}
                onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                <option value="">Seleccionar empleado...</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
              <input
                placeholder="Período (ej: 2024-05)"
                value={form.period}
                onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">{t("grossAmount")}</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={form.grossAmount}
                    onChange={(e) => setForm((f) => ({ ...f, grossAmount: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">{t("netAmount")}</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={form.netAmount}
                    onChange={(e) => setForm((f) => ({ ...f, netAmount: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
              </div>
              <select
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                <option value="ARS">ARS - Peso Argentino</option>
                <option value="USD">USD - Dólar</option>
                <option value="EUR">EUR - Euro</option>
              </select>
              <textarea
                placeholder={`${t("breakdown")} (${tc("optional")})`}
                value={form.breakdown}
                onChange={(e) => setForm((f) => ({ ...f, breakdown: e.target.value }))}
                rows={2}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
              />
              <input
                placeholder="URL recibo PDF (opcional)"
                value={form.fileUrl}
                onChange={(e) => setForm((f) => ({ ...f, fileUrl: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 text-gray-700 text-sm py-2.5 rounded-xl hover:bg-gray-50">
                {tc("cancel")}
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.userId || !form.period || !form.grossAmount || !form.netAmount}
                className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm py-2.5 rounded-xl transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : tc("save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t("history")}</h2>
      {salaries.length === 0 ? (
        <div className="text-center text-gray-400 py-16">{t("noSalaries")}</div>
      ) : (
        <div className="space-y-3">
          {salaries.map((salary) => (
            <div key={salary.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <button
                onClick={() => setExpandedId(expandedId === salary.id ? null : salary.id)}
                className="w-full flex items-center gap-4 p-4 text-left"
              >
                <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center shrink-0">
                  <DollarSign className="w-5 h-5 text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  {isAdmin && (
                    <p className="text-xs text-brand-600 font-medium">{salary.user.name}</p>
                  )}
                  <p className="font-semibold text-gray-900 text-sm">{salary.period}</p>
                  <p className="text-xs text-gray-500">
                    {t("netAmount")}: <span className="font-medium text-gray-800">{formatCurrency(salary.netAmount, salary.currency)}</span>
                  </p>
                </div>
                {salary.fileUrl && (
                  <a
                    href={salary.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">{t("download")}</span>
                  </a>
                )}
              </button>

              {expandedId === salary.id && (
                <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">{t("grossAmount")}</p>
                      <p className="font-medium">{formatCurrency(salary.grossAmount, salary.currency)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{t("netAmount")}</p>
                      <p className="font-medium text-green-600">{formatCurrency(salary.netAmount, salary.currency)}</p>
                    </div>
                  </div>
                  {salary.breakdown && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t("breakdown")}</p>
                      <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2">{salary.breakdown}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
