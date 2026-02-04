#!/usr/bin/env python3
"""
Center Cut Pieces on Story Background
Takes cut pieces and centers them on 1080x1920 black backgrounds for stories
"""

from PIL import Image, ImageDraw
import os
import glob

def center_cut_on_story_background(input_dir="cuts", output_dir="story_cuts"):
    """
    Scale and center each cut piece on a 1080x1920 black background to fill width
    
    Args:
        input_dir (str): Directory containing cut pieces
        output_dir (str): Directory to save story-ready pieces
    """
    # Story dimensions (standard for Instagram/Telegram stories)
    STORY_WIDTH = 1080
    STORY_HEIGHT = 1920
    
    # Create output directory if it doesn't exist
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Find all cut files
    cut_files = glob.glob(os.path.join(input_dir, "*cut.png"))
    cut_files.sort(key=lambda x: int(os.path.basename(x).split('cut')[0]))
    
    if not cut_files:
        print(f"No cut files found in '{input_dir}' directory!")
        return False
    
    print(f"Found {len(cut_files)} cut pieces to process...")
    
    for cut_file in cut_files:
        try:
            # Open the cut piece
            cut_img = Image.open(cut_file)
            original_width, original_height = cut_img.size
            
            # Calculate scaling to match study.jpg format exactly
            # Fill full width (1080px) and set height to 69.6% of story height
            target_height = int(STORY_HEIGHT * 0.696)  # 1336px like the reference
            new_width = STORY_WIDTH  # Always fill full width (1080px)
            new_height = target_height
            
            # Resize the cut piece
            cut_img_resized = cut_img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Create black background
            story_img = Image.new('RGB', (STORY_WIDTH, STORY_HEIGHT), color='black')
            
            # Calculate position - full width, centered vertically
            x_pos = 0  # Full width, no horizontal centering needed
            y_pos = (STORY_HEIGHT - new_height) // 2  # Center vertically
            
            # Paste the scaled cut piece onto the black background
            story_img.paste(cut_img_resized, (x_pos, y_pos))
            
            # Save the story-ready piece
            filename = os.path.basename(cut_file)
            output_path = os.path.join(output_dir, filename)
            story_img.save(output_path, "PNG")
            
            print(f"✅ Created story piece: {filename} (scaled {original_width}x{original_height} → {new_width}x{new_height}, FULL WIDTH + 69.6% height like reference)")
            
        except Exception as e:
            print(f"❌ Error processing {cut_file}: {e}")
            continue
    
    print(f"\n🎉 All pieces processed! Story-ready cuts saved in '{output_dir}' directory")
    print("📱 Each piece is now 1080x1920 and ready for Telegram/Instagram stories!")
    return True

def main():
    print("=== Story Background Scale & Center Tool ===")
    print("Scales cut pieces to fill width and centers them on 1080x1920 black backgrounds")
    
    # Check if cuts directory exists
    input_directory = "cuts_full2"
    if not os.path.exists(input_directory):
        print(f"❌ Error: '{input_directory}' directory not found!")
        print("Make sure you've run the image cutter first.")
        return
    
    # Process the cuts
    success = center_cut_on_story_background(input_directory, "story_cuts_full2")
    
    if success:
        print("\n💡 Tips:")
        print("- Post these in order: 1cut.png, 2cut.png, 3cut.png...")
        print("- Each row of 3 pieces will form a complete horizontal section")
        print("- Now FULL WIDTH (1080px) + 69.6% height (1336px) - EXACTLY like reference!")
        print("- Perfect 292px black borders on top/bottom, no side borders!")

if __name__ == "__main__":
    main()
