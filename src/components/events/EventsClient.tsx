"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, MapPin, Calendar, Clock, Loader2, X } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Event {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startDate: string;
  endDate: string | null;
  allDay: boolean;
  color: string;
}

export default function EventsClient({ canCreate }: { canCreate: boolean }) {
  const t = useTranslations("events");
  const tc = useTranslations("common");
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", location: "",
    startDate: "", endDate: "", allDay: false, color: "#3b82f6",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((data) => { setEvents(data); setLoading(false); });
  }, []);

  async function handleCreate() {
    if (!form.title.trim() || !form.startDate) return;
    setSaving(true);
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const event = await res.json();
      setEvents((prev) => [...prev, event].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()));
      setShowForm(false);
      setForm({ title: "", description: "", location: "", startDate: "", endDate: "", allDay: false, color: "#3b82f6" });
    }
    setSaving(false);
  }

  const upcoming = events.filter((e) => new Date(e.startDate) >= new Date(new Date().setHours(0, 0, 0, 0)));
  const past = events.filter((e) => new Date(e.startDate) < new Date(new Date().setHours(0, 0, 0, 0)));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      {canCreate && (
        <div className="flex justify-end mb-5">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t("newEvent")}
          </button>
        </div>
      )}

      {/* New event form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">{t("newEvent")}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                placeholder={t("eventName")}
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              <textarea
                placeholder={t("description")}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
              />
              <input
                placeholder={t("location")}
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">{t("startDate")}</label>
                  <input
                    type="datetime-local"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">{t("endDate")}</label>
                  <input
                    type="datetime-local"
                    value={form.endDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer"
                />
                <span className="text-sm text-gray-600">Color del evento</span>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 border border-gray-200 text-gray-700 text-sm py-2.5 rounded-xl hover:bg-gray-50"
              >
                {tc("cancel")}
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm py-2.5 rounded-xl transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : tc("create")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Events list */}
      {events.length === 0 ? (
        <div className="text-center text-gray-400 py-16">{t("noEvents")}</div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className="mb-8">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t("upcoming")}</h2>
              <div className="space-y-3">
                {upcoming.map((ev) => (
                  <EventCard key={ev.id} event={ev} />
                ))}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Anteriores</h2>
              <div className="space-y-3 opacity-60">
                {past.map((ev) => (
                  <EventCard key={ev.id} event={ev} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function EventCard({ event }: { event: Event }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex gap-4">
      <div
        className="w-1 rounded-full shrink-0"
        style={{ backgroundColor: event.color }}
      />
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 text-sm">{event.title}</h3>
        {event.description && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{event.description}</p>
        )}
        <div className="flex flex-wrap gap-3 mt-2">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(event.startDate)}
          </div>
          {!event.allDay && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3.5 h-3.5" />
              {new Date(event.startDate).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
          {event.location && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <MapPin className="w-3.5 h-3.5" />
              {event.location}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
