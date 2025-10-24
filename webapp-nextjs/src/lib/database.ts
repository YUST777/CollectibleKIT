import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';

// Database interface
export interface User {
  user_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  free_uses: number;
  credits: number;
  created_at: number;
  last_activity: number;
  user_type?: 'vip' | 'premium' | 'normal' | 'test';
  watermark?: boolean;
  can_process?: boolean;
  credits_remaining?: number;
  free_remaining?: string;
}

export interface Payment {
  id: number;
  user_id: number;
  memo: string;
  amount_nano: number;
  credits_to_grant: number;
  status: 'pending' | 'completed' | 'failed';
  created_at: number;
  completed_at?: number;
  transaction_hash?: string;
}

export interface Request {
  id: number;
  user_id: number;
  request_type: string;
  image_size: string;
  pieces_count: number;
  watermarked: boolean;
  credits_used: number;
  created_at: number;
  processing_time?: number;
}

export interface DailyGameSolve {
  id: number;
  user_id: number;
  date: string;
  time_slot: string;
  answer: string;
  is_first_solver: boolean;
  solved_at: number;
}

export interface Task {
  id: number;
  task_id: string;
  title: string;
  description: string;
  category: string;
  credits_reward: number;
  is_daily: boolean;
  is_active: boolean;
  created_at: number;
}

export interface TaskCompletion {
  id: number;
  user_id: number;
  task_id: string;
  completed_at: number;
  credits_earned: number;
}

export interface UserTaskProgress {
  id: number;
  user_id: number;
  task_id: string;
  progress_data: string;
  last_updated: number;
}

export interface GameStats {
  id: number;
  stat_key: string;
  stat_value: number;
  updated_at: number;
}

export interface DailyGameReward {
  id: number;
  user_id: number;
  date: string;
  time_slot: string;
  amount: number;
  tx_hash?: string;
  paid_at: number;
}

export interface Sale {
  id: number;
  user_id: number;
  payment_id: number;
  amount_ton: number;
  credits_purchased: number;
  completed_at: number;
}

class DatabaseService {
  private db!: sqlite3.Database;
  private dbPath: string;

  constructor() {
    // Use the same database as the bot
    this.dbPath = path.join(process.cwd(), '..', 'bot', 'bot_data.db');
    console.log('Database path:', this.dbPath);
    
    try {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('❌ Database connection error:', err);
        } else {
          console.log('✅ Database connected successfully');
        }
      });
      this.initDatabase();
    } catch (error) {
      console.error('❌ Database initialization error:', error);
    }
  }

  // Helper methods for promisified database operations
  private dbRun(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }

  private dbGet(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  private dbAll(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  private async initDatabase(): Promise<void> {    
    try {
      // Users table
      await this.dbRun(`
        CREATE TABLE IF NOT EXISTS users (
          user_id INTEGER PRIMARY KEY,
          username TEXT,
          first_name TEXT,
          free_uses INTEGER DEFAULT 0,
          credits INTEGER DEFAULT 0,
          created_at REAL DEFAULT 0,
          last_activity REAL DEFAULT 0,
          user_type TEXT DEFAULT 'normal',
          watermark BOOLEAN DEFAULT 0
        )
      `);

      // Payments table
      await this.dbRun(`
        CREATE TABLE IF NOT EXISTS payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          memo TEXT UNIQUE,
          amount_nano INTEGER,
          credits_to_grant INTEGER,
          status TEXT DEFAULT 'pending',
          created_at REAL,
          completed_at REAL DEFAULT NULL,
          transaction_hash TEXT DEFAULT NULL,
          FOREIGN KEY (user_id) REFERENCES users (user_id)
        )
      `);

      // Requests table
      await this.dbRun(`
        CREATE TABLE IF NOT EXISTS requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          request_type TEXT,
          image_size TEXT,
          pieces_count INTEGER,
          watermarked BOOLEAN,
          credits_used INTEGER DEFAULT 0,
          created_at REAL,
          processing_time REAL DEFAULT NULL,
          FOREIGN KEY (user_id) REFERENCES users (user_id)
        )
      `);

      // Saved collections table
      await this.dbRun(`
        CREATE TABLE IF NOT EXISTS saved_collections (
          id TEXT PRIMARY KEY,
          user_id INTEGER,
          name TEXT NOT NULL,
          designs TEXT NOT NULL,
          created_at TEXT NOT NULL,
          is_public BOOLEAN DEFAULT 0,
          likes_count INTEGER DEFAULT 0,
          FOREIGN KEY (user_id) REFERENCES users (user_id)
        )
      `);

      // Collection likes table
      await this.dbRun(`
        CREATE TABLE IF NOT EXISTS collection_likes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          collection_id TEXT NOT NULL,
          user_id INTEGER NOT NULL,
          created_at REAL NOT NULL,
          FOREIGN KEY (collection_id) REFERENCES saved_collections (id),
          FOREIGN KEY (user_id) REFERENCES users (user_id),
          UNIQUE(collection_id, user_id)
        )
      `);

      // Daily game tables
      await this.dbRun(`
        CREATE TABLE IF NOT EXISTS daily_game_solves (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          date TEXT,
          time_slot TEXT,
          answer TEXT,
          is_first_solver BOOLEAN DEFAULT 0,
          solved_at REAL DEFAULT 0,
          FOREIGN KEY (user_id) REFERENCES users (user_id)
        )
      `);

      await this.dbRun(`
        CREATE TABLE IF NOT EXISTS daily_game_rewards (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          date TEXT,
          time_slot TEXT,
          amount REAL,
          tx_hash TEXT,
          paid_at REAL DEFAULT 0,
          FOREIGN KEY (user_id) REFERENCES users (user_id)
        )
      `);

      // Sales table
      await this.dbRun(`
        CREATE TABLE IF NOT EXISTS sales (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          payment_id INTEGER,
          amount_ton REAL,
          credits_purchased INTEGER,
          completed_at REAL,
          FOREIGN KEY (user_id) REFERENCES users (user_id),
          FOREIGN KEY (payment_id) REFERENCES payments (id)
        )
      `);

      // Referrals table
      await this.dbRun(`
        CREATE TABLE IF NOT EXISTS referrals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          referrer_id INTEGER NOT NULL,
          invited_id INTEGER NOT NULL,
          invited_name TEXT DEFAULT '',
          invited_photo TEXT DEFAULT '',
          created_at REAL NOT NULL,
          FOREIGN KEY (referrer_id) REFERENCES users (user_id),
          FOREIGN KEY (invited_id) REFERENCES users (user_id),
          UNIQUE(referrer_id, invited_id)
        )
      `);

      // Tasks table
      await this.dbRun(`
        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id TEXT UNIQUE NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          category TEXT NOT NULL,
          credits_reward INTEGER NOT NULL,
          is_daily BOOLEAN DEFAULT 0,
          is_active BOOLEAN DEFAULT 1,
          created_at REAL NOT NULL
        )
      `);

      // Task completions table
      await this.dbRun(`
        CREATE TABLE IF NOT EXISTS task_completions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          task_id TEXT NOT NULL,
          completed_at REAL NOT NULL,
          credits_earned INTEGER NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users (user_id),
          FOREIGN KEY (task_id) REFERENCES tasks (task_id),
          UNIQUE(user_id, task_id, DATE(completed_at, 'unixepoch'))
        )
      `);

      // User task progress table
      await this.dbRun(`
        CREATE TABLE IF NOT EXISTS user_task_progress (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          task_id TEXT NOT NULL,
          progress_data TEXT DEFAULT '{}',
          last_updated REAL NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users (user_id),
          FOREIGN KEY (task_id) REFERENCES tasks (task_id),
          UNIQUE(user_id, task_id)
        )
      `);

      // Game stats table for global counters
      await this.dbRun(`
        CREATE TABLE IF NOT EXISTS game_stats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          stat_key TEXT UNIQUE NOT NULL,
          stat_value INTEGER NOT NULL DEFAULT 0,
          updated_at REAL NOT NULL
        )
      `);

      // Initialize total_solves counter if not exists
      await this.dbRun(`
        INSERT OR IGNORE INTO game_stats (stat_key, stat_value, updated_at)
        VALUES ('total_solves', 0, ${Date.now()})
      `);

      console.log('✅ Database initialized successfully');
      
      // Initialize default tasks
      await this.initializeTasks();
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
    }
  }

  // User methods
  async getUser(userId: number): Promise<User | null> {    try {
      const user = await this.dbGet(`SELECT * FROM users WHERE user_id = ?`, [userId]) as User | undefined;
      return user || null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  async createUser(userId: number, username?: string, firstName?: string): Promise<boolean> {    
    try {
      // Check if user already exists
      const existingUser = await this.dbGet(`SELECT * FROM users WHERE user_id = ?`, [userId]);
      
      if (existingUser) {
        // User exists, just update basic info and last_activity
        await this.dbRun(
          `UPDATE users SET username = ?, first_name = ?, last_activity = ? WHERE user_id = ?`,
          [username, firstName, Date.now(), userId]
        );
        console.log('✅ Updated existing user:', { userId, user_type: (existingUser as any).user_type, credits: (existingUser as any).credits });
      } else {
        // New user, create with default values
        await this.dbRun(
          `INSERT INTO users (user_id, username, first_name, created_at, last_activity, user_type, credits) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [userId, username, firstName, Date.now(), Date.now(), 'normal', 0]
        );
        console.log('✅ Created new user:', { userId, user_type: 'normal', credits: 0 });
      }
      return true;
    } catch (error) {
      console.error('Error creating user:', error);
      return false;
    }
  }

  async updateUser(userId: number, updates: Partial<User>): Promise<boolean> {    try {
      const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updates);
      values.push(Date.now());
      values.push(userId);

      await this.dbRun(
        `UPDATE users SET ${setClause}, last_activity = ? WHERE user_id = ?`,
        values
      );
      return true;
    } catch (error) {
      console.error('Error updating user:', error);
      return false;
    }
  }

  async updateUserCredits(userId: number, creditChange: number): Promise<User | null> {    
    try {
      // Update credits
      await this.dbRun(`UPDATE users SET credits = credits + ?, last_activity = ? WHERE user_id = ?`, [creditChange, Date.now(), userId]);
      
      // Get updated user data
      const user = await this.dbGet(`SELECT * FROM users WHERE user_id = ?`, [userId]) as User | undefined;
      return user || null;
    } catch (error) {
      console.error('Error updating user credits:', error);
      return null;
    }
  }

  // Saved collections methods
  async saveCollection(collectionId: string, userId: number, name: string, designs: any[], createdAt: string, isPublic: boolean = false): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        const designsJson = JSON.stringify(designs);
        this.db.run(
          'INSERT OR REPLACE INTO saved_collections (id, user_id, name, designs, created_at, is_public) VALUES (?, ?, ?, ?, ?, ?)',
          [collectionId, userId, name, designsJson, createdAt, isPublic ? 1 : 0],
          (err) => {
            if (err) {
              console.error('Error saving collection:', err);
              resolve(false);
            } else {
              console.log(`💾 Saved collection "${name}" to database (public: ${isPublic})`);
              resolve(true);
            }
          }
        );
      } catch (error) {
        console.error('Error saving collection:', error);
        resolve(false);
      }
    });
  }

  async getUserCollections(userId: number): Promise<any[]> {
    return new Promise((resolve) => {
      this.db.all(
        'SELECT * FROM saved_collections WHERE user_id = ? ORDER BY created_at DESC',
        [userId],
        (err, rows) => {
          if (err) {
            console.error('Error loading user collections:', err);
            resolve([]);
          } else {
            const collections = rows.map((row: any) => ({
              id: row.id,
              name: row.name,
              designs: JSON.parse(row.designs),
              createdAt: row.created_at,
              userId: row.user_id,
              isPublic: Boolean(row.is_public),
              likesCount: row.likes_count || 0
            }));
            console.log(`📂 Loaded ${collections.length} collections for user ${userId}`);
            resolve(collections);
          }
        }
      );
    });
  }

  async deleteCollection(collectionId: string, userId: number): Promise<boolean> {
    return new Promise((resolve) => {
      this.db.run(
        'DELETE FROM saved_collections WHERE id = ? AND user_id = ?',
        [collectionId, userId],
        (err) => {
          if (err) {
            console.error('Error deleting collection:', err);
            resolve(false);
          } else {
            console.log(`🗑️ Deleted collection ${collectionId} for user ${userId}`);
            resolve(true);
          }
        }
      );
    });
  }

  // Public collections methods
  async getPublicCollections(limit: number = 50, offset: number = 0): Promise<any[]> {
    try {
      const rows = await this.dbAll(`
        SELECT sc.*, u.first_name, u.username 
        FROM saved_collections sc
        JOIN users u ON sc.user_id = u.user_id
        WHERE sc.is_public = 1 
        ORDER BY sc.likes_count DESC, sc.created_at DESC 
        LIMIT ? OFFSET ?
      `, [limit, offset]);
      
      const collections = rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        designs: JSON.parse(row.designs),
        createdAt: row.created_at,
        userId: row.user_id,
        authorName: row.first_name,
        authorUsername: row.username,
        isPublic: true,
        likesCount: row.likes_count || 0
      }));
      
      console.log(`📂 Loaded ${collections.length} public collections`);
      return collections;
    } catch (error) {
      console.error('Error loading public collections:', error);
      return [];
    }
  }

  // Like system methods
  async toggleLike(collectionId: string, userId: number): Promise<{ liked: boolean; likesCount: number }> {
    try {
      // Check if user already liked this collection
      const existingLike = await this.dbGet(
        'SELECT id FROM collection_likes WHERE collection_id = ? AND user_id = ?',
        [collectionId, userId]
      );
      
      if (existingLike) {
        // Unlike: remove the like
        await this.dbRun('DELETE FROM collection_likes WHERE collection_id = ? AND user_id = ?', [collectionId, userId]);
        
        // Decrease likes count
        await this.dbRun('UPDATE saved_collections SET likes_count = likes_count - 1 WHERE id = ?', [collectionId]);
        
        // Get new likes count
        const result = await this.dbGet('SELECT likes_count FROM saved_collections WHERE id = ?', [collectionId]);
        
        console.log(`👎 Unliked collection ${collectionId}`);
        return { liked: false, likesCount: result?.likes_count || 0 };
      } else {
        // Like: add the like
        await this.dbRun(
          'INSERT INTO collection_likes (collection_id, user_id, created_at) VALUES (?, ?, ?)',
          [collectionId, userId, Date.now()]
        );
        
        // Increase likes count
        await this.dbRun('UPDATE saved_collections SET likes_count = likes_count + 1 WHERE id = ?', [collectionId]);
        
        // Get new likes count
        const result = await this.dbGet('SELECT likes_count FROM saved_collections WHERE id = ?', [collectionId]);
        
        console.log(`👍 Liked collection ${collectionId}`);
        return { liked: true, likesCount: result?.likes_count || 0 };
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      return { liked: false, likesCount: 0 };
    }
  }

  async getUserLikes(userId: number): Promise<string[]> {
    try {
      const rows = await this.dbAll('SELECT collection_id FROM collection_likes WHERE user_id = ?', [userId]);
      const likedCollectionIds = rows.map((row: any) => row.collection_id);
      console.log(`❤️ User ${userId} has liked ${likedCollectionIds.length} collections`);
      return likedCollectionIds;
    } catch (error) {
      console.error('Error loading user likes:', error);
      return [];
    }
  }

  async decrementFreeUses(userId: number): Promise<boolean> {
    try {
      const result = await this.dbRun(
        'UPDATE users SET free_uses = free_uses - 1, last_activity = ? WHERE user_id = ? AND free_uses > 0',
        [Date.now(), userId]
      );
      return (result as any).changes > 0;
    } catch (error) {
      console.error('Error decrementing free uses:', error);
      return false;
    }
  }

  async decrementCredits(userId: number, amount: number): Promise<boolean> {
    try {
      const result = await this.dbRun(
        'UPDATE users SET credits = credits - ?, last_activity = ? WHERE user_id = ? AND credits >= ?',
        [amount, Date.now(), userId, amount]
      );
      return (result as any).changes > 0;
    } catch (error) {
      console.error('Error decrementing credits:', error);
      return false;
    }
  }

  // Request methods
  async createRequest(
    userId: number,
    requestType: string,
    imageSize: string,
    piecesCount: number,
    watermarked: boolean,
    creditsUsed: number = 0
  ): Promise<number | null> {
    try {
      const result = await this.dbRun(
        'INSERT INTO requests (user_id, request_type, image_size, pieces_count, watermarked, credits_used, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, requestType, imageSize, piecesCount, watermarked, creditsUsed, Date.now()]
      );
      console.log('Database result:', result);
      return (result as any)?.lastID || (result as any)?.changes || 1;
    } catch (error) {
      console.error('Error creating request:', error);
      return null;
    }
  }

  async updateRequestProcessingTime(requestId: number, processingTime: number): Promise<boolean> {
    try {
      await this.dbRun(
        'UPDATE requests SET processing_time = ? WHERE id = ?',
        [processingTime, requestId]
      );
      return true;
    } catch (error) {
      console.error('Error updating request processing time:', error);
      return false;
    }
  }

  // Payment methods
  async createPayment(
    userId: number,
    memo: string,
    amountNano: number,
    creditsToGrant: number
  ): Promise<number | null> {    try {
      const result = await this.dbRun(
        'INSERT INTO payments (user_id, memo, amount_nano, credits_to_grant, created_at) VALUES (?, ?, ?, ?, ?)',
        [userId, memo, amountNano, creditsToGrant, Date.now()]
      );
      return (result as any)?.lastID || (result as any)?.changes || 1;
    } catch (error) {
      console.error('Error creating payment:', error);
      return null;
    }
  }

  async updatePaymentStatus(
    paymentId: number,
    status: 'completed' | 'failed',
    transactionHash?: string
  ): Promise<boolean> {    try {
      await this.dbRun(
        'UPDATE payments SET status = ?, completed_at = ?, transaction_hash = ? WHERE id = ?',
        [status, Date.now(), transactionHash, paymentId]
      );
      return true;
    } catch (error) {
      console.error('Error updating payment status:', error);
      return false;
    }
  }

  // Daily game methods
  async createDailyGameSolve(
    userId: number,
    date: string,
    timeSlot: string,
    answer: string,
    isFirstSolver: boolean = false
  ): Promise<boolean> {    try {
      await this.dbRun(
        'INSERT INTO daily_game_solves (user_id, date, time_slot, answer, is_first_solver, solved_at) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, date, timeSlot, answer, isFirstSolver, Date.now()]
      );
      return true;
    } catch (error) {
      console.error('Error creating daily game solve:', error);
      return false;
    }
  }

  async hasUserSolvedToday(userId: number, date: string, timeSlot: string): Promise<boolean> {    try {
      const result = await this.dbGet(
        'SELECT id FROM daily_game_solves WHERE user_id = ? AND date = ? AND time_slot = ?',
        [userId, date, timeSlot]
      );
      return !!result;
    } catch (error) {
      console.error('Error checking daily game solve:', error);
      return false;
    }
  }

  async getTodaySolversCount(date: string, timeSlot: string): Promise<number> {    try {
      const result = await this.dbGet(
        'SELECT COUNT(*) as count FROM daily_game_solves WHERE date = ? AND time_slot = ?',
        [date, timeSlot]
      );
      return (result as any).count || 0;
    } catch (error) {
      console.error('Error getting solvers count:', error);
      return 0;
    }
  }

  // Sales methods
  async createSale(
    userId: number,
    paymentId: number,
    amountTon: number,
    creditsPurchased: number
  ): Promise<boolean> {    try {
      await this.dbRun(
        'INSERT INTO sales (user_id, payment_id, amount_ton, credits_purchased, completed_at) VALUES (?, ?, ?, ?, ?)',
        [userId, paymentId, amountTon, creditsPurchased, Date.now()]
      );
      return true;
    } catch (error) {
      console.error('Error creating sale:', error);
      return false;
    }
  }

  // Additional methods
  async getAllUserSolves(userId: number): Promise<DailyGameSolve[]> {    try {
      const solves = await this.dbAll(
        'SELECT * FROM daily_game_solves WHERE user_id = ? ORDER BY solved_at DESC',
        [userId]
      ) as DailyGameSolve[];
      return solves;
    } catch (error) {
      console.error('Error getting user solves:', error);
      return [];
    }
  }

  // Referral system methods
  async addReferral(referrerId: number, invitedId: number, invitedName: string, invitedPhoto: string): Promise<boolean> {    
    try {
      await this.dbRun(
        'INSERT OR IGNORE INTO referrals (referrer_id, invited_id, invited_name, invited_photo, created_at) VALUES (?, ?, ?, ?, ?)',
        [referrerId, invitedId, invitedName, invitedPhoto, Date.now()]
      );
      console.log(`✅ Added referral: ${invitedId} referred by ${referrerId}`);
      return true;
    } catch (error) {
      console.error('Error adding referral:', error);
      return false;
    }
  }

  async getInvitedUsers(referrerId: number): Promise<{invited_id: number, invited_name: string, invited_photo: string, created_at: number}[]> {    
    try {
      const rows = await this.dbAll(
        'SELECT invited_id, invited_name, invited_photo, created_at FROM referrals WHERE referrer_id = ? ORDER BY created_at DESC',
        [referrerId]
      );
      
      console.log(`📋 Found ${rows.length} invited users for referrer ${referrerId}`);
      return rows as any[];
    } catch (error) {
      console.error('Error getting invited users:', error);
      return [];
    }
  }

  async getReferralStats(referrerId: number): Promise<{totalReferrals: number, recentReferrals: number}> {    
    try {
      const totalRows = await this.dbAll(
        'SELECT COUNT(*) as count FROM referrals WHERE referrer_id = ?',
        [referrerId]
      );
      
      const recentRows = await this.dbAll(
        'SELECT COUNT(*) as count FROM referrals WHERE referrer_id = ? AND created_at > ?',
        [referrerId, Date.now() - (7 * 24 * 60 * 60 * 1000)] // Last 7 days
      );
      
      return {
        totalReferrals: totalRows[0]?.count || 0,
        recentReferrals: recentRows[0]?.count || 0
      };
    } catch (error) {
      console.error('Error getting referral stats:', error);
      return { totalReferrals: 0, recentReferrals: 0 };
    }
  }

  // Task methods
  async initializeTasks(): Promise<void> {    
    try {
      // Insert default tasks if they don't exist
      const tasks = [
        // Daily tasks
        {
          task_id: 'daily_create_story',
          title: 'Create Your First Story',
          description: 'Create and share your first story',
          category: 'daily',
          credits_reward: 1,
          is_daily: true
        },
        {
          task_id: 'daily_play_games',
          title: 'Play Daily Games',
          description: 'Complete both daily games',
          category: 'daily',
          credits_reward: 1,
          is_daily: true
        },
        {
          task_id: 'daily_public_collection',
          title: 'Make Public Collection',
          description: 'Create and launch a public collection',
          category: 'daily',
          credits_reward: 2,
          is_daily: true
        },
        {
          task_id: 'daily_promote_canvas',
          title: 'Promote Story Canvas',
          description: 'Share and promote the story canvas',
          category: 'daily',
          credits_reward: 3,
          is_daily: true
        },
        // Special tasks
        {
          task_id: 'special_invite_5',
          title: 'Invite 5 Friends',
          description: 'Invite 5 friends using your referral link',
          category: 'special',
          credits_reward: 5,
          is_daily: false
        },
        {
          task_id: 'special_invite_10',
          title: 'Invite 10 Friends',
          description: 'Invite 10 friends using your referral link',
          category: 'special',
          credits_reward: 10,
          is_daily: false
        },
        {
          task_id: 'special_invite_25',
          title: 'Invite 25 Friends',
          description: 'Invite 25 friends using your referral link',
          category: 'special',
          credits_reward: 20,
          is_daily: false
        },
        {
          task_id: 'special_invite_50',
          title: 'Invite 50 Friends',
          description: 'Invite 50 friends using your referral link',
          category: 'special',
          credits_reward: 40,
          is_daily: false
        }
      ];

      for (const task of tasks) {
        await this.dbRun(`
          INSERT OR IGNORE INTO tasks (task_id, title, description, category, credits_reward, is_daily, is_active, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [task.task_id, task.title, task.description, task.category, task.credits_reward, task.is_daily, 1, Date.now()]);
      }

      console.log('✅ Tasks initialized successfully');
    } catch (error) {
      console.error('Error initializing tasks:', error);
    }
  }

  async getTasks(category?: string): Promise<Task[]> {    
    try {
      let query = 'SELECT * FROM tasks WHERE is_active = 1';
      const params: any[] = [];
      
      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }
      
      query += ' ORDER BY category, credits_reward DESC';
      
      const rows = await this.dbAll(query, params);
      console.log(`📋 Found ${rows.length} tasks`);
      return rows as Task[];
    } catch (error) {
      console.error('Error getting tasks:', error);
      return [];
    }
  }

  async getTaskCompletionStatus(userId: number, taskId: string): Promise<{completed: boolean, completedAt?: number, creditsEarned?: number}> {    
    try {
      // For daily tasks, check if completed today
      const today = new Date().toISOString().split('T')[0];
      const todayStart = new Date(today).getTime();
      
      const row = await this.dbGet(`
        SELECT completed_at, credits_earned 
        FROM task_completions 
        WHERE user_id = ? AND task_id = ? AND completed_at >= ?
        ORDER BY completed_at DESC 
        LIMIT 1
      `, [userId, taskId, todayStart]);
      
      return {
        completed: !!row,
        completedAt: row?.completed_at,
        creditsEarned: row?.credits_earned
      };
    } catch (error) {
      console.error('Error getting task completion status:', error);
      return { completed: false };
    }
  }

  async completeTask(userId: number, taskId: string): Promise<boolean> {    
    try {
      // Get task details
      const task = await this.dbGet('SELECT * FROM tasks WHERE task_id = ? AND is_active = 1', [taskId]);
      if (!task) {
        console.error('Task not found:', taskId);
        return false;
      }

      // Check if already completed today (for daily tasks)
      const today = new Date().toISOString().split('T')[0];
      const todayStart = new Date(today).getTime();
      
      const existingCompletion = await this.dbGet(`
        SELECT id FROM task_completions 
        WHERE user_id = ? AND task_id = ? AND completed_at >= ?
      `, [userId, taskId, todayStart]);
      
      if (existingCompletion) {
        console.log('Task already completed today:', taskId);
        return false;
      }

      // Add completion record
      await this.dbRun(`
        INSERT INTO task_completions (user_id, task_id, completed_at, credits_earned)
        VALUES (?, ?, ?, ?)
      `, [userId, taskId, Date.now(), task.credits_reward]);

      // Update user credits
      await this.dbRun(`
        UPDATE users SET credits = credits + ? WHERE user_id = ?
      `, [task.credits_reward, userId]);

      console.log(`✅ Task completed: ${taskId}, earned ${task.credits_reward} credits`);
      return true;
    } catch (error) {
      console.error('Error completing task:', error);
      return false;
    }
  }

  async getUserTaskProgress(userId: number): Promise<{taskId: string, progress: any}[]> {    
    try {
      const rows = await this.dbAll(`
        SELECT task_id, progress_data 
        FROM user_task_progress 
        WHERE user_id = ?
      `, [userId]);
      
      return rows.map((row: any) => ({
        taskId: row.task_id,
        progress: JSON.parse(row.progress_data || '{}')
      }));
    } catch (error) {
      console.error('Error getting user task progress:', error);
      return [];
    }
  }

  async updateUserTaskProgress(userId: number, taskId: string, progress: any): Promise<void> {    
    try {
      await this.dbRun(`
        INSERT OR REPLACE INTO user_task_progress (user_id, task_id, progress_data, last_updated)
        VALUES (?, ?, ?, ?)
      `, [userId, taskId, JSON.stringify(progress), Date.now()]);
    } catch (error) {
      console.error('Error updating user task progress:', error);
    }
  }

  async hasUserCompletedBothDailyGamesToday(userId: number): Promise<boolean> {    
    try {
      const today = new Date().toISOString().split('T')[0];
      const rows = await this.dbAll(`
        SELECT time_slot FROM daily_game_solves 
        WHERE user_id = ? AND date = ?
      `, [userId, today]);
      
      const completedSlots = rows.map((row: any) => row.time_slot);
      return completedSlots.includes('morning') && completedSlots.includes('afternoon');
    } catch (error) {
      console.error('Error checking daily games completion:', error);
      return false;
    }
  }

  async getUserRequests(userId: number, startTime: number, endTime: number): Promise<any[]> {    
    try {
      const rows = await this.dbAll(`
        SELECT * FROM requests 
        WHERE user_id = ? AND created_at >= ? AND created_at <= ?
        ORDER BY created_at DESC
      `, [userId, startTime, endTime]);
      
      return rows;
    } catch (error) {
      console.error('Error getting user requests:', error);
      return [];
    }
  }

  // Utility methods
  // Game stats methods
  async getGameStat(statKey: string): Promise<number> {
    try {
      const row = await this.dbGet(`
        SELECT stat_value FROM game_stats WHERE stat_key = ?
      `, [statKey]) as GameStats | undefined;
      
      return row?.stat_value || 0;
    } catch (error) {
      console.error('Error getting game stat:', error);
      return 0;
    }
  }

  async incrementGameStat(statKey: string): Promise<number> {
    try {
      await this.dbRun(`
        UPDATE game_stats 
        SET stat_value = stat_value + 1, updated_at = ?
        WHERE stat_key = ?
      `, [Date.now(), statKey]);
      
      const newValue = await this.getGameStat(statKey);
      console.log(`📊 Incremented ${statKey} to ${newValue}`);
      return newValue;
    } catch (error) {
      console.error('Error incrementing game stat:', error);
      return 0;
    }
  }

  async getTotalGameSolves(): Promise<number> {
    return await this.getGameStat('total_solves');
  }

  async incrementTotalGameSolves(): Promise<number> {
    return await this.incrementGameStat('total_solves');
  }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('✅ Database connection closed');
        }
        resolve();
      });
    });
  }
}

// Export singleton instance
export const db = new DatabaseService();

// Helper functions for API routes
export async function getUserByTelegramId(telegramId: number): Promise<User | null> {
  try {
    const row = await db.getUser(telegramId);
    console.log('🔍 Database query result:', { telegramId, row });
    return row;
  } catch (error) {
    console.error('Error getting user by telegram ID:', error);
    return null;
  }
}

export async function updateUserCredits(telegramId: number, creditChange: number): Promise<number | null> {
  try {
    // Update credits using the database service
    const updatedUser = await db.updateUserCredits(telegramId, creditChange);
    return updatedUser?.credits || null;
  } catch (error) {
    console.error('Error updating user credits:', error);
    return null;
  }
}


