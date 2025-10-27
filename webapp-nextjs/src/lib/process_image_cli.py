#!/usr/bin/env python3
"""
CLI wrapper for processing.py to handle image processing from Next.js API
"""
import sys
import os

# Add bot directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'bot'))

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
        for idx, piece_bytes in enumerate(story_pieces, start=1):
            output_path = os.path.join(output_dir, f"{idx}cut.png")
            with open(output_path, 'wb') as f:
                f.write(piece_bytes.getvalue())
        
        print(f"✅ Successfully created {len(story_pieces)} story pieces in {output_dir}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()

