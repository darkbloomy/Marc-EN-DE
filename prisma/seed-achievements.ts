import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import "dotenv/config";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

interface AchievementSeed {
  key: string;
  nameDE: string;
  nameEN: string;
  descriptionDE: string;
  descriptionEN: string;
  iconId: string;
  category: string;
  threshold: number;
}

const achievements: AchievementSeed[] = [
  // Streak badges
  {
    key: "streak_3",
    nameDE: "3-Tage-Serie",
    nameEN: "3-Day Streak",
    descriptionDE: "Übe 3 Tage hintereinander",
    descriptionEN: "Practice 3 days in a row",
    iconId: "flame",
    category: "streak",
    threshold: 3,
  },
  {
    key: "streak_7",
    nameDE: "Wochenkrieger",
    nameEN: "Week Warrior",
    descriptionDE: "Übe 7 Tage hintereinander",
    descriptionEN: "Practice 7 days in a row",
    iconId: "flame",
    category: "streak",
    threshold: 7,
  },
  {
    key: "streak_14",
    nameDE: "Zwei-Wochen-Champion",
    nameEN: "Two-Week Champion",
    descriptionDE: "Übe 14 Tage hintereinander",
    descriptionEN: "Practice 14 days in a row",
    iconId: "flame",
    category: "streak",
    threshold: 14,
  },
  {
    key: "streak_30",
    nameDE: "Monatsheld",
    nameEN: "Monthly Hero",
    descriptionDE: "Übe 30 Tage hintereinander",
    descriptionEN: "Practice 30 days in a row",
    iconId: "flame",
    category: "streak",
    threshold: 30,
  },
  {
    key: "streak_100",
    nameDE: "Jahrhundertläufer",
    nameEN: "Century Runner",
    descriptionDE: "Übe 100 Tage hintereinander",
    descriptionEN: "Practice 100 days in a row",
    iconId: "flame",
    category: "streak",
    threshold: 100,
  },

  // Mastery badges
  {
    key: "grammar_star",
    nameDE: "Grammatik-Star",
    nameEN: "Grammar Star",
    descriptionDE: "Beantworte 50 Grammatikfragen richtig",
    descriptionEN: "Answer 50 grammar questions correctly",
    iconId: "star",
    category: "mastery",
    threshold: 50,
  },
  {
    key: "spelling_ace",
    nameDE: "Rechtschreib-Ass",
    nameEN: "Spelling Ace",
    descriptionDE: "Beantworte 50 Rechtschreibfragen richtig",
    descriptionEN: "Answer 50 spelling questions correctly",
    iconId: "pencil",
    category: "mastery",
    threshold: 50,
  },
  {
    key: "reading_pro",
    nameDE: "Lese-Profi",
    nameEN: "Reading Pro",
    descriptionDE: "Beantworte 50 Leseverständnisfragen richtig",
    descriptionEN: "Answer 50 reading comprehension questions correctly",
    iconId: "book-open",
    category: "mastery",
    threshold: 50,
  },
  {
    key: "writing_hero",
    nameDE: "Schreib-Held",
    nameEN: "Writing Hero",
    descriptionDE: "Beantworte 50 Schreibübungen richtig",
    descriptionEN: "Complete 50 writing exercises correctly",
    iconId: "pen-tool",
    category: "mastery",
    threshold: 50,
  },

  // Milestone badges
  {
    key: "first_session",
    nameDE: "Erster Schritt",
    nameEN: "First Step",
    descriptionDE: "Schließe deine erste Übungssitzung ab",
    descriptionEN: "Complete your first practice session",
    iconId: "rocket",
    category: "milestone",
    threshold: 1,
  },
  {
    key: "ten_sessions",
    nameDE: "Zehn geschafft!",
    nameEN: "Ten Down!",
    descriptionDE: "Schließe 10 Übungssitzungen ab",
    descriptionEN: "Complete 10 practice sessions",
    iconId: "trophy",
    category: "milestone",
    threshold: 10,
  },
  {
    key: "hundred_sessions",
    nameDE: "Hundert Sitzungen",
    nameEN: "Hundred Sessions",
    descriptionDE: "Schließe 100 Übungssitzungen ab",
    descriptionEN: "Complete 100 practice sessions",
    iconId: "medal",
    category: "milestone",
    threshold: 100,
  },
  {
    key: "perfect_5",
    nameDE: "Perfekte Fünf",
    nameEN: "Perfect Five",
    descriptionDE: "Beantworte 5 Übungen in Folge richtig",
    descriptionEN: "Answer 5 exercises in a row correctly",
    iconId: "check-circle",
    category: "milestone",
    threshold: 5,
  },
  {
    key: "both_languages",
    nameDE: "Zweisprachig",
    nameEN: "Bilingual",
    descriptionDE: "Übe sowohl Deutsch als auch Englisch",
    descriptionEN: "Practice both German and English",
    iconId: "languages",
    category: "milestone",
    threshold: 1,
  },
  {
    key: "level_5",
    nameDE: "Level 5",
    nameEN: "Level 5",
    descriptionDE: "Erreiche Level 5",
    descriptionEN: "Reach level 5",
    iconId: "award",
    category: "milestone",
    threshold: 5,
  },

  // Special badges
  {
    key: "early_bird",
    nameDE: "Frühaufsteher",
    nameEN: "Early Bird",
    descriptionDE: "Übe vor 8 Uhr morgens",
    descriptionEN: "Practice before 8 AM",
    iconId: "sunrise",
    category: "special",
    threshold: 1,
  },
  {
    key: "night_owl",
    nameDE: "Nachteule",
    nameEN: "Night Owl",
    descriptionDE: "Übe nach 20 Uhr",
    descriptionEN: "Practice after 8 PM",
    iconId: "moon",
    category: "special",
    threshold: 1,
  },
  {
    key: "weekend_warrior",
    nameDE: "Wochenendkämpfer",
    nameEN: "Weekend Warrior",
    descriptionDE: "Übe am Wochenende",
    descriptionEN: "Practice on a weekend",
    iconId: "calendar",
    category: "special",
    threshold: 1,
  },
];

async function seed() {
  console.log("Seeding achievements...");

  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { key: achievement.key },
      update: achievement,
      create: achievement,
    });
  }

  const count = await prisma.achievement.count();
  console.log(`Seeded ${count} achievements.`);
}

seed()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
