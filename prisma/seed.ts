import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const adminPassword = await bcrypt.hash("admin123", 10);
  const password = await bcrypt.hash("empleado123", 10);

  // Admin
  const admin = await prisma.user.upsert({
    where: { email: "admin@ha-rrhh.com" },
    update: {},
    create: {
      name: "Administrador HA RRHH",
      email: "admin@ha-rrhh.com",
      password: adminPassword,
      role: "ADMIN",
      position: "Director de RRHH",
      department: "Recursos Humanos",
      phone: "+54 11 1234-5678",
      startDate: new Date("2020-01-15"),
    },
  });

  // Managers
  const manager1 = await prisma.user.upsert({
    where: { email: "lucia.garcia@ha-rrhh.com" },
    update: {},
    create: {
      name: "Lucía García",
      email: "lucia.garcia@ha-rrhh.com",
      password,
      role: "MANAGER",
      position: "Gerente de Tecnología",
      department: "Tecnología",
      phone: "+54 11 2345-6789",
      startDate: new Date("2021-03-01"),
      birthDate: new Date("1985-07-14"),
    },
  });

  const manager2 = await prisma.user.upsert({
    where: { email: "martin.lopez@ha-rrhh.com" },
    update: {},
    create: {
      name: "Martín López",
      email: "martin.lopez@ha-rrhh.com",
      password,
      role: "MANAGER",
      position: "Gerente Comercial",
      department: "Ventas",
      phone: "+54 11 3456-7890",
      startDate: new Date("2019-06-10"),
      birthDate: new Date("1980-03-22"),
    },
  });

  // Employees
  const emp1 = await prisma.user.upsert({
    where: { email: "sofia.martinez@ha-rrhh.com" },
    update: {},
    create: {
      name: "Sofía Martínez",
      email: "sofia.martinez@ha-rrhh.com",
      password,
      role: "EMPLOYEE",
      position: "Desarrolladora Senior",
      department: "Tecnología",
      phone: "+54 11 4567-8901",
      managerId: manager1.id,
      startDate: new Date("2022-04-05"),
      birthDate: new Date("1993-11-28"),
    },
  });

  const emp2 = await prisma.user.upsert({
    where: { email: "diego.fernandez@ha-rrhh.com" },
    update: {},
    create: {
      name: "Diego Fernández",
      email: "diego.fernandez@ha-rrhh.com",
      password,
      role: "EMPLOYEE",
      position: "Desarrollador Junior",
      department: "Tecnología",
      phone: "+54 11 5678-9012",
      managerId: manager1.id,
      startDate: new Date("2023-08-01"),
      birthDate: new Date("1998-05-15"),
    },
  });

  const emp3 = await prisma.user.upsert({
    where: { email: "camila.rodriguez@ha-rrhh.com" },
    update: {},
    create: {
      name: "Camila Rodríguez",
      email: "camila.rodriguez@ha-rrhh.com",
      password,
      role: "EMPLOYEE",
      position: "Ejecutiva de Ventas",
      department: "Ventas",
      phone: "+54 11 6789-0123",
      managerId: manager2.id,
      startDate: new Date("2022-01-10"),
      birthDate: new Date("1990-09-03"),
    },
  });

  const emp4 = await prisma.user.upsert({
    where: { email: "nicolas.perez@ha-rrhh.com" },
    update: {},
    create: {
      name: "Nicolás Pérez",
      email: "nicolas.perez@ha-rrhh.com",
      password,
      role: "EMPLOYEE",
      position: "Diseñador UX/UI",
      department: "Tecnología",
      phone: "+54 11 7890-1234",
      managerId: manager1.id,
      startDate: new Date("2021-11-15"),
      birthDate: new Date("1995-02-17"),
    },
  });

  // Posts
  const post1 = await prisma.post.upsert({
    where: { id: "seed-post-1" },
    update: {},
    create: {
      id: "seed-post-1",
      content: "¡Bienvenidos a la nueva plataforma interna de HA RRHH! Aquí podrán encontrar noticias de la empresa, gestionar solicitudes, comunicarse con sus compañeros y mucho más. ¡Esperamos que sea de gran utilidad para todos!",
      pinned: true,
      authorId: admin.id,
    },
  });

  await prisma.post.upsert({
    where: { id: "seed-post-2" },
    update: {},
    create: {
      id: "seed-post-2",
      content: "Recordatorio: Este viernes a las 17hs tenemos el cierre de sprint y festejo de Q2. ¡Los esperamos a todos en la sala principal!",
      authorId: manager1.id,
    },
  });

  await prisma.post.upsert({
    where: { id: "seed-post-3" },
    update: {},
    create: {
      id: "seed-post-3",
      content: "Orgulloso de compartir que el equipo de Ventas superó la meta del trimestre en un 120%. ¡Gracias a todos por el esfuerzo!",
      authorId: manager2.id,
    },
  });

  // Like
  await prisma.like.upsert({
    where: { postId_userId: { postId: "seed-post-1", userId: emp1.id } },
    update: {},
    create: { postId: "seed-post-1", userId: emp1.id },
  });

  // Events
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  await prisma.event.upsert({
    where: { id: "seed-event-1" },
    update: {},
    create: {
      id: "seed-event-1",
      title: "Revisión trimestral Q2",
      description: "Presentación de resultados del segundo trimestre",
      location: "Sala de reuniones principal",
      startDate: nextWeek,
      color: "#3b82f6",
      createdById: admin.id,
    },
  });

  await prisma.event.upsert({
    where: { id: "seed-event-2" },
    update: {},
    create: {
      id: "seed-event-2",
      title: "Capacitación: Nuevas herramientas de productividad",
      description: "Taller práctico sobre herramientas digitales",
      location: "Sala de capacitación - Piso 3",
      startDate: nextMonth,
      allDay: true,
      color: "#10b981",
      createdById: manager1.id,
    },
  });

  // Documents
  await prisma.document.upsert({
    where: { id: "seed-doc-1" },
    update: {},
    create: {
      id: "seed-doc-1",
      name: "Política de Vacaciones 2024",
      description: "Reglamento para solicitar y gestionar vacaciones",
      fileUrl: "https://example.com/docs/politica-vacaciones.pdf",
      fileType: "PDF",
      fileSize: 245000,
      category: "Policies",
      uploadedById: admin.id,
    },
  });

  await prisma.document.upsert({
    where: { id: "seed-doc-2" },
    update: {},
    create: {
      id: "seed-doc-2",
      name: "Beneficios para Empleados",
      description: "Listado completo de beneficios y cómo acceder a ellos",
      fileUrl: "https://example.com/docs/beneficios.pdf",
      fileType: "PDF",
      fileSize: 180000,
      category: "Benefits",
      uploadedById: admin.id,
    },
  });

  await prisma.document.upsert({
    where: { id: "seed-doc-3" },
    update: {},
    create: {
      id: "seed-doc-3",
      name: "Plantilla de Objetivos Trimestrales",
      description: "Template para definir y seguir los OKRs del equipo",
      fileUrl: "https://example.com/docs/template-okr.xlsx",
      fileType: "XLSX",
      fileSize: 52000,
      category: "Templates",
      uploadedById: manager1.id,
    },
  });

  // Recognitions
  await prisma.recognition.upsert({
    where: { id: "seed-rec-1" },
    update: {},
    create: {
      id: "seed-rec-1",
      message: "Sofía hizo un trabajo excepcional en el lanzamiento del nuevo módulo de reportes. ¡Su dedicación y calidad técnica son un ejemplo para todos!",
      category: "great_job",
      givenById: manager1.id,
      receivedById: emp1.id,
    },
  });

  await prisma.recognition.upsert({
    where: { id: "seed-rec-2" },
    update: {},
    create: {
      id: "seed-rec-2",
      message: "Camila siempre está dispuesta a ayudar al equipo y su actitud positiva hace que trabajar juntos sea mucho más fácil.",
      category: "team_player",
      givenById: emp1.id,
      receivedById: emp3.id,
    },
  });

  // Leave requests
  await prisma.leaveRequest.upsert({
    where: { id: "seed-req-1" },
    update: {},
    create: {
      id: "seed-req-1",
      type: "VACATION",
      status: "PENDING",
      startDate: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000),
      endDate: new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000),
      reason: "Vacaciones de verano con la familia",
      requestedById: emp1.id,
    },
  });

  await prisma.leaveRequest.upsert({
    where: { id: "seed-req-2" },
    update: {},
    create: {
      id: "seed-req-2",
      type: "REMOTE_WORK",
      status: "APPROVED",
      startDate: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000),
      endDate: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000),
      reason: "Trabajo desde casa por revisación médica",
      requestedById: emp2.id,
      approvedById: manager1.id,
      adminComment: "Aprobado. ¡Que te mejores!",
    },
  });

  // Chat channels
  const general = await prisma.channel.upsert({
    where: { id: "seed-ch-general" },
    update: {},
    create: {
      id: "seed-ch-general",
      name: "general",
      description: "Canal general de la empresa",
      isPrivate: false,
    },
  });

  const tech = await prisma.channel.upsert({
    where: { id: "seed-ch-tech" },
    update: {},
    create: {
      id: "seed-ch-tech",
      name: "tecnologia",
      description: "Canal del equipo de tecnología",
      isPrivate: false,
    },
  });

  const sales = await prisma.channel.upsert({
    where: { id: "seed-ch-sales" },
    update: {},
    create: {
      id: "seed-ch-sales",
      name: "ventas",
      description: "Canal del equipo de ventas",
      isPrivate: false,
    },
  });

  // Channel members
  const users = [admin, manager1, manager2, emp1, emp2, emp3, emp4];
  for (const user of users) {
    await prisma.channelMember.upsert({
      where: { channelId_userId: { channelId: general.id, userId: user.id } },
      update: {},
      create: { channelId: general.id, userId: user.id },
    });
  }
  for (const user of [manager1, emp1, emp2, emp4]) {
    await prisma.channelMember.upsert({
      where: { channelId_userId: { channelId: tech.id, userId: user.id } },
      update: {},
      create: { channelId: tech.id, userId: user.id },
    });
  }
  for (const user of [manager2, emp3]) {
    await prisma.channelMember.upsert({
      where: { channelId_userId: { channelId: sales.id, userId: user.id } },
      update: {},
      create: { channelId: sales.id, userId: user.id },
    });
  }

  // Seed messages
  await prisma.message.upsert({
    where: { id: "seed-msg-1" },
    update: {},
    create: {
      id: "seed-msg-1",
      content: "¡Bienvenidos al nuevo canal de chat de HA RRHH! Este es el espacio para comunicarnos en tiempo real.",
      channelId: general.id,
      senderId: admin.id,
    },
  });

  await prisma.message.upsert({
    where: { id: "seed-msg-2" },
    update: {},
    create: {
      id: "seed-msg-2",
      content: "¡Excelente iniciativa! Gracias por implementar esta plataforma.",
      channelId: general.id,
      senderId: emp1.id,
    },
  });

  // Salaries
  const months = ["2025-01", "2025-02", "2025-03", "2025-04"];
  for (const user of [emp1, emp2, emp3, emp4]) {
    for (const period of months) {
      const baseGross = user.position?.includes("Senior") ? 850000 :
        user.position?.includes("Junior") ? 550000 :
        user.position?.includes("Gerente") ? 1200000 : 700000;
      const variation = 1 + (Math.random() * 0.1 - 0.05);
      const gross = Math.round(baseGross * variation);
      const net = Math.round(gross * 0.78);

      await prisma.salary.upsert({
        where: { id: `seed-salary-${user.id}-${period}` },
        update: {},
        create: {
          id: `seed-salary-${user.id}-${period}`,
          userId: user.id,
          period,
          grossAmount: gross,
          netAmount: net,
          currency: "ARS",
          breakdown: "Básico + Cargas sociales (AFIP, ART, Obra Social)",
        },
      });
    }
  }

  console.log("✅ Seed completed!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
