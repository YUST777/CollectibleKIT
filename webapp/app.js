// Telegram WebApp instance
const tg = window.Telegram.WebApp;

// User info
let currentUser = null;
let userInfo = null;

// TON Connect
let tonConnectUI = null;
const PREMIUM_WALLET_ADDRESS = 'UQCFRqB2vZnGZRh3ZoZAItNidk8zpkN0uRHlhzrnwweU3mos';
const PREMIUM_PRICE_TON = '1000000000'; // 1 TON in nanoTON

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Expand the WebApp to full height
    tg.expand();
    
    // Apply Telegram theme
    applyTelegramTheme();
    
    // Enable closing confirmation
    tg.enableClosingConfirmation();
    
    // Set up file input
    setupFileInput();
    
    // Show main button when needed
    tg.MainButton.hide();
    
    // Show loading screen
    showLoadingScreen();
    
    // Initialize TON Connect
    initTonConnect();
    
    console.log('Story Puzzle Cutter Mini App initialized');
    console.log('Telegram WebApp version:', tg.version);
    console.log('Platform:', tg.platform);
    console.log('User:', tg.initDataUnsafe.user);
    
    // Authenticate user
    authenticateUser();
}

function applyTelegramTheme() {
    // Get theme from Telegram
    const theme = tg.themeParams;
    
    if (theme) {
        // Apply theme colors to CSS variables
        const root = document.documentElement;
        
        if (theme.bg_color) root.style.setProperty('--tg-theme-bg-color', theme.bg_color);
        if (theme.text_color) root.style.setProperty('--tg-theme-text-color', theme.text_color);
        if (theme.hint_color) root.style.setProperty('--tg-theme-hint-color', theme.hint_color);
        if (theme.link_color) root.style.setProperty('--tg-theme-link-color', theme.link_color);
        if (theme.button_color) root.style.setProperty('--tg-theme-button-color', theme.button_color);
        if (theme.button_text_color) root.style.setProperty('--tg-theme-button-text-color', theme.button_text_color);
        if (theme.secondary_bg_color) root.style.setProperty('--tg-theme-secondary-bg-color', theme.secondary_bg_color);
        if (theme.header_bg_color) root.style.setProperty('--tg-theme-header-bg-color', theme.header_bg_color);
        if (theme.accent_text_color) root.style.setProperty('--tg-theme-accent-text-color', theme.accent_text_color);
        if (theme.section_bg_color) root.style.setProperty('--tg-theme-section-bg-color', theme.section_bg_color);
        if (theme.section_header_text_color) root.style.setProperty('--tg-theme-section-header-text-color', theme.section_header_text_color);
        if (theme.subtitle_text_color) root.style.setProperty('--tg-theme-subtitle-text-color', theme.subtitle_text_color);
        if (theme.destructive_text_color) root.style.setProperty('--tg-theme-destructive-text-color', theme.destructive_text_color);
    }
}

function setupFileInput() {
    const fileInput = document.getElementById('file-input');
    const uploadArea = document.getElementById('upload-area');
    
    // File input change
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    uploadArea.addEventListener('click', () => fileInput.click());
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

function handleFile(file) {
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showError('Please select a valid image file');
        return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        showError('Image size must be less than 10MB');
        return;
    }
    
    // Show preview
    showPreview(file);
}

function showPreview(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const previewImage = document.getElementById('preview-image');
        previewImage.src = e.target.result;
        
        // Show preview section
        document.getElementById('preview-section').style.display = 'block';
        document.getElementById('upload-area').style.display = 'none';
    };
    reader.readAsDataURL(file);
}

function resetUpload() {
    document.getElementById('upload-section').classList.add('active');
    document.getElementById('preview-section').style.display = 'none';
    document.getElementById('upload-area').style.display = 'block';
    document.getElementById('file-input').value = '';
}

function processImage() {
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];
    
    if (!file) {
        showError('No image selected');
        return;
    }
    
    // Show processing section
    showSection('processing-section');
    
    // Send image to Python backend for processing
    const formData = new FormData();
    formData.append('image', file);
    formData.append('user_id', tg.initDataUnsafe.user?.id || 'unknown');
    
    // Add custom watermark if enabled (premium/VIP only)
    const watermarkToggle = document.getElementById('watermark-toggle');
    const watermarkText = document.getElementById('watermark-text');
    if (watermarkToggle && watermarkToggle.checked && watermarkText && watermarkText.value.trim()) {
        formData.append('custom_watermark', watermarkText.value.trim());
    }
    
    console.log('Sending request to:', `${window.location.origin}/api/process-image`);
    console.log('User ID:', tg.initDataUnsafe.user?.id);
    
    fetch(`${window.location.origin}/api/process-image`, {
        method: 'POST',
        body: formData
    })
    .then(response => {
        console.log('Response status:', response.status);
        console.log('Response OK:', response.ok);
        return response.json();
    })
    .then(data => {
        console.log('Response data:', data);
        if (data.success) {
            // Update user info with latest data
            if (data.user_type) {
                userInfo = {
                    ...userInfo,
                    user_type: data.user_type,
                    watermark: data.watermark,
                    credits_remaining: data.credits_remaining,
                    free_remaining: data.free_remaining
                };
                updateUIForUserType();
            }
            
            showResults(data.story_pieces);
            
            // Show user status message
            let statusMessage = '';
            if (data.user_type === 'vip' || data.user_type === 'test') {
                statusMessage = '👑 VIP processing complete!';
            } else if (data.user_type === 'premium') {
                statusMessage = `💎 Premium processing complete! ${data.credits_remaining} credits remaining.`;
            } else {
                statusMessage = `🆓 Free processing complete! ${data.free_remaining} free uses remaining.`;
            }
            
            if (data.watermark) {
                statusMessage += '\n📝 Images include watermark.';
            }
            
            setTimeout(() => {
                tg.showAlert(statusMessage);
            }, 1000);
            
        } else {
            // Handle user permission errors
            if (data.user_type) {
                userInfo = {
                    ...userInfo,
                    user_type: data.user_type,
                    credits_remaining: data.credits_remaining,
                    free_remaining: data.free_remaining
                };
                updateUIForUserType();
            }
            showError(data.error || 'Failed to process image');
        }
    })
    .catch(error => {
        console.error('❌ Network Error:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        let errorMessage = 'Network error. Please check your connection.';
        
        if (error.message.includes('Failed to fetch')) {
            errorMessage = '🔌 Connection failed. Please check:\n\n1. Internet connection\n2. Server is running\n3. ngrok tunnel is active';
        } else if (error.message.includes('NetworkError')) {
            errorMessage = '🌐 Network error. Server might be down.';
        }
        
        showError(errorMessage);
        tg.showAlert(errorMessage);
    });
}

function showResults(storyPieces) {
    showSection('results-section');
    
    const storyGrid = document.getElementById('story-grid');
    storyGrid.innerHTML = '';
    
    // Create story pieces (12 pieces in 4x3 grid)
    for (let i = 0; i < 12; i++) {
        const pieceDiv = document.createElement('div');
        pieceDiv.className = 'story-piece';
        pieceDiv.dataset.pieceNumber = i + 1;
        
        const img = document.createElement('img');
        img.src = storyPieces[i];
        img.alt = `Story piece ${i + 1}`;
        
        const numberDiv = document.createElement('div');
        numberDiv.className = 'story-number';
        numberDiv.textContent = 12 - i; // Show decreasing numbers (12, 11, 10, ...)
        
        pieceDiv.appendChild(img);
        pieceDiv.appendChild(numberDiv);
        
        // Add click handler for sending story
        pieceDiv.addEventListener('click', () => sendStoryPiece(storyPieces[i], 12 - i));
        
        storyGrid.appendChild(pieceDiv);
    }
}

async function sendStoryPiece(imageDataUrl, pieceNumber) {
    try {
        console.log('=== STORY SHARE DEBUG ===');
        console.log(`Attempting to share story piece ${pieceNumber}`);
        console.log('Telegram WebApp available:', Boolean(tg));
        console.log('Telegram WebApp object:', tg);
        console.log('Telegram version:', tg.version);
        console.log('Telegram platform:', tg.platform);
        console.log('shareToStory method type:', typeof tg.shareToStory);
        console.log('shareToStory method available:', Boolean(tg && tg.shareToStory));
        console.log('isVersionAtLeast available:', Boolean(tg.isVersionAtLeast));
        
        // Check if Telegram version supports shareToStory (Bot API 7.8+)
        if (tg.isVersionAtLeast && !tg.isVersionAtLeast('7.8')) {
            tg.showAlert('❌ Your Telegram app does not support sharing to stories. Please update Telegram to version 7.8+');
            console.log('Telegram version too old for shareToStory');
            return;
        }
        
        // Check if shareToStory method is available
        if (!tg || !tg.shareToStory) {
            tg.showAlert('❌ shareToStory method not available. Platform: ' + tg.platform);
            console.log('shareToStory method not found on WebApp object');
            return;
        }
        
        console.log('All checks passed, proceeding with share...');
        
        // First, we need to upload the base64 image to get a public URL
        // Convert base64 to blob
        const response = await fetch(imageDataUrl);
        const blob = await response.blob();
        
        // Upload to our server to get a public URL
        const formData = new FormData();
        formData.append('image', blob, `story_piece_${pieceNumber}.png`);
        formData.append('userId', tg.initDataUnsafe?.user?.id || 'unknown');
        
        console.log('Uploading image to server...');
        const uploadResponse = await fetch('/api/upload-story-piece', {
            method: 'POST',
            body: formData
        });
        
        console.log('Upload response status:', uploadResponse.status);
        
        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('Upload failed:', errorText);
            throw new Error('Failed to upload image: ' + errorText);
        }
        
        const uploadData = await uploadResponse.json();
        console.log('Upload response:', uploadData);
        const publicUrl = uploadData.url;
        
        console.log('Public URL for story:', publicUrl);
        
        // CORRECT FORMAT: shareToStory(media_url, options)
        // media_url is the FIRST parameter as a STRING, not inside an object!
        console.log('Calling shareToStory with correct format...');
        console.log('Media URL:', publicUrl);
        console.log('Type of media URL:', typeof publicUrl);
        
        tg.shareToStory(publicUrl, {
            text: 'Made using @CanvasStorybot'
        });
        console.log('shareToStory called successfully');
        
        // Mark piece as sent
        const pieceElement = document.querySelector(`[data-piece-number="${13 - pieceNumber}"]`);
        if (pieceElement) {
            pieceElement.classList.add('sent');
        }
        
        // Show haptic feedback
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('medium');
        }
        
        console.log(`Successfully initiated story share for piece ${pieceNumber}`);
        
    } catch (error) {
        console.error('Error sharing story piece:', error);
        tg.showAlert('❌ Failed to share story piece: ' + error.message);
    }
}

function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show target section
    document.getElementById(sectionId).classList.add('active');
}

function showError(message) {
    document.getElementById('error-message').textContent = message;
    showSection('error-section');
}

function resetApp() {
    showSection('upload-section');
    resetUpload();
}

// Handle back button
tg.BackButton.onClick(() => {
    if (document.getElementById('results-section').classList.contains('active')) {
        showSection('upload-section');
        resetUpload();
    } else if (document.getElementById('error-section').classList.contains('active')) {
        showSection('upload-section');
        resetUpload();
    } else {
        tg.close();
    }
});

// Show back button when needed
document.addEventListener('sectionChanged', function() {
    const activeSection = document.querySelector('.section.active');
    if (activeSection && ['results-section', 'error-section'].includes(activeSection.id)) {
        tg.BackButton.show();
    } else {
        tg.BackButton.hide();
    }
});

// Override showSection to trigger event
const originalShowSection = showSection;
showSection = function(sectionId) {
    originalShowSection(sectionId);
    document.dispatchEvent(new Event('sectionChanged'));
};

// Test function to verify shareToStory works with a known-good URL
function testShareToStory() {
    console.log('=== TEST SHARE TO STORY ===');
    console.log('Telegram WebApp:', tg);
    console.log('Version:', tg.version);
    console.log('Platform:', tg.platform);
    console.log('shareToStory exists:', Boolean(tg.shareToStory));
    console.log('shareToStory type:', typeof tg.shareToStory);
    
    if (!tg.shareToStory) {
        tg.showAlert('shareToStory not available! Platform: ' + tg.platform + ', Version: ' + tg.version);
        return;
    }
    
    // Test with Telegram's own logo (known good URL)
    const testUrl = 'https://telegram.org/img/t_logo.png';
    console.log('Testing with URL:', testUrl);
    console.log('URL type:', typeof testUrl);
    
    try {
        // Try the two-parameter format first
        console.log('Trying two-parameter format: shareToStory(url, options)');
        tg.shareToStory(testUrl, {
            text: 'Made using @CanvasStorybot'
        });
        console.log('shareToStory called successfully');
    } catch (error) {
        console.error('Error calling shareToStory:', error);
        tg.showAlert('Error: ' + error.message);
    }
}

// Make it available globally for testing
window.testShareToStory = testShareToStory;

// TON Connect Integration
function initTonConnect() {
    try {
        // Initialize TON Connect UI
        tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
            manifestUrl: `${window.location.origin}/tonconnect-manifest.json`,
            buttonRootId: 'ton-connect-button'
        });
        
        console.log('TON Connect UI initialized');
        
        // Listen for connection status changes
        tonConnectUI.onStatusChange(wallet => {
            if (wallet) {
                console.log('Wallet connected:', wallet);
                // Show payment button when wallet is connected
                document.getElementById('pay-premium-btn').style.display = 'block';
            } else {
                console.log('Wallet disconnected');
                document.getElementById('pay-premium-btn').style.display = 'none';
            }
        });
        
    } catch (error) {
        console.error('Error initializing TON Connect:', error);
    }
}

// Premium Modal Functions
function showPremiumModal() {
    const modal = document.getElementById('premium-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closePremiumModal() {
    const modal = document.getElementById('premium-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Make functions globally available
window.showPremiumModal = showPremiumModal;
window.closePremiumModal = closePremiumModal;

// Premium Payment Function
async function payPremium() {
    try {
        if (!tonConnectUI || !tonConnectUI.connected) {
            tg.showAlert('Please connect your wallet first');
            return;
        }
        
        console.log('Initiating premium payment...');
        console.log('User ID:', currentUser?.id);
        console.log('Wallet address:', PREMIUM_WALLET_ADDRESS);
        console.log('Amount:', PREMIUM_PRICE_TON, 'nanoTON (1 TON)');
        
        // Create transaction (no payload for simple transfer)
        const transaction = {
            validUntil: Math.floor(Date.now() / 1000) + 600, // Valid for 10 minutes
            messages: [
                {
                    address: PREMIUM_WALLET_ADDRESS,
                    amount: PREMIUM_PRICE_TON
                }
            ]
        };
        
        console.log('Transaction object:', JSON.stringify(transaction, null, 2));
        
        // Send transaction
        const result = await tonConnectUI.sendTransaction(transaction);
        console.log('Transaction sent:', result);
        
        // Show success message
        tg.showAlert('💎 Payment sent! Your premium subscription will be activated shortly.');
        
        // Verify payment on backend
        setTimeout(async () => {
            await verifyPremiumPayment(result);
        }, 2000);
        
        closePremiumModal();
        
    } catch (error) {
        console.error('Payment error:', error);
        
        if (error.message.includes('rejected')) {
            tg.showAlert('❌ Payment cancelled by user');
        } else {
            tg.showAlert('❌ Payment failed: ' + error.message);
        }
    }
}

// Make payment function globally available
window.payPremium = payPremium;

// Verify Premium Payment on Backend
async function verifyPremiumPayment(transactionResult) {
    try {
        const response = await fetch('/api/verify-premium-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: currentUser?.id,
                transaction: transactionResult,
                wallet_address: tonConnectUI.wallet?.account?.address
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Payment verification:', data);
        
        if (data.success) {
            // Refresh user info
            await authenticateUser();
            tg.showAlert('✅ Premium activated! You now have 10 stories per day with no watermarks!');
        } else {
            tg.showAlert('⚠️ Payment verification pending. Please check back in a few minutes.');
        }
        
    } catch (error) {
        console.error('Error verifying payment:', error);
        // Don't show error to user as payment might still be processing
    }
}

// User Authentication Functions
async function authenticateUser() {
    try {
        currentUser = tg.initDataUnsafe?.user;
        if (!currentUser) {
            console.error('No user data available');
            return;
        }
        
        console.log('Authenticating user:', currentUser.id);
        
        const response = await fetch('/api/user-info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: currentUser.id
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        userInfo = await response.json();
        console.log('User info received:', userInfo);
        
        // Update UI based on user type
        updateUIForUserType();
        
    } catch (error) {
        console.error('Error authenticating user:', error);
        // Fallback to normal user
        userInfo = {
            user_type: 'normal',
            can_process: false,
            watermark: true,
            credits_remaining: 0,
            free_remaining: '0/3'
        };
    }
}

function updateUIForUserType() {
    if (!userInfo) return;
    
    // Update header with user type
    const header = document.querySelector('.header h1');
    if (header && userInfo.user_type !== 'normal') {
        const typeEmoji = {
            'vip': '👑',
            'test': '🧪',
            'premium': '💎'
        };
        const emoji = typeEmoji[userInfo.user_type] || '';
        header.innerHTML = `${emoji} Story Puzzle Cutter`;
    }
    
    // Update upload section with user info
    const uploadContent = document.querySelector('.upload-content h3');
    if (uploadContent) {
        uploadContent.innerHTML = 'Upload Your Photo';
    }
    
    // Show watermark settings for premium/VIP users
    const watermarkSettings = document.getElementById('watermark-settings');
    if (watermarkSettings) {
        if (userInfo.user_type === 'premium' || userInfo.user_type === 'vip' || userInfo.user_type === 'test') {
            watermarkSettings.style.display = 'block';
        } else {
            watermarkSettings.style.display = 'none';
        }
    }
}

// Loading Screen Functions
async function showLoadingScreen() {
    try {
        // Load the Lottie animation
        const response = await fetch('./coding_duck.json');
        const animationData = await response.json();
        
        // Initialize Lottie animation
        if (typeof lottie !== 'undefined') {
            lottie.loadAnimation({
                container: document.getElementById('loading-animation'),
                renderer: 'svg',
                loop: true,
                autoplay: true,
                animationData: animationData
            });
        } else {
            // Fallback if Lottie is not loaded
            document.getElementById('loading-animation').innerHTML = '🎨';
        }
        
        // Hide loading screen after 3 seconds
        setTimeout(() => {
            hideLoadingScreen();
        }, 3000);
        
    } catch (error) {
        console.error('Error loading animation:', error);
        // Fallback animation
        document.getElementById('loading-animation').innerHTML = '🎨';
        
        setTimeout(() => {
            hideLoadingScreen();
        }, 2000);
    }
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const app = document.getElementById('app');
    
    // Add fade out class
    loadingScreen.classList.add('fade-out');
    
    // Show app and remove loading screen after transition
    setTimeout(() => {
        app.classList.add('loaded');
        loadingScreen.style.display = 'none';
    }, 700);
}

// ==============================
// Tab Navigation System
// ==============================

function switchTab(tabName) {
    console.log('Switching to tab:', tabName);
    
    // Hide all tab panels
    const panels = document.querySelectorAll('.tab-panel');
    panels.forEach(panel => panel.classList.remove('active'));
    
    // Show selected tab panel
    const selectedPanel = document.getElementById(`${tabName}-tab`);
    if (selectedPanel) {
        selectedPanel.classList.add('active');
    }
    
    // Update nav buttons
    const buttons = document.querySelectorAll('.nav-button');
    buttons.forEach(button => {
        if (button.getAttribute('data-tab') === tabName) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
    
    // Update header based on tab
    const headerTitle = document.getElementById('header-title');
    const headerSubtitle = document.getElementById('header-subtitle');
    
    if (tabName === 'story') {
        headerTitle.textContent = '🎨 Story Puzzle Cutter';
        headerSubtitle.textContent = 'Transform your photos into puzzle stories!';
            } else if (tabName === 'tasks') {
                headerTitle.textContent = '';
                headerSubtitle.textContent = '';
            } else if (tabName === 'profile') {
                headerTitle.textContent = '';
                headerSubtitle.textContent = '';
        updateProfileTab();
    }
    
    // Haptic feedback
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
}

// Make switchTab globally available
window.switchTab = switchTab;

// ==============================
// Promotion Story Sharing
// ==============================

async function sharePromotionStory() {
    console.log('=== PROMOTION STORY SHARE DEBUG ===');
    console.log('Attempting to share promotion story...');
    
    try {
        const tg = window.Telegram.WebApp;
        
        // Check if shareToStory is available
        if (!tg || !tg.shareToStory) {
            console.error('shareToStory not available');
            tg.showAlert('Feature not available. Please update Telegram.');
            return;
        }
        
        // Get the video URL (served from Flask API)
        const videoUrl = `${window.location.origin}/assets/task.mp4`;
        
        console.log('Video URL:', videoUrl);
        console.log('Bot URL: https://t.me/CanvasStoryBot');
        console.log('Button text: Try it now');
        
        // Share the promotion video with widget link
        tg.shareToStory(videoUrl, {
            text: 'Make your profile great again 🔥',
            widget_link: {
                url: 'https://t.me/CanvasStoryBot',
                name: 'Try it now'
            }
        });
        
        console.log('✅ Promotion story shared successfully!');
        
        // Give haptic feedback
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('medium');
        }
        
        // Show success message
        tg.showAlert('🎉 Promotion story shared! Thank you for helping us grow!');
        
        // TODO: Track this task completion in backend
        // await trackTaskCompletion('promotion_story');
        
    } catch (error) {
        console.error('❌ Error sharing promotion story:', error);
        tg.showAlert('❌ Failed to share promotion story: ' + error.message);
    }
}

// Make sharePromotionStory globally available
window.sharePromotionStory = sharePromotionStory;

// ==============================
// Watermark Settings Functions
// ==============================

function toggleWatermark() {
    const watermarkToggle = document.getElementById('watermark-toggle');
    const watermarkInputContainer = document.getElementById('watermark-input-container');
    
    if (watermarkToggle && watermarkInputContainer) {
        if (watermarkToggle.checked) {
            watermarkInputContainer.style.display = 'block';
            // Give haptic feedback
            if (tg.HapticFeedback) {
                tg.HapticFeedback.impactOccurred('light');
            }
        } else {
            watermarkInputContainer.style.display = 'none';
            // Clear the input
            const watermarkText = document.getElementById('watermark-text');
            if (watermarkText) {
                watermarkText.value = '';
            }
        }
    }
}

// Make toggleWatermark globally available
window.toggleWatermark = toggleWatermark;

// Update profile tab with user data
function updateProfileTab() {
    if (!currentUser || !userInfo) return;
    
    // Update profile info
    const profileName = document.getElementById('profile-name');
    const profileUsername = document.getElementById('profile-username');
    const profileInitial = document.getElementById('profile-initial');
    const profileTypeBadge = document.getElementById('profile-type-badge');
    
    if (profileName && currentUser.first_name) {
        profileName.textContent = currentUser.first_name + (currentUser.last_name ? ' ' + currentUser.last_name : '');
    }
    
    if (profileUsername && currentUser.username) {
        profileUsername.textContent = '@' + currentUser.username;
    }
    
    if (profileInitial && currentUser.first_name) {
        profileInitial.textContent = currentUser.first_name.charAt(0).toUpperCase();
    }
    
    // Update user type badge
    if (profileTypeBadge) {
        const typeLabels = {
            'vip': '👑 VIP',
            'test': '🧪 TEST',
            'premium': '💎 PREMIUM',
            'normal': '🆓 FREE'
        };
        
        profileTypeBadge.textContent = typeLabels[userInfo.user_type] || '🆓 FREE';
        profileTypeBadge.className = `user-type-badge ${userInfo.user_type}`;
    }
    
    // Update stats
    const statCredits = document.getElementById('stat-credits');
    const statFree = document.getElementById('stat-free');
    
    if (statCredits) {
        if (userInfo.user_type === 'vip' || userInfo.user_type === 'test') {
            statCredits.textContent = '∞';
        } else {
            statCredits.textContent = userInfo.credits_remaining || 0;
        }
    }
    
    if (statFree) {
        if (userInfo.user_type === 'vip' || userInfo.user_type === 'test') {
            statFree.textContent = '∞';
        } else {
            const free = userInfo.free_remaining ? userInfo.free_remaining.split('/')[0] : '0';
            statFree.textContent = free;
        }
    }
    
    // Update subscription info
    const subscriptionStatus = document.getElementById('subscription-status');
    const subscriptionInfo = document.getElementById('subscription-info');
    
    if (subscriptionStatus && subscriptionInfo) {
        if (userInfo.user_type === 'vip') {
            subscriptionInfo.innerHTML = `
                <div class="subscription-plan">
                    <div class="plan-icon">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clip-rule="evenodd" />
                        </svg>
                    </div>
                    <div class="plan-details">
                        <p class="plan-name">VIP Plan</p>
                        <p class="plan-features">Unlimited • No watermarks</p>
                    </div>
                </div>
            `;
        } else if (userInfo.user_type === 'test') {
            subscriptionInfo.innerHTML = `
                <div class="subscription-plan">
                    <div class="plan-icon">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                            <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z" />
                        </svg>
                    </div>
                    <div class="plan-details">
                        <p class="plan-name">Test User</p>
                        <p class="plan-features">Unlimited • Testing</p>
                    </div>
                </div>
            `;
        } else if (userInfo.user_type === 'premium') {
            subscriptionInfo.innerHTML = `
                <div class="subscription-plan">
                    <div class="plan-icon">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clip-rule="evenodd" />
                        </svg>
                    </div>
                    <div class="plan-details">
                        <p class="plan-name">Premium</p>
                        <p class="plan-features">${userInfo.credits_remaining} credits • No watermarks</p>
                    </div>
                </div>
                <button class="btn-upgrade" onclick="showPremiumModal()">
                    <svg class="btn-icon" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clip-rule="evenodd" />
                    </svg>
                    Extend
                </button>
            `;
        } else {
            subscriptionInfo.innerHTML = `
                <div class="subscription-plan">
                    <div class="plan-icon">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
                        </svg>
                    </div>
                    <div class="plan-details">
                        <p class="plan-name">Free Plan</p>
                        <p class="plan-features">${userInfo.free_remaining} • With watermark</p>
                    </div>
                </div>
                <button class="btn-upgrade" onclick="showPremiumModal()">
                    <svg class="btn-icon" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clip-rule="evenodd" />
                    </svg>
                    Upgrade
                </button>
            `;
        }
    }
}
