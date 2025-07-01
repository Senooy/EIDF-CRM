import { PrismaClient, UserRole, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { EncryptionService } from '../src/server/services/encryption.service';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create a demo user (this would normally come from Firebase Auth)
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      id: 'demo-user-firebase-uid',
      email: 'demo@example.com',
      displayName: 'Demo User',
    },
  });

  console.log('✅ Created demo user:', demoUser.email);

  // Create demo organizations with different subscription plans
  const org1 = await prisma.organization.create({
    data: {
      name: 'Demo Store Free',
      slug: 'demo-store-free',
      website: 'https://demo-free.example.com',
      users: {
        create: {
          userId: demoUser.id,
          role: UserRole.OWNER,
        },
      },
      subscription: {
        create: {
          plan: SubscriptionPlan.FREE,
          status: SubscriptionStatus.ACTIVE,
          maxUsers: 1,
          maxProducts: 100,
          maxOrders: 1000,
          aiGenerationsPerMonth: 50,
        },
      },
    },
  });

  console.log('✅ Created organization:', org1.name);

  const org2 = await prisma.organization.create({
    data: {
      name: 'Demo Store Pro',
      slug: 'demo-store-pro',
      website: 'https://demo-pro.example.com',
      users: {
        create: {
          userId: demoUser.id,
          role: UserRole.OWNER,
        },
      },
      subscription: {
        create: {
          plan: SubscriptionPlan.PROFESSIONAL,
          status: SubscriptionStatus.ACTIVE,
          maxUsers: 10,
          maxProducts: 10000,
          maxOrders: 50000,
          aiGenerationsPerMonth: 1000,
          customerId: 'cus_demo_pro',
          subscriptionId: 'sub_demo_pro',
        },
      },
    },
  });

  console.log('✅ Created organization:', org2.name);

  // Add demo API credentials (encrypted)
  // Note: These are dummy credentials for demo purposes
  const demoWooCommerceCredentials = {
    apiUrl: 'https://demo.woocommerce.com',
    consumerKey: 'ck_demo_1234567890abcdef',
    consumerSecret: 'cs_demo_abcdef1234567890',
  };

  const demoGeminiCredentials = {
    apiKey: 'AIzaSy_demo_key_for_testing',
  };

  // Only create credentials if encryption key is available
  if (process.env.ENCRYPTION_KEY) {
    await prisma.apiCredential.create({
      data: {
        organizationId: org1.id,
        service: 'woocommerce',
        name: 'Demo WooCommerce',
        credentials: EncryptionService.encryptObject(demoWooCommerceCredentials),
      },
    });

    await prisma.apiCredential.create({
      data: {
        organizationId: org2.id,
        service: 'woocommerce',
        name: 'Pro WooCommerce',
        credentials: EncryptionService.encryptObject(demoWooCommerceCredentials),
      },
    });

    await prisma.apiCredential.create({
      data: {
        organizationId: org2.id,
        service: 'gemini',
        name: 'Gemini AI',
        credentials: EncryptionService.encryptObject(demoGeminiCredentials),
      },
    });

    console.log('✅ Created demo API credentials');
  } else {
    console.log('⚠️  Skipping API credentials (ENCRYPTION_KEY not set)');
  }

  // Create some activity logs
  await prisma.activityLog.createMany({
    data: [
      {
        organizationId: org1.id,
        userId: demoUser.id,
        action: 'organization.created',
        entityType: 'organization',
        entityId: org1.id,
      },
      {
        organizationId: org2.id,
        userId: demoUser.id,
        action: 'organization.created',
        entityType: 'organization',
        entityId: org2.id,
      },
    ],
  });

  console.log('✅ Created activity logs');

  console.log('🎉 Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });