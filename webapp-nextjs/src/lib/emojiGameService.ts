import sqlite3 from 'sqlite3';
import path from 'path';

export interface EmojiQuestion {
  id: number;
  gift_name: string;
  model_name: string;
  emojis: string[];
  filename: string;
}

// Use global module-level storage to persist across hot reloads
const globalForEmojiGame = global as typeof globalThis & {
  emojiGameSessionMap?: Map<number, EmojiQuestion>;
};

// Initialize if not already exists
if (!globalForEmojiGame.emojiGameSessionMap) {
  globalForEmojiGame.emojiGameSessionMap = new Map();
}

class EmojiGameService {
  private db!: sqlite3.Database;
  private dbPath: string;
  private currentQuestionForUser: Map<number, EmojiQuestion>;

  constructor() {
    // Use the emoji database in the project root
    this.dbPath = path.join(process.cwd(), '..', 'emoji_database.db');
    console.log('🎮 Emoji game database path:', this.dbPath);
    
    // Use global storage to persist across hot reloads
    this.currentQuestionForUser = globalForEmojiGame.emojiGameSessionMap!;
    
    try {
      this.db = new sqlite3.Database(this.dbPath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
          console.error('❌ Emoji database connection error:', err);
        } else {
          console.log('✅ Emoji database connected successfully');
        }
      });
    } catch (error) {
      console.error('❌ Emoji database initialization error:', error);
    }
  }

  // Helper method for promisified database get
  private dbGet(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  // Helper method for promisified database all
  private dbAll(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * Get a random emoji question
   */
  async getRandomQuestion(userId?: number): Promise<EmojiQuestion | null> {
    try {
      console.log('🎲 Getting random emoji question');

      // Get total count first
      const countResult = await this.dbGet('SELECT COUNT(*) as count FROM gift_models');
      const totalCount = countResult.count;

      if (!totalCount || totalCount === 0) {
        console.error('❌ No gift models in emoji database');
        return null;
      }

      // Get a random offset
      const randomOffset = Math.floor(Math.random() * totalCount);

      // Get random gift model
      const giftModel = await this.dbGet(
        'SELECT * FROM gift_models LIMIT 1 OFFSET ?',
        [randomOffset]
      );

      if (!giftModel) {
        console.error('❌ Failed to get random gift model');
        return null;
      }

      const question: EmojiQuestion = {
        id: giftModel.id,
        gift_name: giftModel.gift_name,
        model_name: giftModel.model_name,
        emojis: [giftModel.emoji1, giftModel.emoji2, giftModel.emoji3, giftModel.emoji4],
        filename: giftModel.filename
      };

      // Store the question for this user (use userId or default key)
      const userKey = userId || 0;
      this.currentQuestionForUser.set(userKey, question);

      console.log(`✅ Random emoji question: ${question.gift_name} - ${question.model_name}`);
      console.log(`🎮 Emojis: ${question.emojis.join(' ')}`);
      console.log(`📝 Stored emoji session for user ${userKey}`);
      console.log(`📝 Current emoji session map size: ${this.currentQuestionForUser.size}`);

      return question;

    } catch (error) {
      console.error('❌ Error getting random emoji question:', error);
      return null;
    }
  }

  /**
   * Check if the user's answer is correct
   */
  async checkAnswer(
    userId: number,
    answer: string
  ): Promise<{ correct: boolean; correctAnswer: string }> {
    try {
      const userKey = userId || 0;
      
      console.log(`🔍 Checking emoji answer for user ${userKey}: "${answer}"`);
      console.log(`🔍 Emoji session map size: ${this.currentQuestionForUser.size}`);
      console.log(`🔍 Available emoji session keys:`, Array.from(this.currentQuestionForUser.keys()));

      // Get the current question for this user
      const currentQuestion = this.currentQuestionForUser.get(userKey);

      if (!currentQuestion) {
        console.error('❌ No active emoji game session found for user', userKey);
        return {
          correct: false,
          correctAnswer: 'No active game session'
        };
      }

      console.log(`🎯 Checking against: ${currentQuestion.model_name} (${currentQuestion.gift_name})`);

      // Check if answer matches the model name
      const correctAnswerLower = currentQuestion.model_name.toLowerCase();
      const userAnswer = answer.toLowerCase().trim();
      
      // More flexible matching: exact match, contains, or is contained
      const isCorrect = correctAnswerLower === userAnswer || 
                       correctAnswerLower.includes(userAnswer) || 
                       userAnswer.includes(correctAnswerLower);

      console.log(`Answer check: "${userAnswer}" vs "${correctAnswerLower}" = ${isCorrect}`);

      return {
        correct: isCorrect,
        correctAnswer: currentQuestion.model_name
      };

    } catch (error) {
      console.error('❌ Error checking emoji answer:', error);
      return {
        correct: false,
        correctAnswer: 'Error checking answer'
      };
    }
  }

  /**
   * Get emojis for a specific gift and model (for the game display)
   */
  async getEmojisForModel(giftName: string, modelName: string): Promise<string[] | null> {
    try {
      const giftModel = await this.dbGet(
        'SELECT emoji1, emoji2, emoji3, emoji4 FROM gift_models WHERE gift_name = ? AND model_name = ?',
        [giftName, modelName]
      );

      if (!giftModel) {
        console.error(`❌ No emojis found for ${giftName} - ${modelName}`);
        return null;
      }

      return [giftModel.emoji1, giftModel.emoji2, giftModel.emoji3, giftModel.emoji4];

    } catch (error) {
      console.error('❌ Error getting emojis for model:', error);
      return null;
    }
  }

  /**
   * Search for gift models by emoji
   */
  async searchByEmoji(emoji: string): Promise<EmojiQuestion[]> {
    try {
      const results = await this.dbAll(
        `SELECT * FROM gift_models 
         WHERE emoji1 = ? OR emoji2 = ? OR emoji3 = ? OR emoji4 = ?`,
        [emoji, emoji, emoji, emoji]
      );

      return results.map((row: any) => ({
        id: row.id,
        gift_name: row.gift_name,
        model_name: row.model_name,
        emojis: [row.emoji1, row.emoji2, row.emoji3, row.emoji4],
        filename: row.filename
      }));

    } catch (error) {
      console.error('❌ Error searching by emoji:', error);
      return [];
    }
  }

  /**
   * Get all gift models for a specific gift name
   */
  async getModelsForGift(giftName: string): Promise<EmojiQuestion[]> {
    try {
      const results = await this.dbAll(
        'SELECT * FROM gift_models WHERE gift_name = ?',
        [giftName]
      );

      return results.map((row: any) => ({
        id: row.id,
        gift_name: row.gift_name,
        model_name: row.model_name,
        emojis: [row.emoji1, row.emoji2, row.emoji3, row.emoji4],
        filename: row.filename
      }));

    } catch (error) {
      console.error('❌ Error getting models for gift:', error);
      return [];
    }
  }

  /**
   * Get all unique gift names
   */
  async getAllGifts(): Promise<string[]> {
    try {
      const results = await this.dbAll(
        'SELECT DISTINCT gift_name FROM gift_models ORDER BY gift_name'
      );

      return results.map((row: any) => row.gift_name);

    } catch (error) {
      console.error('❌ Error getting all gifts:', error);
      return [];
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    return new Promise((resolve) => {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing emoji database:', err);
        } else {
          console.log('✅ Emoji database connection closed');
        }
        resolve();
      });
    });
  }
}

// Export singleton instance
export const emojiGameService = new EmojiGameService();


