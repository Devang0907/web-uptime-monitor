import { PrismaClient, WebsiteStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create a user
  const user = await prisma.user.create({
    data: {
      email: "admin@example.com",
      password: "hashedpassword123",
    },
  });

  // Create websites
  const website1 = await prisma.website.create({
    data: {
      url: "https://example.com",
      userId: user.id,
    },
  });

  const website2 = await prisma.website.create({
    data: {
      url: "https://devangrakholiya.me",
      userId: user.id,
      disabled: true,
    },
  });

  // Create validators
  const validator1 = await prisma.validator.create({
    data: {
      publicKey: "validator-public-key-1",
      location: "India",
      ip: "192.168.1.10",
    },
  });

  const validator2 = await prisma.validator.create({
    data: {
      publicKey: "validator-public-key-2",
      location: "US",
      ip: "192.168.1.11",
    },
  });

  // Create website ticks
  await prisma.websiteTick.createMany({
    data: [
      {
        websiteId: website1.id,
        validatorId: validator1.id,
        createdAt: new Date(),
        status: WebsiteStatus.Good,
        latency: 123.45,
      },
      {
        websiteId: website1.id,
        validatorId: validator2.id,
        createdAt: new Date(),
        status: WebsiteStatus.Bad,
        latency: 456.78,
      },
      {
        websiteId: website2.id,
        validatorId: validator1.id,
        createdAt: new Date(),
        status: WebsiteStatus.Good,
        latency: 78.9,
      },
    ],
  });

  console.log("✅ Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });