
<<<<<<< HEAD
const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  const admins = [
    {
      email: "himanshu@sayitlpu.com",
      password: "@Tiwari01",
    },
    {
      email: "bhanu@sayitlpu.com",
      password: "bhanu123",
    },
    {
      email: "harsh@sayitlpu.com",
      password: "harsh123",
    },
  ]

  for (const adminData of admins) {
    const hashedPassword = await bcrypt.hash(adminData.password, 10)

    const admin = await prisma.user.upsert({
      where: { email: adminData.email },
      update: {},
      create: {
        email: adminData.email,
        hashedPassword,
        idCardFileKey: "null",
        idCardImage: "null",
        status: "APPROVED",
        role: "ADMIN",
      },
    })

    console.log(`Admin created: ${admin.email}`)
    console.log(`Password: ${adminData.password}`)
  }

  console.log("\n⚠️  IMPORTANT: Change all admin passwords after first login!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
=======
>>>>>>> 2b3508ff2ed6cbdc877a0f1107c1e52aa4f58798
