#!/usr/bin/env python3
"""
CLI wrapper for processing.py to handle image processing from Next.js API
"""
import sys
import os

# Get the absolute path to the bot directory
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(os.path.dirname(current_dir))  # Go up from webapp-nextjs/src/lib to project root
bot_dir = os.path.join(project_root, 'bot')

# Debug: print paths
print(f"Current dir: {current_dir}", file=sys.stderr)
print(f"Project root: {project_root}", file=sys.stderr)
print(f"Bot dir: {bot_dir}", file=sys.stderr)
print(f"Bot dir exists: {os.path.exists(bot_dir)}", file=sys.stderr)

# Add bot directory to path
sys.path.insert(0, bot_dir)

from processing import cut_into_4x3_and_prepare_story_pieces
from PIL import Image

def main():
    if len(sys.argv) < 3:
        print("Usage: python process_image_cli.py <input_file> <output_dir> [watermark]")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_dir = sys.argv[2]
    watermark = sys.argv[3] if len(sys.argv) > 3 else None
    
    try:
        # Open the image
        image = Image.open(input_file)
        
        # Process image into story pieces
        story_pieces = cut_into_4x3_and_prepare_story_pieces(image, watermark)
        
        # Create output directory if it doesn't exist
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
        
        # Save each story piece to file
        # Note: The ZIP will download these numbered files, so we need to save them properly
        # The bot sends them in reverse order (12, 11, ..., 1), but we save in forward order
        for idx, piece_bytes in enumerate(story_pieces, start=1):
            # Create filename matching the pattern expected by imageProcessing.ts
            output_path = os.path.join(output_dir, f"{idx}cut.png")
            with open(output_path, 'wb') as f:
                # piece_bytes is a BytesIO object
                piece_bytes.seek(0)  # Reset to beginning
                f.write(piece_bytes.getvalue())
            piece_bytes.close()  # Close the BytesIO
        
        print(f"✅ Successfully created {len(story_pieces)} story pieces in {output_dir}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()

