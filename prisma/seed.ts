import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  const adminEmail = "admin@sayitlpu.com"
  const adminPassword = await bcrypt.hash("admin123", 10)

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      hashedPassword: adminPassword,
      idCardFileKey: "null",
      idCardImage: "null",  // 👈 FIXED
      status: "APPROVED",
      role: "ADMIN",
    },
  })

  console.log("Admin user created:", admin.email)
  console.log("Admin password: admin123")
  console.log("\n⚠️  IMPORTANT: Change the admin password after first login!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })