import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

export interface ProcessingResult {
  success: boolean;
  story_pieces?: string[];
  error?: string;
}

export class ImageProcessingService {
  private static readonly TEMP_DIR = path.join(process.cwd(), 'temp_uploads');
  private static readonly PYTHON_SCRIPT = path.join(process.cwd(), '..', 'image_cutter.py');

  /**
   * Process image using Python script
   */
  static async processImage(
    imageBuffer: Buffer,
    userId: number,
    customWatermark?: string
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    let tempImagePath: string | null = null;
    const timestamp = Date.now();

    try {
      // Ensure temp directory exists
      if (!fs.existsSync(this.TEMP_DIR)) {
        fs.mkdirSync(this.TEMP_DIR, { recursive: true });
      }

      // Create temporary file
      tempImagePath = path.join(this.TEMP_DIR, `temp_${userId}_${timestamp}.png`);
      
      // Write image buffer to temporary file
      await writeFile(tempImagePath, imageBuffer);

      // Create output directory for this user
      const userOutputDir = path.join(this.TEMP_DIR, `user_${userId}_${timestamp}`);
      
      // Prepare Python command
      const pythonArgs = [
        this.PYTHON_SCRIPT,
        tempImagePath,
        userOutputDir
      ];

      // Add custom watermark if provided
      if (customWatermark) {
        pythonArgs.push(customWatermark);
      }

      // Run Python script
      const result = await this.runPythonScript(pythonArgs);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Image processing failed'
        };
      }

      // Read generated story pieces
      const storyPieces = await this.readStoryPieces(userId, timestamp);
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ Image processed in ${processingTime}ms`);

      return {
        success: true,
        story_pieces: storyPieces
      };

    } catch (error) {
      console.error('❌ Image processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      // Clean up temporary files
      if (tempImagePath && fs.existsSync(tempImagePath)) {
        try {
          await unlink(tempImagePath);
        } catch (error) {
          console.error('Error cleaning up temp image:', error);
        }
      }
      
      // Clean up story pieces
      await this.cleanupStoryPieces(userId, timestamp);
    }
  }

  /**
   * Run Python script for image processing
   */
  private static runPythonScript(args: string[]): Promise<{ success: boolean; error?: string }> {
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
          console.log('✅ Python script completed successfully');
          console.log('Python output:', stdout);
          resolve({ success: true });
        } else {
          console.error('❌ Python script failed with code:', code);
          console.error('Python stderr:', stderr);
          resolve({ 
            success: false, 
            error: stderr || `Python script exited with code ${code}` 
          });
        }
      });

      python.on('error', (error) => {
        console.error('❌ Python script error:', error);
        resolve({ 
          success: false, 
          error: `Failed to run Python script: ${error.message}` 
        });
      });

      // Set timeout (60 seconds)
      setTimeout(() => {
        python.kill();
        resolve({ 
          success: false, 
          error: 'Python script timeout (60 seconds)' 
        });
      }, 60000);
    });
  }

  /**
   * Read generated story pieces
   */
  private static async readStoryPieces(userId: number, timestamp: number): Promise<string[]> {
    const storyPieces: string[] = [];
    
    try {
      const userOutputDir = path.join(this.TEMP_DIR, `user_${userId}_${timestamp}`);
      
      // Look for story piece files (image_cutter.py creates files like 1cut.png, 2cut.png, etc.)
      const files = fs.readdirSync(userOutputDir).filter(f => f.endsWith('.png') && f.includes('cut'));
      
      // Sort files by number
      const sortedFiles = files.sort((a, b) => {
        const numA = parseInt(a.match(/(\d+)cut/)?.[1] || '0');
        const numB = parseInt(b.match(/(\d+)cut/)?.[1] || '0');
        return numA - numB;
      });
      
      for (const file of sortedFiles) {
        const piecePath = path.join(userOutputDir, file);
        const imageBuffer = fs.readFileSync(piecePath);
        const base64 = imageBuffer.toString('base64');
        const dataUrl = `data:image/png;base64,${base64}`;
        storyPieces.push(dataUrl);
      }

      console.log(`📸 Found ${storyPieces.length} story pieces`);
      return storyPieces;

    } catch (error) {
      console.error('Error reading story pieces:', error);
      return [];
    }
  }

  /**
   * Clean up temporary story piece files
   */
  private static async cleanupStoryPieces(userId: number, timestamp: number): Promise<void> {
    try {
      const userOutputDir = path.join(this.TEMP_DIR, `user_${userId}_${timestamp}`);
      
      if (fs.existsSync(userOutputDir)) {
        // Remove the entire user output directory
        await fs.promises.rm(userOutputDir, { recursive: true, force: true });
      }
      
      console.log('🧹 Cleaned up temporary story pieces');
    } catch (error) {
      console.error('Error cleaning up story pieces:', error);
    }
  }

  /**
   * Validate image file
   */
  static validateImage(buffer: Buffer, filename: string): { valid: boolean; error?: string } {
    // Check file size (10MB max)
    if (buffer.length > 10 * 1024 * 1024) {
      return {
        valid: false,
        error: 'File too large. Maximum size is 10MB'
      };
    }

    // Check file extension
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    const ext = path.extname(filename).toLowerCase();
    
    if (!allowedExtensions.includes(ext)) {
      return {
        valid: false,
        error: 'Invalid file type. Please upload PNG, JPG, JPEG, GIF, or WebP'
      };
    }

    // Basic image header validation
    if (buffer.length < 8) {
      return {
        valid: false,
        error: 'Invalid image file'
      };
    }

    // Check for common image file signatures
    const signatures = [
      [0x89, 0x50, 0x4E, 0x47], // PNG
      [0xFF, 0xD8, 0xFF],       // JPEG
      [0x47, 0x49, 0x46],       // GIF
      [0x52, 0x49, 0x46, 0x46], // WebP (RIFF)
    ];

    const header = Array.from(buffer.slice(0, 8));
    const isValidImage = signatures.some(signature => 
      signature.every((byte, index) => header[index] === byte)
    );

    if (!isValidImage) {
      return {
        valid: false,
        error: 'Invalid image format'
      };
    }

    return { valid: true };
  }
}
