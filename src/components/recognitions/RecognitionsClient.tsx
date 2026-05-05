"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Award, Plus, X, Loader2 } from "lucide-react";
import { formatDate, avatarUrl } from "@/lib/utils";

interface RecognitionUser {
  id: string;
  name: string;
  image: string | null;
  position: string | null;
}

interface Recognition {
  id: string;
  message: string;
  category: string;
  createdAt: string;
  givenBy: RecognitionUser;
  receivedBy: RecognitionUser;
}

const CATEGORIES = ["great_job", "team_player", "innovation", "leadership", "customer_focus", "above_beyond"];

const categoryEmoji: Record<string, string> = {
  great_job: "🌟", team_player: "🤝", innovation: "💡",
  leadership: "🎯", customer_focus: "❤️", above_beyond: "🚀",
};

export default function RecognitionsClient() {
  const t = useTranslations("recognitions");
  const tc = useTranslations("common");
  const [items, setItems] = useState<Recognition[]>([]);
  const [employees, setEmployees] = useState<RecognitionUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ receivedById: "", message: "", category: "great_job" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/recognitions").then((r) => r.json()),
      fetch("/api/employees").then((r) => r.json()),
    ]).then(([recs, emps]) => {
      setItems(recs);
      setEmployees(emps);
      setLoading(false);
    });
  }, []);

  async function handleCreate() {
    if (!form.receivedById || !form.message.trim()) return;
    setSaving(true);
    const res = await fetch("/api/recognitions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const rec = await res.json();
      setItems((prev) => [rec, ...prev]);
      setShowForm(false);
      setForm({ receivedById: "", message: "", category: "great_job" });
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex justify-end mb-5">
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t("give")}
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">{t("give")}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">{t("to")}</label>
                <select
                  value={form.receivedById}
                  onChange={(e) => setForm((f) => ({ ...f, receivedById: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                >
                  <option value="">Seleccionar empleado...</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">{t("category")}</label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, category: cat }))}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                        form.category === cat
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-gray-200 text-gray-600 hover:border-brand-300"
                      }`}
                    >
                      <span>{categoryEmoji[cat]}</span>
                      {t(`categories.${cat}`)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">{t("message")}</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  rows={3}
                  placeholder="Escribe un mensaje de reconocimiento..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 text-gray-700 text-sm py-2.5 rounded-xl hover:bg-gray-50">
                {tc("cancel")}
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.receivedById || !form.message.trim()}
                className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm py-2.5 rounded-xl transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : tc("send")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {items.length === 0 ? (
        <div className="text-center text-gray-400 py-16">{t("noRecognitions")}</div>
      ) : (
        <div className="space-y-4">
          {items.map((rec) => (
            <div key={rec.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start gap-3">
                <div className="text-2xl shrink-0">{categoryEmoji[rec.category]}</div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-1 text-sm text-gray-600 mb-2">
                    <span className="font-semibold text-gray-900">{rec.givenBy.name}</span>
                    <span>reconoció a</span>
                    <span className="font-semibold text-brand-700">{rec.receivedBy.name}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 text-xs font-medium px-2.5 py-1 rounded-full">
                      <Award className="w-3 h-3" />
                      {t(`categories.${rec.category}`)}
                    </span>
                  </div>
                  <p className="text-gray-700 text-sm italic">"{rec.message}"</p>
                  <div className="flex items-center gap-3 mt-3">
                    <img
                      src={rec.receivedBy.image ?? avatarUrl(rec.receivedBy.name)}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover"
                    />
                    <div>
                      <p className="text-xs font-medium text-gray-800">{rec.receivedBy.name}</p>
                      {rec.receivedBy.position && (
                        <p className="text-xs text-gray-500">{rec.receivedBy.position}</p>
                      )}
                    </div>
                    <span className="ml-auto text-xs text-gray-400">{formatDate(rec.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
