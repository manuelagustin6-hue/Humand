import { getTranslations } from "next-intl/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AppShell from "@/components/layout/AppShell";
import { prisma } from "@/lib/prisma";
import { formatDate, avatarUrl } from "@/lib/utils";
import { Mail, Phone, Briefcase, Building2, Calendar, Shield } from "lucide-react";

export default async function ProfilePage() {
  const t = await getTranslations("nav");
  const session = await getServerSession(authOptions);

  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    include: { manager: { select: { name: true, position: true } } },
  });

  if (!user) return null;

  const roleLabel: Record<string, string> = {
    EMPLOYEE: "Empleado",
    MANAGER: "Manager",
    ADMIN: "Administrador",
  };

  return (
    <AppShell title={t("profile")}>
      <div className="p-4 max-w-2xl mx-auto">
        {/* Header card */}
        <div className="bg-gradient-to-r from-brand-700 to-brand-900 rounded-2xl p-6 mb-4 text-white">
          <div className="flex items-center gap-4">
            <img
              src={user.image ?? avatarUrl(user.name ?? "?")}
              alt={user.name ?? ""}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-white/30"
            />
            <div>
              <h1 className="text-xl font-bold">{user.name}</h1>
              {user.position && <p className="text-brand-200 text-sm mt-0.5">{user.position}</p>}
              {user.department && (
                <span className="inline-block mt-2 bg-white/20 text-white text-xs px-2.5 py-1 rounded-full">
                  {user.department}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={user.email ?? "—"} />
          <InfoRow icon={<Phone className="w-4 h-4" />} label="Teléfono" value={user.phone ?? "—"} />
          <InfoRow icon={<Briefcase className="w-4 h-4" />} label="Cargo" value={user.position ?? "—"} />
          <InfoRow icon={<Building2 className="w-4 h-4" />} label="Departamento" value={user.department ?? "—"} />
          {user.manager && (
            <InfoRow icon={<Briefcase className="w-4 h-4" />} label="Manager" value={user.manager.name ?? "—"} />
          )}
          {user.startDate && (
            <InfoRow icon={<Calendar className="w-4 h-4" />} label="Fecha de ingreso" value={formatDate(user.startDate)} />
          )}
          {user.birthDate && (
            <InfoRow icon={<Calendar className="w-4 h-4" />} label="Cumpleaños" value={formatDate(user.birthDate)} />
          )}
          <InfoRow
            icon={<Shield className="w-4 h-4" />}
            label="Rol"
            value={
              <span className="inline-flex items-center bg-brand-50 text-brand-700 text-xs font-medium px-2.5 py-1 rounded-full">
                {roleLabel[user.role] ?? user.role}
              </span>
            }
          />
        </div>
      </div>
    </AppShell>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-800">{value}</p>
      </div>
    </div>
  );
}
