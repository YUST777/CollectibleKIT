#!/bin/bash

# ==============================================================================
# DEPRECATED: This script is no longer required as we now use the CDN directly
# ==============================================================================
# Instead of downloading and storing all gift images locally, we now fetch them
# directly from the CDN when needed using the pattern:
# https://cdn.changes.tg/gifts/models/(gift collection name)/png/(gift model).png
#
# This saves approximately 900MB of storage space and makes deployment faster.
# See src/lib/utils.ts for the utility functions that handle image URLs.
# ==============================================================================

echo "⚠️  WARNING: This script is deprecated! ⚠️"
echo "Images are now loaded directly from the CDN."
echo "See src/lib/utils.ts for implementation details."

# Ask for confirmation before continuing
read -p "Do you still want to download all gift images? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Download cancelled."
    exit 0
fi

# Original script follows:
BASE_URL="https://cdn.changes.tg/gifts/models"

# List of directories (items with spaces must be handled properly)
directories=(
    "astral shard" "diamond ring" "fool's cap" "loot bag" "mini oscar" "snow mittens" "vintage cigar"
    "b-day candle" "durov's cap" "genie lamp" "ion gem" "party sparkler" "santa hat" "spiced wine" "voodoo doll"
    "berry box" "durov's cap" "ginger cookie" "jelly bunny" "love candle" "party sparklers" "scared cat" "spy agaric" "witch hat"
    "bunny muffin" "eternal candle" "hanging star" "jester hat" "love potion" "star notepad"
    "cookie heart" "eternal rose" "hex pot" "jingle bells" "lunar snake" "perfume bottle" "sharp tongue" "swiss watch"
    "crystal ball" "evil eye" "homemade cake" "kissed frog" "mad pumpkin" "plush pepe" "signet ring" "toy bear"
    "desk calendar" "flying broom" "hypno lollipop" "lol pop" "magic potion" "precious peach" "skull flower" "trapped heart"
)

# Create directories if they don't exist
for dir in "${directories[@]}"; do
    mkdir -p "$dir"
done

# Loop through each directory
for dir in "${directories[@]}"; do
    # Convert space-containing directory names to a safe format
    safe_dir=$(echo "$dir" | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) substr($i,2)}1')

    echo "Processing: $dir"
    
    # Ensure directory exists
    cd "$dir" || { echo "Failed to enter $dir"; continue; }

    # Download PNG files from the given URL
    wget -r -np -nd -A "*.png" "${BASE_URL}/${safe_dir}/png/"

    # Apply chmod -R 755
    chmod -R 755 .

    # Go back to the parent directory
    cd ..
done

echo "Download and permission update complete!" 