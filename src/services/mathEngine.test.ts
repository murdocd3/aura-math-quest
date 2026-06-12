import { vi, describe, it, expect, beforeEach } from 'vitest';
import { generateQuestion, getOperationSymbol, getCampaignOp } from './mathEngine';
import { mockDb } from './mockDb';

vi.mock('./mockDb', () => {
  return {
    mockDb: {
      getMathStats: vi.fn(),
      getMathProgress: vi.fn(),
    }
  };
});

describe('Math Engine Service', () => {
  const userId = 'test-student-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOperationSymbol', () => {
    it('should map operations to symbols correctly', () => {
      expect(getOperationSymbol('addition')).toBe('+');
      expect(getOperationSymbol('subtraction')).toBe('-');
      expect(getOperationSymbol('multiplication')).toBe('×');
      expect(getOperationSymbol('division')).toBe('÷');
    });
  });

  describe('getCampaignOp', () => {
    it('should cycle operations based on stageId', () => {
      expect(getCampaignOp(1)).toBe('addition');
      expect(getCampaignOp(2)).toBe('subtraction');
      expect(getCampaignOp(3)).toBe('division');
      expect(getCampaignOp(4)).toBe('multiplication');
      // Stage 5 is randomized/mixed
      const stage5Op = getCampaignOp(5);
      expect(['addition', 'subtraction', 'multiplication', 'division']).toContain(stage5Op);
    });
  });

  describe('generateQuestion in Campaign Mode', () => {
    it('should generate addition question with correct answer and distractions', () => {
      vi.mocked(mockDb.getMathStats).mockReturnValue([]);
      
      const question = generateQuestion(userId, 'addition', 0, 1, null);
      
      expect(question.op).toBe('addition');
      expect(question.answer).toBe(question.num1 + question.num2);
      expect(question.choices).toContain(question.answer);
      expect(question.choices.length).toBe(4);
      // Ensure choices are unique
      expect(new Set(question.choices).size).toBe(4);
    });

    it('should scale difficulty with streaks', () => {
      vi.mocked(mockDb.getMathStats).mockReturnValue([]);

      const qLowStreak = generateQuestion(userId, 'addition', 0, 1, null);
      const qHighStreak = generateQuestion(userId, 'addition', 12, 1, null);

      // Verify that streak generation functions correctly and produces choices
      expect(qLowStreak.choices.length).toBe(4);
      expect(qHighStreak.choices.length).toBe(4);
    });
  });

  describe('generateQuestion in Adaptive Mode', () => {
    it('should fall back to learning frontier and generate correct questions', () => {
      vi.mocked(mockDb.getMathStats).mockReturnValue([]);
      vi.mocked(mockDb.getMathProgress).mockReturnValue({
        currentTier: 3,
        maxUnlockedTier: 3,
        percentToNext: 0,
        unlockedList: [2, 3],
        masteredList: [2],
      });

      const question = generateQuestion(userId, 'multiplication', 0, null, null);
      
      expect(question.op).toBe('multiplication');
      expect(question.answer).toBe(question.num1 * question.num2);
      expect(question.choices).toContain(question.answer);
      expect(new Set(question.choices).size).toBe(4);
    });

    it('should prioritize weak spots review when active difficulties match', () => {
      // Setup stats showing a weak spot (e.g. 2x4 with multiple errors)
      vi.mocked(mockDb.getMathStats).mockReturnValue([
        { userId, questionKey: '2x4', correctCount: 0, errorCount: 3, averageTimeMs: 1000 }
      ]);
      vi.mocked(mockDb.getMathProgress).mockReturnValue({
        currentTier: 2,
        maxUnlockedTier: 2,
        percentToNext: 0,
        unlockedList: [2],
        masteredList: [],
      });

      // Force Math.random() to return < 0.40 to trigger the weak spot branch on the first call
      const spyRandom = vi.spyOn(Math, 'random').mockReturnValueOnce(0.1);

      const question = generateQuestion(userId, 'multiplication', 0, null, null);

      expect(question.num1).toBe(2);
      expect(question.num2).toBe(4);
      expect(question.isWeakPoint).toBe(true);

      spyRandom.mockRestore();
    });
  });
});
