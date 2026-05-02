
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
