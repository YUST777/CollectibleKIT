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
    this.dbPath = '/root/01studio/CollectibleKIT/emoji_database.db';
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
      const countResult = await this.dbGet('SELECT COUNT(*) as count FROM emoji_questions');
      const totalCount = countResult.count;

      if (!totalCount || totalCount === 0) {
        console.error('❌ No emoji questions in database');
        return null;
      }

      // Get a random offset
      const randomOffset = Math.floor(Math.random() * totalCount);

      // Get random gift model
      const giftModel = await this.dbGet(
        'SELECT * FROM emoji_questions LIMIT 1 OFFSET ?',
        [randomOffset]
      );

      if (!giftModel) {
        console.error('❌ Failed to get random gift model');
        return null;
      }

      // Parse emoji string into array
      const emojiString = giftModel.emoji || '';
      const emojis = emojiString.split(' ').filter((e: string) => e.trim());

      // Extract model name from image_url if not present
      let modelName = giftModel.model_name || '';
      if (!modelName && giftModel.image_url) {
        // Try to extract from image_url
        const urlParts = giftModel.image_url.split('/');
        const filename = urlParts[urlParts.length - 1];
        modelName = filename.replace('.png', '').replace(/_/g, ' ');
      }

      const question: EmojiQuestion = {
        id: giftModel.id,
        gift_name: giftModel.gift_name || '',
        model_name: modelName || '',
        emojis: emojis.length > 0 ? emojis : ['❓', '❓', '❓', '❓'],
        filename: giftModel.filename || giftModel.image_url || ''
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
        'SELECT emoji FROM emoji_questions WHERE gift_name = ? LIMIT 1',
        [giftName]
      );

      if (!giftModel || !giftModel.emoji) {
        console.error(`❌ No emojis found for ${giftName}`);
        return null;
      }

      const emojiString = giftModel.emoji;
      return emojiString.split(' ').filter((e: string) => e.trim());

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
        `SELECT * FROM emoji_questions WHERE emoji LIKE ?`,
        [`%${emoji}%`]
      );

      return results.map((row: any) => {
        const emojiString = row.emoji || '';
        const emojis = emojiString.split(' ').filter((e: string) => e.trim());
        return {
          id: row.id,
          gift_name: row.gift_name || '',
          model_name: '',
          emojis: emojis.length > 0 ? emojis : ['❓'],
          filename: row.filename || row.image_url || ''
        };
      });

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
        'SELECT * FROM emoji_questions WHERE gift_name = ?',
        [giftName]
      );

      return results.map((row: any) => {
        const emojiString = row.emoji || '';
        const emojis = emojiString.split(' ').filter((e: string) => e.trim());
        return {
          id: row.id,
          gift_name: row.gift_name || '',
          model_name: '',
          emojis: emojis.length > 0 ? emojis : ['❓'],
          filename: row.filename || row.image_url || ''
        };
      });

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
        'SELECT DISTINCT gift_name FROM emoji_questions ORDER BY gift_name'
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


