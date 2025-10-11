const sqlite3 = require('sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(process.cwd(), './exports/db/plushpepe.db');
console.log(`Checking database at: ${dbPath}`);

if (!fs.existsSync(dbPath)) {
  console.error(`Database file not found: ${dbPath}`);
  process.exit(1);
}

try {
  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error('Error opening database:', err);
      process.exit(1);
    }

    // Check tables
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
      if (err) {
        console.error('Error querying tables:', err);
        db.close();
        process.exit(1);
      }

      console.log('Tables in database:');
      console.log(tables);

      if (tables.length > 0 && tables.some(t => t.name === 'items')) {
        db.get('SELECT COUNT(*) as count FROM items', (err, count) => {
          if (err) {
            console.error('Error counting items:', err);
            db.close();
            process.exit(1);
          }

          console.log(`Items count: ${count.count}`);

          db.all('SELECT * FROM items LIMIT 1', (err, sampleItems) => {
            if (err) {
              console.error('Error querying sample items:', err);
              db.close();
              process.exit(1);
            }

            console.log('Sample item:');
            console.log(sampleItems);

            db.close();
            console.log('Database check successful!');
          });
        });
      } else {
        console.log('No items table found');
        db.close();
      }
    });
  });
} catch (error) {
  console.error('Error accessing database:', error);
  process.exit(1);
}
