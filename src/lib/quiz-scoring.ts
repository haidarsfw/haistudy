/**
 * Quiz weighted scoring algorithm.
 * Adapted from old App.jsx lines 1358-1407.
 *
 * - 100 points max per subject (500 total for 5 subjects)
 * - Questions grouped by `category`
 * - Weight per category = 100 / number_of_categories
 * - Score per category = (correct / total_in_category) * weight
 */

import type { QuizQuestion } from "@/types";
import { MAX_POINTS_PER_SUBJECT } from "@/lib/constants";

export interface CategoryScore {
  category: string;
  correct: number;
  total: number;
  weight: number;
  score: number;
}

export interface QuizResult {
  categories: CategoryScore[];
  totalScore: number;
  maxScore: number;
  percentage: number;
}

export function calculateQuizScore(
  questions: QuizQuestion[],
  answers: Record<number, number> // questionId → selected option index
): QuizResult {
  // Group questions by category
  const groups: Record<string, { correct: number; total: number }> = {};

  for (const q of questions) {
    if (!groups[q.category]) {
      groups[q.category] = { correct: 0, total: 0 };
    }
    groups[q.category].total += 1;

    if (answers[q.id] === q.answer) {
      groups[q.category].correct += 1;
    }
  }

  const categoryCount = Object.keys(groups).length;
  if (categoryCount === 0) {
    return { categories: [], totalScore: 0, maxScore: MAX_POINTS_PER_SUBJECT, percentage: 0 };
  }

  const weight = MAX_POINTS_PER_SUBJECT / categoryCount;

  const categories: CategoryScore[] = Object.entries(groups).map(
    ([category, { correct, total }]) => ({
      category,
      correct,
      total,
      weight,
      score: total > 0 ? (correct / total) * weight : 0,
    })
  );

  const totalScore = categories.reduce((sum, c) => sum + c.score, 0);

  return {
    categories,
    totalScore: Math.round(totalScore * 100) / 100,
    maxScore: MAX_POINTS_PER_SUBJECT,
    percentage: Math.round((totalScore / MAX_POINTS_PER_SUBJECT) * 100),
  };
}
