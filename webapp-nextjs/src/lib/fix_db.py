import re

with open('database.ts', 'r') as f:
    content = f.read()

# Replace promisify declarations and usage patterns
# Pattern 1: Remove promisify declarations
content = re.sub(r'\s*const run = promisify\(this\.db\.run\.bind\(this\.db\)\);?\n', '', content)
content = re.sub(r'\s*const get = promisify\(this\.db\.get\.bind\(this\.db\)\);?\n', '', content)
content = re.sub(r'\s*const all = promisify\(this\.db\.all\.bind\(this\.db\)\);?\n', '', content)

# Pattern 2: Replace await run( with await this.dbRun(
content = re.sub(r'await run\(', 'await this.dbRun(', content)

# Pattern 3: Replace await get( with await this.dbGet(
content = re.sub(r'await get\(', 'await this.dbGet(', content)

# Pattern 4: Replace await all( with await this.dbAll(
content = re.sub(r'await all\(', 'await this.dbAll(', content)

with open('database.ts', 'w') as f:
    f.write(content)

print("Fixed database.ts")
