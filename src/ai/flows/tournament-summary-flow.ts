
'use server';
/**
 * @fileOverview AI flow to generate an official tournament summary for the Elite Champions Cup.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TournamentSummaryInputSchema = z.object({
  standings: z.array(z.object({
    name: z.string(),
    points: z.number(),
    wins: z.number(),
    losses: z.number(),
    draws: z.number(),
    rank: z.number(),
  })).describe('The current tournament standings data.'),
});
export type TournamentSummaryInput = z.infer<typeof TournamentSummaryInputSchema>;

const TournamentSummaryOutputSchema = z.object({
  summary: z.string().describe('A professional, broadcast-style summary of the tournament standings.'),
  topPerformerNote: z.string().describe('A special highlight for the rank 1 team.'),
});
export type TournamentSummaryOutput = z.infer<typeof TournamentSummaryOutputSchema>;

const summaryPrompt = ai.definePrompt({
  name: 'tournamentSummaryPrompt',
  input: { schema: TournamentSummaryInputSchema },
  output: { schema: TournamentSummaryOutputSchema },
  prompt: `You are the lead sports analyst for the "Elite Champions Cup" on ArenaLeader. 
  
Review the following championship standings and provide a compelling, high-stakes professional summary of the current battle for the trophy.
Highlight the leaders, the intensity of the title race, and provide a special "Elite Performer" note for the team currently holding Rank 1.

Standings:
{{#each standings}}
Rank {{rank}}: {{name}} - {{points}}pts (W:{{wins}} L:{{losses}} D:{{draws}})
{{/each}}

Format your response as a certified official championship report summary.`,
});

export async function generateTournamentSummary(input: TournamentSummaryInput): Promise<TournamentSummaryOutput> {
  const { output } = await summaryPrompt(input);
  if (!output) throw new Error("Failed to generate summary");
  return output;
}
