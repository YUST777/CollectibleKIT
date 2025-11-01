# Telegram Story Sharing Implementation Guide

## 🎯 Key Learning from Research

After studying the [GiftCatalog Mini App](https://github.com/example/giftcatalog) and [Telegram's official documentation](https://core.telegram.org/bots/webapps), we discovered the **correct way** to implement story sharing in Telegram Mini Apps.

## ❌ What We Were Doing Wrong

### 1. Wrong Method: Using `sendData()`
```javascript
// ❌ WRONG - This is for KeyboardButton data transfer, not stories!
tg.sendData(JSON.stringify({
    type: 'story_piece',
    imageData: base64Image
}));
```

### 2. Wrong Parameter Format
```javascript
// ❌ WRONG - shareToStory doesn't take an object with media_url
tg.shareToStory({
    media_url: imageUrl,
    text: 'caption'
});
```

### 3. Wrong Media Type
```javascript
// ❌ WRONG - Base64 data URLs don't work!
const base64Url = 'data:image/png;base64,iVBORw0KG...';
tg.shareToStory(base64Url);
```

## ✅ Correct Implementation

### 1. Correct Method: Using `shareToStory()`
According to [Bot API 7.8+](https://core.telegram.org/bots/webapps#july-31-2024), the `shareToStory()` method was added specifically for sharing content to Telegram Stories.

### 2. Correct Parameter Format
```javascript
// ✅ CORRECT - mediaUrl is the FIRST parameter, params is SECOND
tg.shareToStory(mediaUrl, {
    text: 'Optional caption (up to 200 chars)',
    widget_link: {  // Optional, only for premium users
        url: 'https://t.me/YourBot',
        name: 'Button Text'
    }
});
```

### 3. Correct Media Type
```javascript
// ✅ CORRECT - Must be a publicly accessible HTTPS URL
const publicUrl = 'https://your-domain.com/images/story.jpg';
tg.shareToStory(publicUrl, { text: 'Check this out!' });
```

## 🔧 Our Implementation

### Step 1: Convert Base64 to Public URL
Since `shareToStory()` requires a public HTTPS URL (not base64), we:
1. Convert the base64 image to a Blob
2. Upload it to our Flask API
3. Get back a public ngrok URL
4. Use that URL with `shareToStory()`

```javascript
// Convert base64 to blob
const response = await fetch(imageDataUrl);
const blob = await response.blob();

// Upload to server
const formData = new FormData();
formData.append('image', blob, `story_piece_${pieceNumber}.png`);

const uploadResponse = await fetch('/api/upload-story-piece', {
    method: 'POST',
    body: formData
});

const { url } = await uploadResponse.json();

// Now share to story with public URL
tg.shareToStory(url, {
    text: `Story Piece ${pieceNumber}/12 🎨`,
    widget_link: {
        url: "https://t.me/TWETestBot",
        name: "Story Puzzle"
    }
});
```

### Step 2: Flask API Endpoint
We added two new endpoints to `webapp_api.py`:

1. **Upload Endpoint**: `/api/upload-story-piece`
   - Receives the image file
   - Saves it to `temp_uploads/` directory
   - Returns a public ngrok URL

2. **Serve Endpoint**: `/uploads/<filename>`
   - Serves the uploaded images
   - Makes them publicly accessible via ngrok

### Step 3: Version Check
```javascript
// Check if Telegram supports shareToStory (Bot API 7.8+)
if (!tg.isVersionAtLeast('7.8')) {
    tg.showAlert('Please update Telegram to share stories');
    return;
}
```

## 📝 Requirements

1. **Telegram Version**: Bot API 7.8+ (July 31, 2024)
2. **Media URL**: Must be HTTPS and publicly accessible
3. **Image Format**: PNG, JPG (recommended size: 1080×1920 for stories)
4. **Caption**: Up to 200 characters (2048 for premium users)
5. **Widget Link**: Optional, only visible for premium users

## 🎨 User Flow

1. User opens Mini App
2. User uploads photo
3. Backend cuts photo into 12 pieces
4. User clicks on a piece to share
5. **Mini App uploads piece to server → gets public URL**
6. **Mini App calls `shareToStory(publicUrl, params)`**
7. **Telegram opens native story editor with the image**
8. User can add stickers, text, etc., and post to their story

## 🔍 Debugging Tips

1. **Check Telegram Version**:
   ```javascript
   console.log('Telegram version:', tg.version);
   console.log('Supports 7.8+:', tg.isVersionAtLeast('7.8'));
   ```

2. **Verify Public URL**:
   ```bash
   curl https://ed0dcebbf091.ngrok-free.app/uploads/story_12345.png
   ```

3. **Test with Simple Example**:
   ```javascript
   // Test with a known public image
   tg.shareToStory('https://telegram.org/img/t_logo.png', {
       text: 'Test'
   });
   ```

## 📚 References

- [Telegram Mini Apps Documentation](https://core.telegram.org/bots/webapps)
- [Bot API 7.8 Release Notes](https://core.telegram.org/bots/webapps#july-31-2024)
- [GiftCatalog Mini App Example](https://github.com/example/giftcatalog) (study reference)

## 🚀 Next Steps

1. ✅ Implemented correct `shareToStory()` method
2. ✅ Added upload endpoint for public URLs
3. ✅ Added version checking
4. ⏳ Test with real Telegram client
5. ⏳ Add error handling for network failures
6. ⏳ Implement cleanup for old uploaded files
7. ⏳ Consider using cloud storage (S3, Cloudinary) for production

## 💡 Key Takeaway

**The most important lesson**: Always read the official documentation carefully! The `shareToStory()` method signature is:
```
shareToStory(media_url: string, params?: object)
```

NOT:
```
shareToStory({ media_url: string, ... })
```

This small detail makes all the difference! 🎯




