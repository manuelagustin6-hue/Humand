"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, Mail, Phone, Users, Briefcase, Loader2 } from "lucide-react";
import { avatarUrl } from "@/lib/utils";

interface Employee {
  id: string;
  name: string;
  email: string;
  image: string | null;
  position: string | null;
  department: string | null;
  phone: string | null;
  role: string;
  manager: { id: string; name: string } | null;
  _count: { teamMembers: number };
}

export default function DirectoryClient() {
  const t = useTranslations("directory");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/employees")
      .then((r) => r.json())
      .then((data) => { setEmployees(data); setLoading(false); });
  }, []);

  const departments = Array.from(new Set(employees.map((e) => e.department).filter(Boolean) as string[])).sort();

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      e.name?.toLowerCase().includes(q) ||
      e.position?.toLowerCase().includes(q) ||
      e.department?.toLowerCase().includes(q) ||
      e.email?.toLowerCase().includes(q);
    const matchDept = !department || e.department === department;
    return matchSearch && matchDept;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        >
          <option value="">{t("allDepartments")}</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-16">{t("noEmployees")}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((emp) => (
            <div key={emp.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex flex-col items-center text-center mb-4">
                <img
                  src={emp.image ?? avatarUrl(emp.name ?? "?")}
                  alt={emp.name ?? ""}
                  className="w-16 h-16 rounded-full object-cover mb-3"
                />
                <h3 className="font-semibold text-gray-900 text-sm">{emp.name}</h3>
                {emp.position && (
                  <p className="text-xs text-brand-600 font-medium mt-0.5">{emp.position}</p>
                )}
                {emp.department && (
                  <span className="mt-1.5 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {emp.department}
                  </span>
                )}
              </div>

              <div className="space-y-1.5 text-xs text-gray-600">
                {emp.email && (
                  <a href={`mailto:${emp.email}`} className="flex items-center gap-2 hover:text-brand-600 transition-colors">
                    <Mail className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                    <span className="truncate">{emp.email}</span>
                  </a>
                )}
                {emp.phone && (
                  <a href={`tel:${emp.phone}`} className="flex items-center gap-2 hover:text-brand-600 transition-colors">
                    <Phone className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                    <span>{emp.phone}</span>
                  </a>
                )}
                {emp.manager && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                    <span className="truncate">{emp.manager.name}</span>
                  </div>
                )}
                {emp._count.teamMembers > 0 && (
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                    <span>{emp._count.teamMembers} {t("teamSize")}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
