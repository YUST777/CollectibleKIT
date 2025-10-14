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

// Use global module-level storage instead of class static to persist across hot reloads
const globalForSession = global as typeof globalThis & {
  gameSessionMap?: Map<number, RandomGift>;
  currentRandomGift?: RandomGift | null;
};

// Initialize if not already exists
if (!globalForSession.gameSessionMap) {
  globalForSession.gameSessionMap = new Map();
}
if (!globalForSession.currentRandomGift) {
  globalForSession.currentRandomGift = null;
}

export class DailyGameService {
  private static get currentRandomGift(): RandomGift | null {
    return globalForSession.currentRandomGift || null;
  }

  private static set currentRandomGift(value: RandomGift | null) {
    globalForSession.currentRandomGift = value;
  }

  private static get currentGiftForUser(): Map<number, RandomGift> {
    return globalForSession.gameSessionMap!;
  }

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
        correct_answer: randomModel // Changed to model name instead of gift name
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

      // Store the gift for this user (use userId or default key)
      const userKey = userId || 0; // Use 0 as default for anonymous users
      this.currentGiftForUser.set(userKey, randomGift);
      
      console.log(`📝 Stored game session for user ${userKey}: ${randomGift.name} - ${randomGift.model}`);
      console.log(`📝 Current session map size: ${this.currentGiftForUser.size}`);
      console.log(`📝 Session map keys:`, Array.from(this.currentGiftForUser.keys()));

      // Create a unique ID for this question session
      const questionId = Date.now();

      // Get total solves count
      const totalSolves = await db.getTotalGameSolves();

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
        solvers_count: totalSolves
      };

      console.log(`✅ Random question created: ${randomGift.name}`);
      console.log(`📊 Total solves count: ${totalSolves}`);
      
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

      // Use same userKey logic as getTodaysQuestion
      const userKey = userId || 0;
      
      console.log(`🔍 Looking for session with userKey: ${userKey}`);
      console.log(`🔍 Session map size: ${this.currentGiftForUser.size}`);
      console.log(`🔍 Available session keys:`, Array.from(this.currentGiftForUser.keys()));
      
      // Get the current gift for this user, fallback to global current gift
      let currentGift = this.currentGiftForUser.get(userKey);
      
      console.log(`🔍 Found session for userKey ${userKey}:`, currentGift ? `${currentGift.name} - ${currentGift.model}` : 'null');
      
      // If not found for this user, try the global current gift as fallback
      if (!currentGift && this.currentRandomGift) {
        console.log('⚠️ Using global current gift as fallback');
        currentGift = this.currentRandomGift;
        // Store it for this user for future reference
        this.currentGiftForUser.set(userKey, currentGift);
      }
      
      if (!currentGift) {
        console.error('❌ No active game session found for user', userKey);
        console.error('❌ Session map size:', this.currentGiftForUser.size);
        console.error('❌ Available sessions:', Array.from(this.currentGiftForUser.keys()));
        console.error('❌ Global current gift:', this.currentRandomGift);
        return {
          success: false,
          correct: false,
          is_first_solver: false,
          error: 'No active game session. Please refresh and try again.'
        };
      }

      console.log(`🎯 Checking answer against: ${currentGift.correct_answer}`);

      // Check if answer is correct
      const correctAnswer = currentGift.correct_answer.toLowerCase();
      const userAnswer = answer.toLowerCase().trim();
      const isCorrect = correctAnswer === userAnswer || 
                       correctAnswer.includes(userAnswer) || 
                       userAnswer.includes(correctAnswer);

      console.log(`Answer check: "${userAnswer}" vs "${correctAnswer}" = ${isCorrect}`);

      if (!isCorrect) {
        return {
          success: true,
          correct: false,
          is_first_solver: false,
          correct_answer: currentGift.correct_answer
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

      // Increment global solve counter
      await db.incrementTotalGameSolves();

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