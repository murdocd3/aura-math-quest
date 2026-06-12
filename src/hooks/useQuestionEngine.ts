import { useState, useCallback } from 'react';
import { generateQuestion as mathEngineGenerateQuestion } from '../services/mathEngine';
import type { Question, Operation } from '../services/mathEngine';

export const useQuestionEngine = (
  userId: string,
  selectedOperation: Operation,
  campaignStageId: number | null | undefined,
  bossOp: Operation | '' | null
) => {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);

  const getNewQuestion = useCallback((streak: number) => {
    const q = mathEngineGenerateQuestion(
      userId,
      selectedOperation,
      streak,
      campaignStageId,
      bossOp || null
    );
    setCurrentQuestion(q);
    return q;
  }, [userId, selectedOperation, campaignStageId, bossOp]);

  const checkAnswer = useCallback((submittedValue: number): boolean => {
    if (!currentQuestion) return false;
    const isCorrect = submittedValue === currentQuestion.answer;
    
    setQuestionsAnswered(prev => prev + 1);
    if (isCorrect) {
      setCurrentStreak(prev => {
        const next = prev + 1;
        if (next > maxStreak) setMaxStreak(next);
        return next;
      });
    } else {
      setCurrentStreak(0);
    }
    return isCorrect;
  }, [currentQuestion, maxStreak]);

  const resetStreak = useCallback(() => {
    setCurrentStreak(0);
  }, []);

  const resetAll = useCallback(() => {
    setCurrentQuestion(null);
    setCurrentStreak(0);
    setMaxStreak(0);
    setQuestionsAnswered(0);
  }, []);

  return {
    currentQuestion,
    setCurrentQuestion,
    currentStreak,
    setCurrentStreak,
    maxStreak,
    setMaxStreak,
    questionsAnswered,
    setQuestionsAnswered,
    getNewQuestion,
    checkAnswer,
    resetStreak,
    resetAll,
  };
};
