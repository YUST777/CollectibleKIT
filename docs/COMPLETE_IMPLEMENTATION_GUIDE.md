# 🎨 Complete Telegram Story Sharing Implementation Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [How It Works](#how-it-works)
4. [The Widget Link Feature](#the-widget-link-feature)
5. [Code Breakdown](#code-breakdown)
6. [Deployment](#deployment)
7. [Troubleshooting](#troubleshooting)

---

## Overview

This Mini App allows users to upload photos, cut them into 12 story pieces (4x3 grid), and share them directly to Telegram Stories with a custom widget link button that appears on each story.

### Key Features:
- ✅ Upload any photo via Mini App
- ✅ Automatically cut into 12 perfectly-sized story pieces (1080x1920)
- ✅ Share directly to Telegram Stories with one click
- ✅ **Custom widget link button** on each story (clickable link)
- ✅ Native Telegram theme integration
- ✅ Works on Android, iOS, and Desktop

---

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   User's    │         │  Mini App    │         │   Flask     │
│  Telegram   │◄────────┤  (webapp/)   │◄────────┤   API       │
│   Client    │         │  JavaScript  │         │ (Python)    │
└─────────────┘         └──────────────┘         └─────────────┘
       │                        │                        │
       │                        │                        │
       │  1. Opens Mini App     │                        │
       ├───────────────────────►│                        │
       │                        │                        │
       │  2. Uploads Photo      │  3. Process Image     │
       │                        ├───────────────────────►│
       │                        │                        │
       │                        │  4. Returns 12 pieces │
       │                        │◄───────────────────────┤
       │                        │                        │
       │  5. Clicks piece       │  6. Upload to server  │
       │                        ├───────────────────────►│
       │                        │                        │
       │                        │  7. Get public URL    │
       │                        │◄───────────────────────┤
       │                        │                        │
       │  8. shareToStory()     │                        │
       │◄───────────────────────┤                        │
       │                        │                        │
       │  9. Opens Story Editor │                        │
       │    with image + link   │                        │
       └────────────────────────┴────────────────────────┘
```

---

## How It Works

### Phase 1: Image Upload & Processing

1. **User opens Mini App** → Telegram loads `webapp/index.html`
2. **User selects photo** → JavaScript reads file as base64
3. **Photo sent to Flask API** → `/api/process-image` endpoint
4. **Python processes image** → Uses PIL to cut into 4x3 grid (12 pieces)
5. **Returns 12 pieces** → Each as base64 data URL

### Phase 2: Story Sharing

1. **User clicks a story piece** → JavaScript function `sendStoryPiece()` is called
2. **Convert base64 to Blob** → JavaScript converts data URL to binary
3. **Upload to Flask server** → POST to `/api/upload-story-piece`
4. **Server saves to disk** → Saved in `temp_uploads/` directory
5. **Returns public URL** → ngrok URL (e.g., `https://xxx.ngrok-free.app/uploads/story_123.png`)
6. **Call `shareToStory()`** → Telegram WebApp API method
7. **Telegram opens story editor** → With the image loaded and widget link button!

---

## The Widget Link Feature

### What is a Widget Link?

A **widget link** is a clickable button that appears on Telegram Stories. When someone views your story, they see a button at the bottom that they can tap to open a link (usually your bot or website).

### How We Implemented It

#### Step 1: Understanding the API

According to [Telegram's official documentation](https://core.telegram.org/bots/webapps#july-31-2024), the `shareToStory()` method accepts:

```javascript
shareToStory(media_url, params)
```

Where `params` can include:
- `text`: Caption for the story (up to 200 characters)
- `widget_link`: An object with `url` and `name` properties

#### Step 2: The Correct Implementation

```javascript
tg.shareToStory(publicImageUrl, {
    text: 'Story Piece 1/12 🎨',  // Caption
    widget_link: {
        url: "https://t.me/TWETestBot",  // Your bot link
        name: "Story Puzzle"              // Button text (optional)
    }
});
```

**Key Points:**
- ✅ `media_url` is the **first parameter** as a **string**
- ✅ `widget_link` is inside the second parameter object
- ✅ `url` must be a valid Telegram link (e.g., `https://t.me/YourBot`)
- ✅ `name` is optional - if not provided, Telegram shows the bot name

#### Step 3: What Telegram Does

When you call this:
1. Telegram fetches the image from your URL
2. Opens the story editor with the image loaded
3. **Adds a widget button** at the bottom of the story
4. The button shows your `name` text
5. When tapped, it opens your `url`

### Widget Link in Action

**On the Story Creator's View:**
```
┌──────────────────────┐
│                      │
│    Your Image        │
│      Here            │
│                      │
│                      │
├──────────────────────┤
│  [Story Puzzle →]    │  ← Widget button (visible to you)
└──────────────────────┘
```

**On the Viewer's View:**
```
┌──────────────────────┐
│                      │
│    Story Image       │
│                      │
│                      │
│                      │
│                      │
│                      │
│  [Story Puzzle →]    │  ← Clickable button (opens t.me/TWETestBot)
└──────────────────────┘
```

### Important Notes About Widget Links

1. **Only for Premium Users** (in some Telegram versions)
   - Regular users might not see the widget link
   - Test with a Telegram Premium account to see it fully

2. **URL Requirements:**
   - Must be a Telegram link: `https://t.me/username` or `https://t.me/botname`
   - Cannot be external websites
   - Can link to bots, channels, or users

3. **Button Text:**
   - The `name` parameter is optional
   - If omitted, Telegram shows the bot/channel name
   - Keep it short (recommended: 10-20 characters)

---

## Code Breakdown

### 1. Mini App Frontend (`webapp/app.js`)

#### The Main Story Sharing Function:

```javascript
async function sendStoryPiece(imageDataUrl, pieceNumber) {
    try {
        // 1. Check if shareToStory is available
        if (!tg || !tg.shareToStory) {
            tg.showAlert('❌ shareToStory method not available');
            return;
        }
        
        // 2. Convert base64 to Blob
        const response = await fetch(imageDataUrl);
        const blob = await response.blob();
        
        // 3. Upload to server to get public URL
        const formData = new FormData();
        formData.append('image', blob, `story_piece_${pieceNumber}.png`);
        formData.append('userId', tg.initDataUnsafe?.user?.id || 'unknown');
        
        const uploadResponse = await fetch('/api/upload-story-piece', {
            method: 'POST',
            body: formData
        });
        
        const uploadData = await uploadResponse.json();
        const publicUrl = uploadData.url;
        
        // 4. Call shareToStory with correct format
        // CRITICAL: URL is FIRST parameter, options is SECOND
        tg.shareToStory(publicUrl, {
            text: `Story Piece ${pieceNumber}/12 🎨`,
            widget_link: {
                url: "https://t.me/TWETestBot",
                name: "Story Puzzle"
            }
        });
        
        // 5. Show success feedback
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('medium');
        }
        
    } catch (error) {
        console.error('Error sharing story piece:', error);
        tg.showAlert('❌ Failed to share: ' + error.message);
    }
}
```

**Why This Works:**
1. ✅ Converts base64 to Blob (required for FormData)
2. ✅ Uploads to server to get public HTTPS URL
3. ✅ Uses correct `shareToStory(url, options)` format
4. ✅ Includes widget_link in options object
5. ✅ Provides user feedback with haptic

### 2. Flask API Backend (`webapp_api.py`)

#### Upload Endpoint:

```python
@app.route('/api/upload-story-piece', methods=['POST'])
def upload_story_piece():
    """Upload a story piece and return a public URL"""
    try:
        # 1. Get the image file from request
        if 'image' not in request.files:
            return jsonify({"error": "No image file provided"}), 400
        
        image_file = request.files['image']
        user_id = request.form.get('userId', 'unknown')
        
        # 2. Create uploads directory if it doesn't exist
        uploads_dir = os.path.join(os.path.dirname(__file__), 'temp_uploads')
        os.makedirs(uploads_dir, exist_ok=True)
        
        # 3. Generate unique filename with timestamp
        timestamp = int(time.time() * 1000)
        filename = f"story_{user_id}_{timestamp}_{image_file.filename}"
        filepath = os.path.join(uploads_dir, filename)
        
        # 4. Save the file to disk
        image_file.save(filepath)
        
        # 5. Get the public URL (using ngrok for testing)
        from bot.config import MINI_APP_URL
        base_url = MINI_APP_URL.rstrip('/')
        public_url = f"{base_url}/uploads/{filename}"
        
        logger.info(f"Uploaded story piece: {filename} for user {user_id}")
        logger.info(f"Public URL: {public_url}")
        
        # 6. Return the public URL to the client
        return jsonify({
            "success": True,
            "url": public_url,
            "filename": filename
        })
        
    except Exception as e:
        logger.error(f"Error uploading story piece: {e}")
        return jsonify({"error": str(e)}), 500
```

#### Serve Endpoint:

```python
@app.route('/uploads/<filename>', methods=['GET'])
def serve_upload(filename):
    """Serve uploaded files"""
    try:
        uploads_dir = os.path.join(os.path.dirname(__file__), 'temp_uploads')
        from flask import send_from_directory
        return send_from_directory(uploads_dir, filename)
    except Exception as e:
        logger.error(f"Error serving file {filename}: {e}")
        return jsonify({"error": "File not found"}), 404
```

**Why We Need This:**
- ❌ Telegram cannot access base64 data URLs
- ✅ Telegram CAN access public HTTPS URLs
- ✅ ngrok provides HTTPS for local testing
- ✅ In production, use cloud storage (S3, Cloudinary)

### 3. Telegram Bot Integration (`bot/telegram_bot.py`)

#### Launch Mini App with Keyboard Button:

```python
from telegram import KeyboardButton, ReplyKeyboardMarkup, WebAppInfo

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    # Create keyboard with Mini App button
    reply_keyboard = [
        [KeyboardButton("🎨 Mini App (Recommended)", 
                       web_app=WebAppInfo(url=MINI_APP_URL))],
        ["🆓 Free Plan", "💎 Paid Plan"]
    ]
    
    # Send welcome message with keyboard
    await update.message.reply_photo(
        photo=open(start_image_path, "rb"),
        caption="Welcome! Try our Mini App for the best experience!",
        reply_markup=ReplyKeyboardMarkup(reply_keyboard, 
                                        resize_keyboard=True)
    )
```

**Why KeyboardButton?**
- ✅ Creates persistent button in chat
- ✅ Supports `web_app` parameter to launch Mini App
- ✅ Better UX than InlineKeyboard for Mini Apps

---

## Deployment

### Development (Local Testing)

**Prerequisites:**
- Python 3.8+
- ngrok account (free tier works)
- Telegram Bot Token

**Setup:**

1. **Install Dependencies:**
```bash
pip install -r requirements.txt
```

2. **Start Flask API:**
```bash
source .venv/bin/activate
DEBUG=True python webapp_api.py
```

3. **Start ngrok:**
```bash
ngrok http 5000
```

4. **Update config with ngrok URL:**
```python
# bot/config.py
MINI_APP_URL = "https://your-ngrok-url.ngrok-free.app"
```

5. **Start Telegram Bot:**
```bash
python -m bot.telegram_bot
```

6. **Test in Telegram:**
- Open your bot
- Click "🎨 Mini App" button
- Upload photo
- Click story piece
- Should open story editor!

### Production Deployment

**Recommended Stack:**
- **Frontend**: Serve `webapp/` from CDN or static hosting
- **Backend**: Deploy Flask API to Heroku, Railway, or AWS
- **Storage**: Use S3, Cloudinary, or similar for images
- **Domain**: Get proper domain instead of ngrok

**Changes Needed:**

1. **Replace ngrok with real domain**
2. **Use cloud storage for uploads:**
```python
# Instead of local filesystem
import boto3
s3 = boto3.client('s3')
s3.upload_fileobj(image_file, 'bucket-name', filename)
public_url = f"https://bucket-name.s3.amazonaws.com/{filename}"
```

3. **Add file cleanup:**
```python
# Delete old files periodically
import glob
files = glob.glob('temp_uploads/*')
for f in files:
    if os.path.getmtime(f) < time.time() - 86400:  # 24 hours
        os.remove(f)
```

---

## Troubleshooting

### Issue: "shareToStory is not a function"
**Solution:** Update Telegram to version 7.8+

### Issue: Story spins but doesn't open
**Problem:** URL is invalid or inaccessible
**Solution:** 
- Verify URL is HTTPS
- Test URL in browser
- Check ngrok is running

### Issue: "[object Object]" in URL
**Problem:** Wrong parameter format
**Solution:** Use `shareToStory(url, options)` NOT `shareToStory({media_url: url})`

### Issue: Widget link not showing
**Possible Reasons:**
- User doesn't have Telegram Premium
- Platform limitation (test on different devices)
- URL format is incorrect (must be t.me link)

### Issue: Upload fails with 500 error
**Solution:** Check Flask logs, ensure `time` is imported

---

## Key Learnings

### What We Discovered:

1. **Two Parameter Format is Correct:**
   ```javascript
   // ✅ CORRECT
   tg.shareToStory(url_string, options_object)
   
   // ❌ WRONG (causes [object Object])
   tg.shareToStory({media_url: url_string, ...})
   ```

2. **Public URLs are Required:**
   - Base64 data URLs don't work
   - Must be accessible via HTTPS
   - Telegram servers fetch the image

3. **Widget Links are Powerful:**
   - Add clickable buttons to stories
   - Drive traffic to your bot
   - Premium feature in some versions

4. **Platform Differences:**
   - Desktop works (tdesktop)
   - Android works
   - iOS had historical issues (test thoroughly)

---

## Resources

- [Telegram Mini Apps Documentation](https://core.telegram.org/bots/webapps)
- [Bot API 7.8 Release Notes](https://core.telegram.org/bots/webapps#july-31-2024)
- [WebApp SDK](https://telegram.org/js/telegram-web-app.js)
- [GiftCatalog Example](https://github.com/example/giftcatalog) (study reference)

---

## Credits

Built with ❤️ using:
- Python + Flask for backend
- Vanilla JavaScript for frontend
- Telegram WebApp SDK
- PIL/Pillow for image processing
- ngrok for local testing

**Version:** 1.0.0  
**Last Updated:** October 11, 2025

---

## License

MIT License - Feel free to use and modify!




