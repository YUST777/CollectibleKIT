import os
from io import BytesIO
from typing import List, Optional

from PIL import Image, ImageDraw, ImageFont


STORY_WIDTH = 1080
STORY_HEIGHT = 1920
CONTENT_HEIGHT = int(STORY_HEIGHT * 0.696)  # 1336


def _resize_piece_full_width_and_target_height(piece: Image.Image) -> Image.Image:
    target_size = (STORY_WIDTH, CONTENT_HEIGHT)
    return piece.resize(target_size, Image.Resampling.LANCZOS)


def _center_on_story_canvas(scaled_piece: Image.Image) -> Image.Image:
    canvas = Image.new("RGB", (STORY_WIDTH, STORY_HEIGHT), color="black")
    x = 0
    y = (STORY_HEIGHT - CONTENT_HEIGHT) // 2
    canvas.paste(scaled_piece, (x, y))
    return canvas


def _draw_watermark(image: Image.Image, text: str) -> Image.Image:
    if not text:
        return image
    
    try:
        # Create a copy to avoid modifying the original
        img_copy = image.copy()
        
        # Try to load a decent font; fall back to default
        font = None
        font_paths = [
            os.path.join("/usr", "share", "fonts", "truetype", "dejavu", "DejaVuSans-Bold.ttf"),  # Linux
            os.path.join("/System", "Library", "Fonts", "Arial.ttf"),  # macOS
            os.path.join("C:", "Windows", "Fonts", "arial.ttf"),  # Windows
            os.path.join(os.path.dirname(__file__), "fonts", "DejaVuSans-Bold.ttf"),  # Local fonts folder
        ]
        
        for font_path in font_paths:
            try:
                if os.path.exists(font_path):
                    font = ImageFont.truetype(font_path, 32)  # Readable but not too big
                    break
            except Exception:
                continue
        
        if font is None:
            font = ImageFont.load_default()
        
        # Position watermark in the middle-left area like in the purple highlighted area
        content_center_y = (STORY_HEIGHT - CONTENT_HEIGHT) // 2 + CONTENT_HEIGHT // 2  # Middle of content area
        margin_x = 50  # Distance from left edge
        
        # Use textbbox instead of deprecated textsize
        draw = ImageDraw.Draw(img_copy)
        bbox = draw.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        x = margin_x  # Left-aligned
        y = content_center_y - th // 2  # Vertically centered in content
        
        # Create a very subtle overlay for barely visible watermark
        overlay = Image.new('RGBA', img_copy.size, (0, 0, 0, 0))
        overlay_draw = ImageDraw.Draw(overlay)
        
        # Draw text with subtle shadow first, then the main text
        # Shadow for better visibility against any background
        overlay_draw.text((x+1, y+1), text, fill=(0, 0, 0, 60), font=font)  # Darker shadow for better contrast
        # Main watermark text - make it more visible
        overlay_draw.text((x, y), text, fill=(255, 255, 255, 120), font=font)  # More visible white text
        
        # Convert main image to RGBA if it isn't already
        if img_copy.mode != 'RGBA':
            img_copy = img_copy.convert('RGBA')
        
        # Blend the overlay with the main image
        result = Image.alpha_composite(img_copy, overlay)
        # Convert back to RGB for saving
        return result.convert('RGB')
        
    except Exception as e:
        print(f"Error applying watermark: {e}")
        return image  # Return original image if watermarking fails


def _cut_into_grid(img: Image.Image, rows: int, cols: int) -> List[Image.Image]:
    w, h = img.size
    piece_w = w // cols
    piece_h = h // rows
    pieces: List[Image.Image] = []
    for r in range(rows):
        for c in range(cols):
            left = c * piece_w
            top = r * piece_h
            right = w if c == cols - 1 else left + piece_w
            bottom = h if r == rows - 1 else top + piece_h
            pieces.append(img.crop((left, top, right, bottom)))
    return pieces


def cut_into_4x3_and_prepare_story_pieces(image: Image.Image, watermark_text: Optional[str] = None) -> List[BytesIO]:
    """Cut an image into 4x3 grid then scale each to 1080x1336 and center
    on 1080x1920 canvas. Returns in-memory PNGs ready to send to Telegram.
    If watermark_text is provided, draw it on each story image.
    """

    rows, cols = 4, 3
    pieces = _cut_into_grid(image, rows, cols)

    outputs: List[BytesIO] = []
    for idx, piece in enumerate(pieces, start=1):
        scaled = _resize_piece_full_width_and_target_height(piece)
        story_img = _center_on_story_canvas(scaled)
        if watermark_text:
            story_img = _draw_watermark(story_img, watermark_text)
        bio = BytesIO()
        story_img.save(bio, format="PNG")
        bio.seek(0)
        outputs.append(bio)
    
    # Don't reverse - keep natural top-to-bottom order
    # The numbering will be handled in telegram_bot.py to show decreasing numbers
    return outputs


def cut_into_3x4_and_prepare_story_pieces(image: Image.Image, watermark_text: Optional[str] = None) -> List[BytesIO]:
    """Cut an image into 3x4 grid then scale each to 1080x1336 and center
    on 1080x1920 canvas. Returns in-memory PNGs ready to send to Telegram.
    If watermark_text is provided, draw it on each story image.
    """

    rows, cols = 3, 4  # 3 rows, 4 columns (3 pieces per row, 4 rows)
    pieces = _cut_into_grid(image, rows, cols)

    outputs: List[BytesIO] = []
    for idx, piece in enumerate(pieces, start=1):
        scaled = _resize_piece_full_width_and_target_height(piece)
        story_img = _center_on_story_canvas(scaled)
        if watermark_text:
            story_img = _draw_watermark(story_img, watermark_text)
        bio = BytesIO()
        story_img.save(bio, format="PNG")
        bio.seek(0)
        outputs.append(bio)
    
    # Don't reverse - keep natural top-to-bottom order
    # The numbering will be handled in telegram_bot.py to show decreasing numbers
    return outputs


