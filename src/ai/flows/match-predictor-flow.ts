'use server';
/**
 * @fileOverview AI flow to predict a match outcome between two teams based on stats.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MatchPredictorInputSchema = z.object({
  teamA: z.object({
    name: z.string(),
    points: z.number(),
    wins: z.number(),
    losses: z.number(),
    scoreFor: z.number(),
    scoreAgainst: z.number(),
  }),
  teamB: z.object({
    name: z.string(),
    points: z.number(),
    wins: z.number(),
    losses: z.number(),
    scoreFor: z.number(),
    scoreAgainst: z.number(),
  }),
});
export type MatchPredictorInput = z.infer<typeof MatchPredictorInputSchema>;

const MatchPredictorOutputSchema = z.object({
  prediction: z.string().describe('A detailed prediction of the match outcome.'),
  predictedWinner: z.string().describe('The name of the team likely to win, or "Draw".'),
  confidenceScore: z.number().min(0).max(100).describe('Percentage confidence in the prediction.'),
});
export type MatchPredictorOutput = z.infer<typeof MatchPredictorOutputSchema>;

const predictorPrompt = ai.definePrompt({
  name: 'matchPredictorPrompt',
  input: { schema: MatchPredictorInputSchema },
  output: { schema: MatchPredictorOutputSchema },
  prompt: `You are an advanced sports analytics engine for ArenaLeader.
  
Analyze the following two teams and predict their next matchup. 
Consider their win/loss ratios, scoring capability (scoreFor), and defensive strength (scoreAgainst).

Team A: {{{teamA.name}}} - {{{teamA.points}}}pts (W:{{{teamA.wins}}} L:{{{teamA.losses}}}) Goals: +{{{teamA.scoreFor}}}/-{{{teamA.scoreAgainst}}}
Team B: {{{teamB.name}}} - {{{teamB.points}}}pts (W:{{{teamB.wins}}} L:{{{teamB.losses}}}) Goals: +{{{teamB.scoreFor}}}/-{{{teamB.scoreAgainst}}}

Provide a professional analyst's prediction, identify the most likely winner, and assign a confidence percentage.`,
});

export async function predictMatchOutcome(input: MatchPredictorInput): Promise<MatchPredictorOutput> {
  const { output } = await predictorPrompt(input);
  if (!output) throw new Error("Prediction failed");
  return output;
}
