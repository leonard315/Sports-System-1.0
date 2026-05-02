
export const ALL_SPORTS = [
  "All Sports",
  "Basketball",
  "Football",
  "Volleyball",
  "Baseball",
  "Softball",
  "Soccer",
  "Tennis",
  "Badminton",
  "Table Tennis",
  "Swimming",
  "Athletics",
  "Boxing",
  "Martial Arts",
  "Cycling",
  "Chess",
  "Esports",
  "Other",
] as const;

export type SportType = typeof ALL_SPORTS[number];

export interface Team {
  id: string;
  name: string;
  sport: string;
  logoUrl?: string;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  scoreFor: number;
  scoreAgainst: number;
  createdAt: any;
}

export interface Match {
  id: string;
  teamAId: string;
  teamBId: string;
  scoreA: number;
  scoreB: number;
  date: string;
  createdAt: any;
}

export interface StandingEntry extends Team {
  gp: number;
  scoreDiff: number;
}

// ─── Judged Events ────────────────────────────────────────────────────────────

export interface JudgedEvent {
  id: string;
  name: string;
  category: string;   // e.g. "Cheerdance", "Pageant", "Dance"
  date: string;
  judges: string[];   // e.g. ["Judge 1", "Judge 2", "Maria Santos"]
  status: "upcoming" | "ongoing" | "completed";
  createdAt: any;
}

export interface EventParticipant {
  id: string;
  eventId: string;
  name: string;       // team or individual name
  scores: Record<string, number>; // judgeIndex (as string) → score
  totalScore: number;
  rank?: number;
  createdAt: any;
}

export const EVENT_CATEGORIES = [
  "Cheerdance",
  "Pageant",
  "Dance",
  "Singing",
  "Performing Arts",
  "Academic",
  "Other",
] as const;
