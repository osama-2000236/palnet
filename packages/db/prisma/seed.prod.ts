import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const expectedToken = process.env.SEED_PROD_TOKEN;
const providedToken = process.env.SEED_PROD_CONFIRM;

if (!expectedToken || providedToken !== expectedToken) {
  throw new Error("Refusing to run prod seed without matching SEED_PROD_CONFIRM.");
}

const industries = [
  "Technology",
  "Healthcare",
  "Education",
  "Finance",
  "Construction",
  "Retail",
  "Manufacturing",
  "Media",
  "Agriculture",
  "Hospitality",
];

const cities = [
  "Ramallah",
  "Al-Bireh",
  "Jerusalem",
  "Hebron",
  "Bethlehem",
  "Nablus",
  "Jenin",
  "Tulkarm",
  "Qalqilya",
  "Salfit",
  "Jericho",
  "Tubas",
  "Gaza City",
  "Khan Yunis",
  "Rafah",
  "Deir al-Balah",
  "Beit Lahia",
  "Beit Hanoun",
];

const companies = [
  "Baydar",
  "Rawabi Tech Hub",
  "Jerusalem Health Network",
  "Nablus Learning Labs",
  "Hebron Builders",
  "Bethlehem Creative Studio",
  "Gaza Logistics",
  "Ramallah Finance Group",
  "Jenin AgriWorks",
  "Tulkarm Manufacturing",
  "Qalqilya Retail Co",
  "Jericho Hospitality",
  "Al-Bireh Media House",
  "Salfit Solar",
  "Tubas Water Systems",
  "Khan Yunis Clinics",
  "Rafah Food Market",
  "Deir al-Balah Design",
  "Beit Lahia Farms",
  "Beit Hanoun Transport",
  "Palestine Cloud",
  "Canaan Consulting",
  "Olive Branch Analytics",
  "Levant Talent",
  "Atlas Engineering",
  "Minaret Software",
  "Falastin AI",
  "Quds Legal Partners",
  "Samaria Labs",
  "Coastal Commerce",
];

async function main(): Promise<void> {
  for (const name of industries) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    await prisma.skill.upsert({
      where: { slug },
      update: {},
      create: { name, slug },
    });
  }

  for (let i = 0; i < companies.length; i += 1) {
    const name = companies[i]!;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    await prisma.company.upsert({
      where: { slug },
      update: {
        name,
        industry: industries[i % industries.length],
        city: cities[i % cities.length],
        country: "PS",
      },
      create: {
        slug,
        name,
        tagline: "Palestinian professional organization",
        about: `${name} is part of Baydar's launch company directory.`,
        industry: industries[i % industries.length],
        city: cities[i % cities.length],
        country: "PS",
        sizeBucket: "11-50",
      },
    });
  }

  // eslint-disable-next-line no-console
  console.warn(`[seed.prod] upserted ${companies.length} companies and ${industries.length} tags`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
