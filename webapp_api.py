#!/usr/bin/env python3
"""
Flask API server for Telegram Mini App
Handles image processing using existing bot logic
"""

import os
import sys
import base64
import json
import time
from io import BytesIO
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from PIL import Image
import logging

# Add bot directory to path to import existing modules
sys.path.append(os.path.join(os.path.dirname(__file__), 'bot'))

from processing import cut_into_4x3_and_prepare_story_pieces
from database import BotDatabase

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = 'temp_uploads'
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

# Create upload folder if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# VIP users with infinite uses (no watermark, no credit consumption)
VIP_USERS = {
    7416916695,
    6386563662,
    6841385539,
    7476391409,
    1251203296,
    178956025,
    1845807623,
    6063450915,
    1796229441,
    1109811477,
    879660478,
    1979991371,
    800092886,
}

# Test users (same as VIP but for testing)
TEST_USERS = {
    800092886,  # Your user ID for testing
}

# Free trial limit
FREE_LIMIT = 3
WATERMARK_TEXT = "@CanvasStorybot"

# Initialize database
db = BotDatabase()

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def _is_vip_user(user_id: int) -> bool:
    """Check if user has infinite uses"""
    return user_id in VIP_USERS

def _is_test_user(user_id: int) -> bool:
    """Check if user is a test user"""
    return user_id in TEST_USERS

def get_user_type(user_id: int) -> str:
    """Get user type: 'vip', 'test', 'premium', or 'normal'"""
    if _is_vip_user(user_id):
        return 'vip'
    elif _is_test_user(user_id):
        return 'test'
    else:
        user = db.get_user(user_id)
        if user['credits'] > 0:
            return 'premium'
        else:
            return 'normal'

def can_user_process(user_id: int) -> dict:
    """Check if user can process an image and return user info"""
    user = db.get_user(user_id)
    user_type = get_user_type(user_id)
    
    if _is_vip_user(user_id) or _is_test_user(user_id):
        return {
            'can_process': True,
            'user_type': user_type,
            'watermark': False,
            'credits_remaining': 'unlimited',
            'free_remaining': 'unlimited'
        }
    elif user['credits'] > 0:
        return {
            'can_process': True,
            'user_type': user_type,
            'watermark': False,
            'credits_remaining': user['credits'],
            'free_remaining': f"{FREE_LIMIT - user['free_uses']}/{FREE_LIMIT}"
        }
    elif user['free_uses'] < FREE_LIMIT:
        return {
            'can_process': True,
            'user_type': user_type,
            'watermark': True,
            'credits_remaining': 0,
            'free_remaining': f"{FREE_LIMIT - user['free_uses']}/{FREE_LIMIT}"
        }
    else:
        return {
            'can_process': False,
            'user_type': user_type,
            'watermark': True,
            'credits_remaining': 0,
            'free_remaining': '0/3',
            'message': 'No credits or free uses remaining. Please purchase credits to continue.'
        }

@app.route('/')
def serve_index():
    """Serve the Mini App"""
    return send_from_directory('webapp', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    """Serve static files"""
    return send_from_directory('webapp', filename)

@app.route('/assets/<filename>')
def serve_asset(filename):
    """Serve static assets like videos"""
    assets_dir = os.path.join(os.path.dirname(__file__), "webapp", "assets")
    return send_from_directory(assets_dir, filename)

@app.route('/api/process-image', methods=['POST'])
def process_image():
    """Process uploaded image and return story pieces"""
    try:
        # Check if file is present
        if 'image' not in request.files:
            return jsonify({'success': False, 'error': 'No image file provided'}), 400
        
        file = request.files['image']
        user_id_str = request.form.get('user_id', 'unknown')
        custom_watermark = request.form.get('custom_watermark', None)  # Get custom watermark
        
        # Check if file is selected
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'}), 400
        
        # Validate and convert user_id
        try:
            user_id = int(user_id_str) if user_id_str != 'unknown' else 0
        except ValueError:
            return jsonify({'success': False, 'error': 'Invalid user ID'}), 400
        
        # Check user permissions
        user_permissions = can_user_process(user_id)
        if not user_permissions['can_process']:
            return jsonify({
                'success': False, 
                'error': user_permissions.get('message', 'Cannot process image'),
                'user_type': user_permissions['user_type'],
                'credits_remaining': user_permissions['credits_remaining'],
                'free_remaining': user_permissions['free_remaining']
            }), 403
        
        # Validate file
        if not allowed_file(file.filename):
            return jsonify({'success': False, 'error': 'Invalid file type. Please upload PNG, JPG, JPEG, GIF, or WebP'}), 400
        
        # Check file size
        file.seek(0, 2)  # Seek to end
        file_size = file.tell()
        file.seek(0)  # Reset position
        
        if file_size > MAX_FILE_SIZE:
            return jsonify({'success': False, 'error': 'File too large. Maximum size is 10MB'}), 400
        
        logger.info(f"Processing image for user {user_id}: {file.filename} ({file_size} bytes)")
        
        # Read and process image
        try:
            # Open image
            image = Image.open(file)
            image = image.convert('RGB')  # Ensure RGB mode
            
            logger.info(f"Image loaded: {image.size}")
            
            # Determine watermark text based on user type and custom watermark
            if custom_watermark and (user_permissions['user_type'] in ['premium', 'vip', 'test']):
                # Premium/VIP users can use custom watermark
                watermark_text = custom_watermark
                logger.info(f"Using custom watermark for user {user_id}: {custom_watermark}")
            elif user_permissions['watermark']:
                # Normal users get default watermark
                watermark_text = WATERMARK_TEXT
            else:
                # No watermark (premium without custom text)
                watermark_text = None
            
            # Process image using existing bot logic
            story_images = cut_into_4x3_and_prepare_story_pieces(image, watermark_text=watermark_text)
            
            # Consume credit or free use
            credits_used = 0
            if _is_vip_user(user_id) or _is_test_user(user_id):
                # VIP/Test users - no consumption
                db.record_interaction(user_id, "vip_processing", json.dumps({
                    "image_size": image.size,
                    "watermarked": watermark_text is not None
                }))
            elif user_permissions['user_type'] == 'premium':
                # Premium user - consume credit
                if db.consume_credit(user_id):
                    credits_used = 1
                    user = db.get_user(user_id)  # Refresh user data
                    db.record_interaction(user_id, "paid_processing", json.dumps({
                        "image_size": image.size,
                        "credits_remaining": user['credits']
                    }))
                else:
                    return jsonify({'success': False, 'error': 'Failed to consume credit'}), 500
            else:
                # Normal user - use free cut
                if db.use_free_cut(user_id):
                    user = db.get_user(user_id)  # Refresh user data
                    remaining = FREE_LIMIT - user['free_uses']
                    db.record_interaction(user_id, "free_processing", json.dumps({
                        "image_size": image.size,
                        "remaining_free": remaining,
                        "watermarked": True
                    }))
                else:
                    return jsonify({'success': False, 'error': 'Failed to use free cut'}), 500
            
            # Convert to base64 data URLs for web display
            story_pieces = []
            for i, img_bytes in enumerate(story_images):
                img_bytes.seek(0)
                # Convert to base64
                img_base64 = base64.b64encode(img_bytes.getvalue()).decode('utf-8')
                data_url = f"data:image/png;base64,{img_base64}"
                story_pieces.append(data_url)
            
            logger.info(f"Successfully processed image into {len(story_pieces)} pieces")
            
            # Get updated user info
            updated_user = db.get_user(user_id)
            updated_permissions = can_user_process(user_id)
            
            return jsonify({
                'success': True,
                'story_pieces': story_pieces,
                'pieces_count': len(story_pieces),
                'user_type': updated_permissions['user_type'],
                'watermark': updated_permissions['watermark'],
                'credits_remaining': updated_permissions['credits_remaining'],
                'free_remaining': updated_permissions['free_remaining'],
                'credits_used': credits_used
            })
            
        except Exception as e:
            logger.error(f"Image processing error: {e}")
            return jsonify({'success': False, 'error': 'Failed to process image. Please try a different image.'}), 500
            
    except Exception as e:
        logger.error(f"API error: {e}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Story Puzzle Cutter API',
        'version': '1.0.0'
    })

@app.route('/api/user-info', methods=['POST'])
def get_user_info():
    """Get user information and processing permissions"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({"error": "user_id is required"}), 400
        
        user_id = int(user_id)
        
        # Get or create user in database
        user = db.get_user(user_id)
        
        # Check user permissions
        permissions = can_user_process(user_id)
        
        # Record interaction
        db.record_interaction(user_id, "mini_app_access", json.dumps({
            "user_type": permissions['user_type']
        }))
        
        return jsonify({
            "user_id": user_id,
            "username": user.get('username'),
            "first_name": user.get('first_name'),
            "user_type": permissions['user_type'],
            "can_process": permissions['can_process'],
            "watermark": permissions['watermark'],
            "credits_remaining": permissions['credits_remaining'],
            "free_remaining": permissions['free_remaining'],
            "message": permissions.get('message'),
            "free_limit": FREE_LIMIT,
            "total_free_used": user['free_uses']
        })
        
    except Exception as e:
        logger.error(f"Error getting user info: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/upload-story-piece', methods=['POST'])
def upload_story_piece():
    """Upload a story piece and return a public URL"""
    try:
        if 'image' not in request.files:
            return jsonify({"error": "No image file provided"}), 400
        
        image_file = request.files['image']
        user_id = request.form.get('userId', 'unknown')
        
        if image_file.filename == '':
            return jsonify({"error": "Empty filename"}), 400
        
        # Create uploads directory if it doesn't exist
        uploads_dir = os.path.join(os.path.dirname(__file__), 'temp_uploads')
        os.makedirs(uploads_dir, exist_ok=True)
        
        # Generate unique filename
        timestamp = int(time.time() * 1000)
        filename = f"story_{user_id}_{timestamp}_{image_file.filename}"
        filepath = os.path.join(uploads_dir, filename)
        
        # Save the file
        image_file.save(filepath)
        
        # Get the public URL (using ngrok URL from config)
        from bot.config import MINI_APP_URL
        base_url = MINI_APP_URL.rstrip('/')
        public_url = f"{base_url}/uploads/{filename}"
        
        logger.info(f"Uploaded story piece: {filename} for user {user_id}")
        logger.info(f"Public URL: {public_url}")
        
        return jsonify({
            "success": True,
            "url": public_url,
            "filename": filename
        })
        
    except Exception as e:
        logger.error(f"Error uploading story piece: {e}")
        return jsonify({"error": str(e)}), 500

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

@app.route('/api/verify-premium-payment', methods=['POST'])
def verify_premium_payment():
    """Verify premium subscription payment"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        transaction = data.get('transaction')
        wallet_address = data.get('wallet_address')
        
        if not user_id:
            return jsonify({"error": "user_id is required"}), 400
        
        user_id = int(user_id)
        
        # Log the payment attempt
        logger.info(f"Premium payment verification for user {user_id}")
        logger.info(f"Transaction: {transaction}")
        logger.info(f"Wallet: {wallet_address}")
        
        # In a production environment, you would verify the transaction on the TON blockchain
        # For now, we'll trust the client-side transaction result
        # TODO: Implement actual blockchain verification using TON API
        
        # Grant 30 days of premium (10 stories per day)
        # Add 300 credits (30 days * 10 stories)
        db.add_credits(user_id, 300)
        
        # Record the payment
        db.record_interaction(user_id, "premium_subscription", json.dumps({
            "transaction": str(transaction),
            "wallet": wallet_address,
            "duration": "30_days",
            "credits_granted": 300
        }))
        
        logger.info(f"Premium subscription activated for user {user_id}")
        
        return jsonify({
            "success": True,
            "message": "Premium subscription activated",
            "credits_granted": 300,
            "expires_in_days": 30
        })
        
    except Exception as e:
        logger.error(f"Error verifying premium payment: {e}")
        return jsonify({"error": str(e)}), 500

@app.errorhandler(413)
def too_large(e):
    """Handle file too large error"""
    return jsonify({'success': False, 'error': 'File too large. Maximum size is 10MB'}), 413

@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors"""
    return jsonify({'success': False, 'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(e):
    """Handle internal server errors"""
    logger.error(f"Internal server error: {e}")
    return jsonify({'success': False, 'error': 'Internal server error'}), 500

if __name__ == '__main__':
    # Get configuration from environment
    host = os.getenv('API_HOST', '0.0.0.0')
    port = int(os.getenv('API_PORT', 5000))
    debug = os.getenv('DEBUG', 'False').lower() == 'true'
    
    logger.info(f"Starting Story Puzzle Cutter API on {host}:{port}")
    logger.info(f"Debug mode: {debug}")
    
    app.run(host=host, port=port, debug=debug)
