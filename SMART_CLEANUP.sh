#!/bin/bash

# Smart Cleanup Script - Actually understands what directories do
# Based on real analysis of the codebase

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║         Smart Cleanup - Portfolio Preparation             ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${YELLOW}This script will clean up your project intelligently.${NC}"
echo ""
echo "What will happen:"
echo "  1. ✅ Create backup"
echo "  2. 🗑️  Delete test/development directories"
echo "  3. 🗑️  Remove sensitive files (sessions, databases)"
echo "  4. 📁 Rename directories to clear names"
echo "  5. 🧹 Remove weird files"
echo "  6. 📝 Organize documentation"
echo ""
read -p "Continue? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Cleanup cancelled."
    exit 0
fi

# Create backup
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📦 Creating backup...${NC}"
BACKUP_DIR="../CollectibleKIT_backup_$(date +%Y%m%d_%H%M%S)"
cp -r . "$BACKUP_DIR"
echo -e "${GREEN}✅ Backup: $BACKUP_DIR${NC}"
echo ""

# Delete test/development directories
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🗑️  Removing test/development directories...${NC}"

# sticker0.2 - Old version/test code
if [ -d "sticker0.2" ]; then
    rm -rf "sticker0.2"
    echo "  ✅ Deleted: sticker0.2/ (old test version)"
fi

# mrktandquantomapi - Market/Quantum API testing
if [ -d "mrktandquantomapi" ]; then
    rm -rf "mrktandquantomapi"
    echo "  ✅ Deleted: mrktandquantomapi/ (API testing code)"
fi

# showprofilegifts - Duplicate/test functionality
if [ -d "showprofilegifts" ]; then
    rm -rf "showprofilegifts"
    echo "  ✅ Deleted: showprofilegifts/ (duplicate test code)"
fi

# "what is the modle and background of that gift" - Terrible name, test code
if [ -d "what is the modle and background of that gift" ]; then
    rm -rf "what is the modle and background of that gift"
    echo "  ✅ Deleted: 'what is the modle...' (test code with bad name)"
fi

# gifts - Just session storage, not needed
if [ -d "gifts" ]; then
    rm -rf "gifts"
    echo "  ✅ Deleted: gifts/ (session storage only)"
fi

echo -e "${GREEN}✅ Test directories removed${NC}"
echo ""

# Remove sensitive files
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🔐 Removing sensitive files...${NC}"

# Session files
find . -name "*.session" -type f -delete 2>/dev/null || true
find . -name "*.session-journal" -type f -delete 2>/dev/null || true
echo "  ✅ Removed: *.session files"

# Database files
find . -name "*.db" -type f -delete 2>/dev/null || true
find . -name "*.db-journal" -type f -delete 2>/dev/null || true
echo "  ✅ Removed: *.db files"

# Environment files (keep .example)
find . -name ".env" -type f ! -name "*.example" -delete 2>/dev/null || true
find . -name ".env.local" -type f -delete 2>/dev/null || true
echo "  ✅ Removed: .env files (kept .example)"

echo -e "${GREEN}✅ Sensitive files removed${NC}"
echo ""

# Remove weird files
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🗑️  Removing weird files...${NC}"

# Version number files (what are these??)
rm -f =10.0.0 =2.3.0 =2.31.0 =21.0.0 =4.0.0 2>/dev/null || true
echo "  ✅ Removed: weird version files (=10.0.0, etc.)"

# Platform-specific files
rm -f start_bot.bat start_bot.ps1 2>/dev/null || true
echo "  ✅ Removed: Windows-only files"

echo -e "${GREEN}✅ Weird files removed${NC}"
echo ""

# Rename directories to meaningful names
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📝 Renaming directories...${NC}"

# webapp-nextjs → frontend (clearer name)
if [ -d "webapp-nextjs" ]; then
    mv webapp-nextjs frontend
    echo "  ✅ Renamed: webapp-nextjs → frontend"
fi

# bot → backend (clearer name)
if [ -d "bot" ]; then
    mv bot backend
    echo "  ✅ Renamed: bot → backend"
fi

# sticker_collections → data (it's just data files)
if [ -d "sticker_collections" ]; then
    mv sticker_collections data
    echo "  ✅ Renamed: sticker_collections → data"
fi

echo -e "${GREEN}✅ Directories renamed${NC}"
echo ""

# Create organized structure
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📁 Creating organized structure...${NC}"

mkdir -p docs
mkdir -p config
echo "  ✅ Created: docs/ and config/"

# Move documentation
[ -f "PITCH_DECK.txt" ] && mv PITCH_DECK.txt docs/ && echo "  ✅ Moved: PITCH_DECK.txt → docs/"
[ -f "NETLIFY_READY_SUMMARY.txt" ] && mv NETLIFY_READY_SUMMARY.txt docs/ && echo "  ✅ Moved: NETLIFY_READY_SUMMARY.txt → docs/"
[ -f "PROJECT_DEEP_ANALYSIS.md" ] && mv PROJECT_DEEP_ANALYSIS.md docs/ARCHITECTURE.md && echo "  ✅ Moved: PROJECT_DEEP_ANALYSIS.md → docs/ARCHITECTURE.md"

# Move config files
[ -f "mini_app.service" ] && mv mini_app.service config/app.service.example && echo "  ✅ Moved: mini_app.service → config/app.service.example"
[ -f "netlify.toml" ] && mv netlify.toml config/ && echo "  ✅ Moved: netlify.toml → config/"
[ -f ".env.example" ] && cp .env.example config/ && echo "  ✅ Copied: .env.example → config/"

echo -e "${GREEN}✅ Structure organized${NC}"
echo ""

# Clean up cleanup files
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🧹 Removing cleanup helper files...${NC}"

rm -f CLEANUP_PLAN.md
rm -f CLEANUP_SUMMARY.md
rm -f _CLEANUP_FILES_INDEX.md
rm -f PORTFOLIO_PREPARATION_GUIDE.md
rm -f START_HERE.md
rm -f README_CLEANUP.txt
rm -f cleanup_project.sh
rm -f EXECUTE_CLEANUP.sh
rm -f remove_secrets.py

echo "  ✅ Removed: All cleanup helper files"
echo -e "${GREEN}✅ Cleanup files removed${NC}"
echo ""

# Replace README
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📝 Updating README...${NC}"

if [ -f "README_NEW.md" ]; then
    mv README.md docs/README_OLD.md 2>/dev/null || true
    mv README_NEW.md README.md
    echo "  ✅ Replaced: README.md with professional version"
fi

echo -e "${GREEN}✅ README updated${NC}"
echo ""

# Update .gitignore
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📝 Updating .gitignore...${NC}"

cat >> .gitignore << 'EOF'

# ============================================
# Sensitive Files
# ============================================
*.session
*.session-journal
*.db
*.db-journal
.env
.env.local
.env.*.local

# ============================================
# Backup & Temp Files
# ============================================
*_backup_*
backup_*/
*.tmp
temp/
tmp/

# ============================================
# Build & Dependencies
# ============================================
node_modules/
__pycache__/
*.pyc
.next/
dist/
build/

# ============================================
# IDE & OS
# ============================================
.vscode/
.idea/
.DS_Store
Thumbs.db
EOF

echo "  ✅ Updated: .gitignore"
echo -e "${GREEN}✅ .gitignore updated${NC}"
echo ""

# Create LICENSE
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📄 Creating LICENSE...${NC}"

if [ ! -f "LICENSE" ]; then
    cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2024 CollectibleKIT

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF
    echo "  ✅ Created: LICENSE"
else
    echo "  ℹ️  LICENSE already exists"
fi

echo -e "${GREEN}✅ LICENSE ready${NC}"
echo ""

# Final summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ CLEANUP COMPLETED!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}📊 What changed:${NC}"
echo "  ✅ Deleted 5 test/development directories"
echo "  ✅ Removed all sensitive files"
echo "  ✅ Renamed directories to clear names:"
echo "     • webapp-nextjs → frontend"
echo "     • bot → backend"
echo "     • sticker_collections → data"
echo "  ✅ Organized docs and config"
echo "  ✅ Updated .gitignore"
echo "  ✅ Created LICENSE"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "  1. Review changes: ${BLUE}git status${NC}"
echo "  2. Update import paths (if needed)"
echo "  3. Create .env: ${BLUE}cp .env.example .env${NC}"
echo "  4. Test: ${BLUE}cd frontend && npm run dev${NC}"
echo "  5. Commit: ${BLUE}git add . && git commit -m 'Clean up for portfolio'${NC}"
echo "  6. Push: ${BLUE}git push${NC}"
echo ""
echo -e "${GREEN}🎉 Your project is now portfolio-ready!${NC}"
echo ""
echo -e "${BLUE}Backup: $BACKUP_DIR${NC}"
echo ""
