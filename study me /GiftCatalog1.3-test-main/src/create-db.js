const sqlite3 = require('sqlite3');
const path = require('path');
const fs = require('fs');

// Create a fresh db file
const dbDir = path.resolve(process.cwd(), './exports/db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.resolve(dbDir, 'plushpepe.db');
console.log(`Creating new database at: ${dbPath}`);

// Delete the file if it exists
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

try {
  // Create a new database
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error creating database:', err);
      process.exit(1);
    }

    // Create tables
    db.serialize(() => {
      db.run(`
        CREATE TABLE items (
          id INTEGER PRIMARY KEY,
          name TEXT,
          description TEXT,
          image TEXT,
          lottie TEXT,
          attributes TEXT
        )
      `);

      db.run(`CREATE INDEX idx_items_id ON items(id)`);

      // Insert some sample data
      const sampleAttributes = JSON.stringify([
        { trait_type: "Model", value: "Pepe" },
        { trait_type: "Backdrop", value: "Blue" },
        { trait_type: "Symbol", value: "TON" }
      ]);

      const insertStmt = db.prepare(`
        INSERT INTO items (id, name, description, image, attributes)
        VALUES (?, ?, ?, ?, ?)
      `);

      // Create 50 sample items
      for (let i = 1; i <= 50; i++) {
        insertStmt.run(
          i,
          `Plush Pepe #${i}`,
          `A cute plush Pepe collectible #${i}`,
          `https://example.com/image${i}.jpg`,
          sampleAttributes,
          (err) => {
            if (err) console.error(`Error inserting item ${i}:`, err);
          }
        );
      }

      insertStmt.finalize();

      // Verify the data
      db.get('SELECT COUNT(*) as count FROM items', (err, row) => {
        if (err) {
          console.error('Error counting items:', err);
          return;
        }
        console.log(`Items created: ${row.count}`);

        db.close((err) => {
          if (err) {
            console.error('Error closing database:', err);
          } else {
            console.log('Database created successfully!');
          }
        });
      });
    });
  });
} catch (error) {
  console.error('Error creating database:', error);
}
