import { db } from './database';

export interface DailyGameQuestion {
  id: number;
  date: string;
  time_slot: string;
  game_type: 'emoji' | 'zoom';
  question: string;
  emojis?: string[];
  gift_name?: string;
  model_name?: string;
  backdrop_index?: number;
  reward: number;
  solved_by?: number;
  solvers_count: number;
}

export interface RandomGift {
  name: string;
  model: string;
  backdrop_index: number;
  correct_answer: string;
}

export class DailyGameService {
  private static currentRandomGift: RandomGift | null = null;
  private static currentGiftForUser: Map<number, RandomGift> = new Map();

  /**
   * Get a random gift for the zoom game
   */
  static async getRandomGift(): Promise<RandomGift | null> {
    try {
      console.log('🎲 Getting random gift data directly');
      
      // Load gift ID to name mapping
      const idToNameResponse = await fetch('https://cdn.changes.tg/gifts/id-to-name.json');
      if (!idToNameResponse.ok) {
        throw new Error(`Failed to fetch id-to-name data: ${idToNameResponse.status}`);
      }
      const idToNameData = await idToNameResponse.json();
      
      // Get unique gift names (these are the gift types)
      const giftNames = Object.values(idToNameData);
      const uniqueGifts = Array.from(new Set(giftNames)).sort();
      
      if (!uniqueGifts || uniqueGifts.length === 0) {
        console.error('❌ No gifts available');
        return null;
      }
      
    // Pick a random gift
    const randomGiftName = uniqueGifts[Math.floor(Math.random() * uniqueGifts.length)] as string;
      
      // Get models for this gift
      const modelsResponse = await fetch(`https://cdn.changes.tg/gifts/models/${encodeURIComponent(randomGiftName)}/sorted.json`);
      if (!modelsResponse.ok) {
        throw new Error(`Failed to fetch models for ${randomGiftName}: ${modelsResponse.status}`);
      }
      const modelsData = await modelsResponse.json();
      
      if (!modelsData || modelsData.length === 0) {
        console.error('❌ No models available for this gift');
        return null;
      }
      
      // Pick a random model
      const randomModel = modelsData[Math.floor(Math.random() * modelsData.length)].name;
      
      // Pick a random backdrop (1-80)
      const randomBackdrop = Math.floor(Math.random() * 80) + 1;
      
      const gift: RandomGift = {
        name: randomGiftName,
        model: randomModel,
        backdrop_index: randomBackdrop,
        correct_answer: randomGiftName
      };
      
      this.currentRandomGift = gift;
      console.log(`✅ Random gift selected: ${gift.name} with model: ${gift.model}`);
      return gift;
      
    } catch (error) {
      console.error('Error getting random gift:', error);
      return null;
    }
  }

  /**
   * Get today's daily game question - Returns random zoom game
   */
  static async getTodaysQuestion(userId?: number): Promise<DailyGameQuestion | null> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      console.log(`🎮 Getting random zoom game question for ${today}`);

      // Get a random gift
      const randomGift = await this.getRandomGift();
      
      if (!randomGift) {
        console.log('❌ No random gift available');
        return null;
      }

      // Store the gift for this user if userId is provided
      if (userId) {
        this.currentGiftForUser.set(userId, randomGift);
      }

      // Create a unique ID for this question session
      const questionId = Date.now();

      const question: DailyGameQuestion = {
        id: questionId,
        date: today,
        time_slot: 'random',
        game_type: 'zoom',
        question: 'What gift is this?',
        gift_name: randomGift.name,
        model_name: randomGift.model,
        backdrop_index: randomGift.backdrop_index,
        reward: 0.1,
        solvers_count: 0
      };

      console.log(`✅ Random question created: ${randomGift.name}`);
      
      return question;

    } catch (error) {
      console.error('Error getting daily question:', error);
      return null;
    }
  }

  /**
   * Submit answer for random zoom game
   */
  static async submitAnswer(
    userId: number,
    answer: string
  ): Promise<{
    success: boolean;
    correct: boolean;
    is_first_solver: boolean;
    reward?: number;
    correct_answer?: string;
    error?: string;
  }> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      console.log(`🎮 Submitting answer for ${userId}: ${answer} (Random zoom game)`);

      // Get the current gift for this user
      const currentGift = this.currentGiftForUser.get(userId);
      
      if (!currentGift) {
        return {
          success: false,
          correct: false,
          is_first_solver: false,
          error: 'No active game session. Please refresh and try again.'
        };
      }

      // Check if answer is correct
      const correctAnswer = currentGift.correct_answer.toLowerCase();
      const userAnswer = answer.toLowerCase().trim();
      const isCorrect = correctAnswer === userAnswer || 
                       correctAnswer.includes(userAnswer) || 
                       userAnswer.includes(correctAnswer);

      if (!isCorrect) {
        return {
          success: true,
          correct: false,
          is_first_solver: false,
          correct_answer: this.currentRandomGift?.correct_answer || ''
        };
      }

      // For random games, we don't track "first solver" since it's infinite
      // Just give a standard reward
      const reward = 0.1;

      // Add credits to user
      const user = await db.getUser(userId);
      if (user) {
        await db.updateUser(userId, {
          credits: user.credits + reward
        });
      }

      console.log(`✅ Answer submitted successfully. Correct: ${isCorrect}, Reward: ${reward}`);

      return {
        success: true,
        correct: true,
        is_first_solver: false, // Random games don't have first solver concept
        reward: reward
      };

    } catch (error) {
      console.error('Error submitting answer:', error);
      return {
        success: false,
        correct: false,
        is_first_solver: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Get a new random gift for the next game
   */
  static async getNextRandomGame(): Promise<DailyGameQuestion | null> {
    try {
      console.log('🎮 Getting next random game');
      
      // Clear current gift to force a new one
      this.currentRandomGift = null;
      
      // Get new random question
      return await this.getTodaysQuestion();
      
    } catch (error) {
      console.error('Error getting next random game:', error);
      return null;
    }
  }

  /**
   * Get user's daily game history (for stats)
   */
  static async getUserHistory(userId: number): Promise<{
    total_solves: number;
    first_solves: number;
    total_rewards: number;
  }> {
    try {
      // Since we're using random games, we'll return basic stats
      // In a real implementation, you might want to track random game solves separately
      return {
        total_solves: 0,
        first_solves: 0,
        total_rewards: 0
      };
    } catch (error) {
      console.error('Error getting user history:', error);
      return {
        total_solves: 0,
        first_solves: 0,
        total_rewards: 0
      };
    }
  }
}