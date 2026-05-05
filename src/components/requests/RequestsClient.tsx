"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, X, Loader2, CheckCircle, XCircle, Clock, Ban } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";

const LEAVE_TYPES = ["VACATION", "REMOTE_WORK", "SICK_LEAVE", "PERSONAL_LEAVE", "MATERNITY_PATERNITY", "OTHER"];

interface RequestUser {
  id: string;
  name: string;
  image: string | null;
  position: string | null;
  department: string | null;
}

interface LeaveRequest {
  id: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  adminComment: string | null;
  createdAt: string;
  requestedBy: RequestUser;
  approvedBy: { id: string; name: string } | null;
}

function statusIcon(status: string) {
  switch (status) {
    case "APPROVED": return <CheckCircle className="w-4 h-4 text-green-500" />;
    case "REJECTED": return <XCircle className="w-4 h-4 text-red-500" />;
    case "CANCELLED": return <Ban className="w-4 h-4 text-gray-400" />;
    default: return <Clock className="w-4 h-4 text-amber-500" />;
  }
}

function statusClass(status: string) {
  switch (status) {
    case "APPROVED": return "bg-green-50 text-green-700";
    case "REJECTED": return "bg-red-50 text-red-700";
    case "CANCELLED": return "bg-gray-100 text-gray-500";
    default: return "bg-amber-50 text-amber-700";
  }
}

const typeEmoji: Record<string, string> = {
  VACATION: "🌴", REMOTE_WORK: "🏠", SICK_LEAVE: "🤒",
  PERSONAL_LEAVE: "🧑", MATERNITY_PATERNITY: "👶", OTHER: "📋",
};

interface Props {
  currentUserId: string;
  isManagerOrAdmin: boolean;
}

export default function RequestsClient({ currentUserId, isManagerOrAdmin }: Props) {
  const t = useTranslations("requests");
  const tc = useTranslations("common");
  const [tab, setTab] = useState<"mine" | "approve">("mine");
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "VACATION", startDate: "", endDate: "", reason: "" });
  const [saving, setSaving] = useState(false);
  const [approveModal, setApproveModal] = useState<{ id: string; action: "APPROVED" | "REJECTED" } | null>(null);
  const [comment, setComment] = useState("");

  useEffect(() => {
    loadRequests();
  }, [tab]);

  async function loadRequests() {
    setLoading(true);
    const url = tab === "approve" ? "/api/requests?view=approve" : "/api/requests";
    const res = await fetch(url);
    const data = await res.json();
    setRequests(data);
    setLoading(false);
  }

  async function handleCreate() {
    if (!form.type || !form.startDate || !form.endDate) return;
    setSaving(true);
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ type: "VACATION", startDate: "", endDate: "", reason: "" });
      loadRequests();
    }
    setSaving(false);
  }

  async function handleApprove() {
    if (!approveModal) return;
    setSaving(true);
    await fetch(`/api/requests/${approveModal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: approveModal.action, adminComment: comment }),
    });
    setApproveModal(null);
    setComment("");
    setSaving(false);
    loadRequests();
  }

  async function handleCancel(id: string) {
    await fetch(`/api/requests/${id}`, { method: "DELETE" });
    loadRequests();
  }

  const daysBetween = (start: string, end: string) => {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setTab("mine")}
          className={cn("px-4 py-2 text-sm font-medium rounded-xl transition-colors", tab === "mine" ? "bg-brand-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50")}
        >
          {t("myRequests")}
        </button>
        {isManagerOrAdmin && (
          <button
            onClick={() => setTab("approve")}
            className={cn("px-4 py-2 text-sm font-medium rounded-xl transition-colors", tab === "approve" ? "bg-brand-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50")}
          >
            {t("toApprove")}
          </button>
        )}
        <div className="flex-1" />
        {tab === "mine" && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t("newRequest")}
          </button>
        )}
      </div>

      {/* New Request Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">{t("newRequest")}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">{t("type")}</label>
                <div className="grid grid-cols-2 gap-2">
                  {LEAVE_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, type }))}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all text-left",
                        form.type === type
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-gray-200 text-gray-600 hover:border-brand-300"
                      )}
                    >
                      <span>{typeEmoji[type]}</span>
                      {t(`types.${type}`)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">{t("startDate")}</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">{t("endDate")}</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
              </div>
              <textarea
                placeholder={`${t("reason")} (${tc("optional")})`}
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                rows={2}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
              />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 text-gray-700 text-sm py-2.5 rounded-xl hover:bg-gray-50">
                {tc("cancel")}
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.startDate || !form.endDate}
                className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm py-2.5 rounded-xl transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : tc("submit")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve/Reject Modal */}
      {approveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-3">
              {approveModal.action === "APPROVED" ? tc("approve") : tc("reject")}
            </h2>
            <textarea
              placeholder={`${t("adminComment")} (${tc("optional")})`}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setApproveModal(null)} className="flex-1 border border-gray-200 text-gray-700 text-sm py-2.5 rounded-xl hover:bg-gray-50">
                {tc("cancel")}
              </button>
              <button
                onClick={handleApprove}
                disabled={saving}
                className={cn(
                  "flex-1 text-white text-sm py-2.5 rounded-xl transition-colors disabled:opacity-50",
                  approveModal.action === "APPROVED" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                )}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : tc("confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center text-gray-400 py-16">{t("noRequests")}</div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{typeEmoji[req.type]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-gray-900">{t(`types.${req.type}`)}</span>
                    <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full", statusClass(req.status))}>
                      {statusIcon(req.status)}
                      {tc(req.status.toLowerCase() as "pending" | "approved" | "rejected" | "cancelled")}
                    </span>
                  </div>
                  {tab === "approve" && (
                    <p className="text-xs text-brand-600 font-medium mt-0.5">{req.requestedBy.name} · {req.requestedBy.department}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(req.startDate)} — {formatDate(req.endDate)}{" "}
                    <span className="text-gray-400">({daysBetween(req.startDate, req.endDate)} {tc("days")})</span>
                  </p>
                  {req.reason && <p className="text-xs text-gray-600 mt-1 italic">"{req.reason}"</p>}
                  {req.adminComment && (
                    <p className="text-xs text-gray-500 mt-1 bg-gray-50 rounded-lg px-2 py-1">
                      💬 {req.adminComment}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 shrink-0">
                  {tab === "approve" && req.status === "PENDING" && (
                    <>
                      <button
                        onClick={() => setApproveModal({ id: req.id, action: "APPROVED" })}
                        className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setApproveModal({ id: req.id, action: "REJECTED" })}
                        className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {tab === "mine" && req.status === "PENDING" && (
                    <button
                      onClick={() => handleCancel(req.id)}
                      className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
