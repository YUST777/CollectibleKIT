#!/usr/bin/env python3
"""
Image Cutter for Telegram Stories
Cuts a full image into symmetric pieces for puzzle-like story posts
"""

from PIL import Image
import os
import sys

def cut_image_into_pieces(input_path, output_dir="cuts", rows=3, cols=3):
    """
    Cut an image into symmetric pieces
    
    Args:
        input_path (str): Path to the input image
        output_dir (str): Directory to save cut pieces
        rows (int): Number of rows to cut
        cols (int): Number of columns to cut
    """
    try:
        # Open the image
        img = Image.open(input_path)
        print(f"Original image size: {img.size}")
        
        # Calculate dimensions for each piece
        img_width, img_height = img.size
        piece_width = img_width // cols
        piece_height = img_height // rows
        
        # Create output directory if it doesn't exist
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
        
        # Cut the image into pieces
        piece_number = 1
        for row in range(rows):
            for col in range(cols):
                # Calculate coordinates for this piece
                left = col * piece_width
                top = row * piece_height
                right = left + piece_width
                bottom = top + piece_height
                
                # Handle edge cases for the last row/column
                if col == cols - 1:
                    right = img_width
                if row == rows - 1:
                    bottom = img_height
                
                # Crop the piece
                piece = img.crop((left, top, right, bottom))
                
                # Save the piece
                output_filename = f"{piece_number}cut.png"
                output_path = os.path.join(output_dir, output_filename)
                piece.save(output_path, "PNG")
                
                print(f"Saved piece {piece_number}: {output_filename} ({piece.size})")
                piece_number += 1
        
        print(f"\nSuccessfully cut image into {rows}x{cols} = {rows*cols} pieces!")
        print(f"Pieces saved in '{output_dir}' directory")
        
    except Exception as e:
        print(f"Error processing image: {e}")
        return False
    
    return True

def main():
    # Check if running from command line with arguments (for API use)
    if len(sys.argv) >= 3:
        input_file = sys.argv[1]
        output_directory = sys.argv[2]
        rows = 4  # Default to 4x3 (12 pieces) for Telegram stories
        cols = 3
        
        # Check for custom rows/cols in arguments
        if len(sys.argv) >= 5:
            rows = int(sys.argv[3])
            cols = int(sys.argv[4])
        
        if not os.path.exists(input_file):
            print(f"Error: {input_file} not found!")
            return
        
        # Cut the image directly
        success = cut_image_into_pieces(input_file, output_directory, rows, cols)
        
        if success:
            print("\n✅ Done! Your image pieces are ready for Telegram stories!")
            print(f"📁 Check the '{output_directory}' folder for all pieces.")
        else:
            print("\n❌ Failed to cut the image.")
        return
    
    # Interactive mode (old behavior)
    # Default settings
    input_file = "full2.jpg"
    output_directory = "cuts_full2"
    
    # Check if input file exists
    if not os.path.exists(input_file):
        print(f"Error: {input_file} not found!")
        print("Make sure the image file is in the same directory as this script.")
        return
    
    print("=== Telegram Story Image Cutter ===")
    print(f"Input file: {input_file}")
    
    # Ask user for grid size
    try:
        print("\nChoose grid size for cutting:")
        print("1. 3x3 (9 pieces) - Standard grid")
        print("2. 4x3 (12 pieces) - Telegram Stories Optimized (4 rows, 3 columns)")
        print("3. 6x3 (18 pieces) - Extended Telegram Stories (6 rows, 3 columns)")
        print("4. 3x4 (12 pieces) - 3 rows, 4 columns")
        print("5. 4x4 (16 pieces) - More detailed puzzle")
        print("6. Custom")
        
        choice = input("Enter your choice (1-6): ").strip()
        
        if choice == "1":
            rows, cols = 3, 3
        elif choice == "2":
            rows, cols = 4, 3  # 4 rows, 3 columns - perfect for Telegram stories
        elif choice == "3":
            rows, cols = 6, 3  # 6 rows, 3 columns - extended stories
        elif choice == "4":
            rows, cols = 3, 4
        elif choice == "5":
            rows, cols = 4, 4
        elif choice == "6":
            rows = int(input("Enter number of rows: "))
            cols = int(input("Enter number of columns: "))
        else:
            print("Invalid choice, using default 3x3")
            rows, cols = 3, 3
            
    except ValueError:
        print("Invalid input, using default 3x3")
        rows, cols = 3, 3
    
    print(f"\nCutting image into {rows}x{cols} grid...")
    
    # Cut the image
    success = cut_image_into_pieces(input_file, output_directory, rows, cols)
    
    if success:
        print("\n✅ Done! Your image pieces are ready for Telegram stories!")
        print(f"📁 Check the '{output_directory}' folder for all pieces.")
        print("\n💡 Tip: Post the pieces in order (1cut.png, 2cut.png, etc.) to create the puzzle effect!")
    else:
        print("\n❌ Failed to cut the image. Please check the error messages above.")

if __name__ == "__main__":
    main()
