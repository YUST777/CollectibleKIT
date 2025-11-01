# 🔗 Widget Link Feature - Quick Guide

## What is a Widget Link?

A **widget link** is the clickable button that appears at the bottom of Telegram Stories. It's like a "Call to Action" button that viewers can tap.

## Visual Example

```
┌───────────────────────┐
│                       │
│   Your Story Image    │
│      (1080x1920)      │
│                       │
│                       │
│                       │
│                       │
│   ┌─────────────────┐ │
│   │ Story Puzzle → │ │  ← This is the widget link!
│   └─────────────────┘ │
└───────────────────────┘
```

## How to Add It

### The Code

```javascript
tg.shareToStory(imageUrl, {
    text: 'Check out my story!',  // Caption (optional)
    widget_link: {
        url: "https://t.me/YourBotUsername",  // Required
        name: "Open Bot"                       // Optional button text
    }
});
```

### Parameters Explained

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `imageUrl` | string | ✅ Yes | Public HTTPS URL to image | `"https://example.com/image.png"` |
| `text` | string | ❌ No | Story caption | `"Story Piece 1/12 🎨"` |
| `widget_link.url` | string | ✅ Yes | Telegram link to open | `"https://t.me/MyBot"` |
| `widget_link.name` | string | ❌ No | Button text | `"Open Bot"` |

### Valid URLs for widget_link

✅ **Allowed:**
- `https://t.me/BotUsername`
- `https://t.me/ChannelUsername`
- `https://t.me/UserUsername`
- `https://t.me/+InviteCode`

❌ **Not Allowed:**
- `https://google.com` (external websites)
- `http://t.me/Bot` (must be HTTPS)
- `t.me/Bot` (must include https://)

## Real-World Examples

### Example 1: Link to Your Bot

```javascript
tg.shareToStory('https://mycdn.com/story.png', {
    text: 'Made with Story Puzzle Cutter 🎨',
    widget_link: {
        url: "https://t.me/StoryPuzzleBot",
        name: "Try it yourself"
    }
});
```

Result: Button shows "Try it yourself →" and opens your bot.

### Example 2: Link to Your Channel

```javascript
tg.shareToStory('https://mycdn.com/artwork.png', {
    text: 'Check out my art channel!',
    widget_link: {
        url: "https://t.me/MyArtChannel",
        name: "Follow"
    }
});
```

Result: Button shows "Follow →" and opens your channel.

### Example 3: Invite Link

```javascript
tg.shareToStory('https://mycdn.com/promo.png', {
    text: 'Join our exclusive group!',
    widget_link: {
        url: "https://t.me/+AbCdEfGhIjKl",
        name: "Join Now"
    }
});
```

Result: Button shows "Join Now →" and opens invite link.

## Button Text Best Practices

### Good Button Texts ✅
- `"Try it"` - Short and clear
- `"Open Bot"` - Descriptive
- `"Join"` - Action-oriented
- `"Learn More"` - Inviting
- `"Get Started"` - Encouraging

### Bad Button Texts ❌
- `"Click here to open my awesome bot and get started with amazing features"` - Too long
- `"????"` - Confusing
- `"Link"` - Too generic
- Leave it empty - Let Telegram use bot name instead

### Tips:
- Keep it under 15 characters
- Use action words (Try, Open, Join, Start)
- Match your brand tone
- Test on real device to see how it looks

## Important Notes

### 1. Premium Users Only (Sometimes)

In some Telegram versions, widget links are only visible to Telegram Premium users. Regular users might not see the button.

**Solution:** Test with both premium and free accounts.

### 2. Platform Differences

- ✅ **Android**: Fully supported
- ✅ **iOS**: Supported (but test thoroughly)
- ✅ **Desktop**: Fully supported
- ⚠️ **Telegram Web**: Limited support

### 3. Story Visibility

Widget links appear on:
- Your story preview (when you're creating it)
- Viewer's screen (when they watch your story)
- Story archive (if saved)

They don't appear on:
- Story thumbnails
- Story lists
- Shared stories in chats

## Tracking Widget Link Clicks

Unfortunately, Telegram doesn't provide analytics for widget link clicks directly. 

**Workarounds:**

1. **Use Deep Links with Parameters:**
```javascript
widget_link: {
    url: "https://t.me/YourBot?start=story_campaign_1",
    name: "Open Bot"
}
```

Then in your bot:
```python
async def start(update, context):
    params = context.args[0] if context.args else None
    if params == "story_campaign_1":
        # Track this user came from story
        analytics.track_story_click(update.user.id)
```

2. **Use UTM Parameters (for channels):**
```javascript
widget_link: {
    url: "https://t.me/YourChannel?utm_source=story",
    name: "Follow"
}
```

## Common Issues & Solutions

### Issue: Button doesn't appear

**Possible Causes:**
1. User doesn't have Telegram Premium
2. Wrong URL format
3. Telegram version too old

**Solution:**
```javascript
// Test with simplest possible widget link
tg.shareToStory(imageUrl, {
    widget_link: {
        url: "https://t.me/durov"  // Test with known account
    }
});
```

### Issue: Button shows wrong text

**Cause:** The `name` parameter isn't being passed correctly.

**Solution:**
```javascript
// Make sure name is a string
widget_link: {
    url: "https://t.me/YourBot",
    name: "Open Bot"  // Must be string, not number or object
}
```

### Issue: Link doesn't open

**Cause:** Invalid URL format.

**Solution:**
```javascript
// Must be exactly this format
widget_link: {
    url: "https://t.me/Username"  // Not http, not without https://
}
```

## Testing Checklist

Before releasing your Mini App, test:

- [ ] Widget link appears on Android
- [ ] Widget link appears on iOS
- [ ] Widget link appears on Desktop
- [ ] Button text is correct
- [ ] Button opens correct destination
- [ ] Works with Premium account
- [ ] Works with Free account (might not show)
- [ ] URL is valid Telegram link
- [ ] Deep link parameters work (if using)

## Code Template

Here's a ready-to-use template:

```javascript
async function shareStoryWithWidget(imageUrl, pieceNumber) {
    // Check if shareToStory is available
    if (!window.Telegram?.WebApp?.shareToStory) {
        alert('Feature not available. Update Telegram.');
        return;
    }
    
    const tg = window.Telegram.WebApp;
    
    // Customize these values
    const botUsername = "YourBotUsername";  // Change this
    const buttonText = "Try it yourself";   // Change this
    const caption = `Story Piece ${pieceNumber}/12`;
    
    try {
        tg.shareToStory(imageUrl, {
            text: caption,
            widget_link: {
                url: `https://t.me/${botUsername}`,
                name: buttonText
            }
        });
        
        console.log('✅ Story shared with widget link');
    } catch (error) {
        console.error('❌ Error sharing story:', error);
        alert('Failed to share story: ' + error.message);
    }
}

// Usage
shareStoryWithWidget('https://example.com/image.png', 1);
```

## Analytics & Monitoring

### Track Widget Link Performance

1. **Monitor Bot Start Commands:**
```python
# Count how many users start your bot from stories
story_clicks = 0

async def start(update, context):
    global story_clicks
    if context.args and 'story' in context.args[0]:
        story_clicks += 1
        await update.message.reply_text(
            f"👋 Welcome from our story! You're visitor #{story_clicks}"
        )
```

2. **Create Unique Campaigns:**
```javascript
// Different campaigns for different stories
widget_link: {
    url: `https://t.me/YourBot?start=story_${Date.now()}`,
    name: "Open Bot"
}
```

3. **Log Analytics:**
```python
# In your bot
import logging

async def track_story_referral(user_id, campaign):
    logging.info(f"Story referral: user={user_id}, campaign={campaign}")
    # Save to database
    db.save_referral(user_id, 'story', campaign)
```

## Advanced: Dynamic Button Text

Change button text based on context:

```javascript
function getWidgetLinkText(pieceNumber) {
    if (pieceNumber === 1) {
        return "Start Here";
    } else if (pieceNumber === 12) {
        return "Complete Puzzle";
    } else {
        return "Continue";
    }
}

tg.shareToStory(imageUrl, {
    widget_link: {
        url: "https://t.me/YourBot",
        name: getWidgetLinkText(pieceNumber)
    }
});
```

## Resources

- [Telegram Bot API Documentation](https://core.telegram.org/bots/api)
- [WebApp Methods](https://core.telegram.org/bots/webapps#methods)
- [Deep Linking Guide](https://core.telegram.org/bots/features#deep-linking)

---

**Last Updated:** October 11, 2025  
**Version:** 1.0.0

Happy story sharing! 🎨✨




