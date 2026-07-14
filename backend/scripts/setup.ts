import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@kootaflow.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123!';
  const adminName = process.env.ADMIN_NAME || 'System Administrator';

  const userCount = await prisma.user.count();

  if (userCount > 0) {
    console.log('System already initialized with users. Setup aborted.');
    return;
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.create({
    data: {
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
      createdBy: 'SYSTEM',
    },
  });

  console.log('First System Administrator created successfully:');
  console.log(`Email: ${adminEmail}`);
  console.log(`Password: ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
