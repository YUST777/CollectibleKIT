#!/usr/bin/env python3
"""
Analyze the study.jpg reference to understand the exact format
"""

from PIL import Image
import numpy as np

def analyze_reference_image(reference_path="study.jpg"):
    """
    Analyze the reference image to understand the layout
    """
    try:
        # Open the reference image
        ref_img = Image.open(reference_path)
        width, height = ref_img.size
        
        print(f"Reference image dimensions: {width}x{height}")
        
        # Convert to RGB array for analysis
        img_array = np.array(ref_img.convert('RGB'))
        
        # Find where the actual content starts and ends (non-black areas)
        # Check for black borders by looking at the RGB values
        black_threshold = 30  # Consider pixels with RGB < 30 as black
        
        # Check top border
        top_border = 0
        for y in range(height):
            row = img_array[y]
            non_black_pixels = np.sum(np.any(row > black_threshold, axis=1))
            if non_black_pixels > width * 0.1:  # If more than 10% of row is non-black
                top_border = y
                break
        
        # Check bottom border
        bottom_border = height
        for y in range(height-1, -1, -1):
            row = img_array[y]
            non_black_pixels = np.sum(np.any(row > black_threshold, axis=1))
            if non_black_pixels > width * 0.1:  # If more than 10% of row is non-black
                bottom_border = y + 1
                break
        
        content_height = bottom_border - top_border
        
        print(f"Top black border: {top_border}px")
        print(f"Bottom black border: {height - bottom_border}px")
        print(f"Content height: {content_height}px")
        print(f"Content fills: {(content_height/height)*100:.1f}% of story height")
        
        # Calculate the exact ratios
        top_ratio = top_border / height
        content_ratio = content_height / height
        bottom_ratio = (height - bottom_border) / height
        
        print(f"\nRatios:")
        print(f"Top border ratio: {top_ratio:.3f}")
        print(f"Content ratio: {content_ratio:.3f}")
        print(f"Bottom border ratio: {bottom_ratio:.3f}")
        
        return {
            'width': width,
            'height': height,
            'top_border': top_border,
            'bottom_border': bottom_border,
            'content_height': content_height,
            'content_ratio': content_ratio
        }
        
    except Exception as e:
        print(f"Error analyzing reference: {e}")
        return None

if __name__ == "__main__":
    print("=== Analyzing Reference Study Image ===")
    result = analyze_reference_image()
    
    if result:
        print(f"\n🎯 Target format:")
        print(f"- Story size: {result['width']}x{result['height']}")
        print(f"- Content should fill {result['content_ratio']:.1%} of the height")
        print(f"- Top/bottom borders: ~{result['top_border']}px each")

