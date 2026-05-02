
export interface Team {
  id: string;
  name: string;
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
