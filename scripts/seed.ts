import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create admin user
  const adminPassword = await hash('Admin123!', 12)
  await prisma.user.upsert({
    where: { email: 'admin@kayalsoulpath.com' },
    update: {},
    create: {
      email: 'admin@kayalsoulpath.com',
      name: 'Admin User',
      password: adminPassword,
      sessionId: 'admin-' + Date.now(),
      dob: new Date('1990-01-01'),
      role: 'admin',
      isAdmin: true
    }
  })

  console.log('✅ Database seeded!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())