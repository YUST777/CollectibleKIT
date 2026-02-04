import { spawn } from 'child_process';
import path from 'path';

export interface WithdrawalResult {
  success: boolean;
  transaction_hash?: string;
  error?: string;
}

export class TonWalletService {
  private static readonly PYTHON_SCRIPT = '/root/01studio/CollectibleKIT/bot/ton_wallet_cli.py';

  /**
   * Send TON withdrawal
   */
  static async sendWithdrawal(
    userId: number,
    amount: number,
    walletAddress: string
  ): Promise<WithdrawalResult> {
    try {
      console.log(`💰 Processing withdrawal for user ${userId}: ${amount} TON to ${walletAddress}`);

      // Prepare Python command
      const pythonArgs = [
        this.PYTHON_SCRIPT,
        '--user-id', userId.toString(),
        '--amount', amount.toString(),
        '--wallet', walletAddress
      ];

      // Run Python script
      const result = await this.runPythonScript(pythonArgs);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Withdrawal failed'
        };
      }

      console.log('✅ Withdrawal processed successfully');
      return {
        success: true,
        transaction_hash: result.transaction_hash
      };

    } catch (error) {
      console.error('❌ Withdrawal error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Run Python script for TON operations
   */
  private static runPythonScript(args: string[]): Promise<{ 
    success: boolean; 
    transaction_hash?: string; 
    stdout?: string;
    error?: string 
  }> {
    return new Promise((resolve) => {
      const python = spawn('python3', args, {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Python TON script completed successfully');
          console.log('Python output:', stdout);
          
          // Try to extract transaction hash from output
          const txHashMatch = stdout.match(/TRANSACTION_HASH[:\s]*([A-Za-z0-9+/=]+)/i);
          const transactionHash = txHashMatch ? txHashMatch[1] : undefined;
          
          resolve({ 
            success: true, 
            stdout: stdout,
            transaction_hash: transactionHash 
          });
        } else {
          console.error('❌ Python TON script failed with code:', code);
          console.error('Python stderr:', stderr);
          resolve({ 
            success: false, 
            error: stderr || `Python script exited with code ${code}` 
          });
        }
      });

      python.on('error', (error) => {
        console.error('❌ Python TON script error:', error);
        resolve({ 
          success: false, 
          error: `Failed to run Python script: ${error.message}` 
        });
      });

      // Set timeout (120 seconds for blockchain operations)
      setTimeout(() => {
        python.kill();
        resolve({ 
          success: false, 
          error: 'Python script timeout (120 seconds)' 
        });
      }, 120000);
    });
  }

  /**
   * Get wallet balance
   */
  static async getWalletBalance(): Promise<{
    success: boolean;
    balance?: number;
    error?: string;
  }> {
    try {
      const pythonArgs = [this.PYTHON_SCRIPT, '--balance'];

      const result = await this.runPythonScript(pythonArgs);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to get balance'
        };
      }

      // Try to extract balance from output
      const balanceMatch = result.stdout?.match(/balance[:\s]*([0-9.]+)/i);
      const balance = balanceMatch ? parseFloat(balanceMatch[1]) : 0;

      return {
        success: true,
        balance: balance
      };

    } catch (error) {
      console.error('❌ Get balance error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate TON wallet address
   */
  static validateWalletAddress(address: string): boolean {
    // Basic TON address validation
    // TON addresses can be in different formats, this is a basic check
    const tonAddressRegex = /^[A-Za-z0-9_-]{48}$/;
    const eqAddressRegex = /^EQ[A-Za-z0-9_-]{46}$/;
    
    return tonAddressRegex.test(address) || eqAddressRegex.test(address);
  }
}


