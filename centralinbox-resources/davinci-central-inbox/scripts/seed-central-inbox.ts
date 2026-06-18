import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const channels = [
    {
      id: 'website:default',
      type: 'WEBSITE' as const,
      name: 'Website Chat',
      externalAccountId: 'default',
      brandKey: 'homeu',
    },
    {
      id: 'facebook:homeu-furniture-demo',
      type: 'FACEBOOK' as const,
      name: 'HomeU Furniture FB',
      externalAccountId: 'homeu-furniture-demo',
      brandKey: 'homeu-furniture',
    },
    {
      id: 'facebook:homeu-lighting-demo',
      type: 'FACEBOOK' as const,
      name: 'HomeU Lighting FB',
      externalAccountId: 'homeu-lighting-demo',
      brandKey: 'homeu-lighting',
    },
    {
      id: 'instagram:homeu-furniture-demo',
      type: 'INSTAGRAM' as const,
      name: 'HomeU Furniture IG',
      externalAccountId: 'homeu-furniture-demo',
      externalPageId: 'homeu-furniture-demo-page',
      brandKey: 'homeu-furniture',
    },
    {
      id: 'instagram:homeu-lighting-demo',
      type: 'INSTAGRAM' as const,
      name: 'HomeU Lighting IG',
      externalAccountId: 'homeu-lighting-demo',
      externalPageId: 'homeu-lighting-demo-page',
      brandKey: 'homeu-lighting',
    },
  ];

  for (const channel of channels) {
    await prisma.inboxChannel.upsert({
      where: { id: channel.id },
      create: { ...channel, isActive: true },
      update: { ...channel, isActive: true },
    });
  }

  console.log(`Seeded ${channels.length} inbox channels`);
}

main().finally(async () => prisma.$disconnect());
