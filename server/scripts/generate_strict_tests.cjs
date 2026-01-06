const pg = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const crypto = require('crypto');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
});

async function main() {
    try {
        console.log('🚀 Starting Strict Test Case Generation for Trap Problems...');

        // ---------------------------------------------------------
        // Problem G: Summation from 1 to N (sheet-1-G)
        // Trap: Loop O(N) vs Formula O(1).
        // Strategy: N up to 10^9. O(N) will TLE.
        // ---------------------------------------------------------
        console.log('Generating Problem G (Summation)...');
        const gTests = [];
        // Edge cases
        gTests.push({ input: '1', output: '1' });
        gTests.push({ input: '0', output: '0' }); // Although N >= 1 typically
        // Large Random
        for (let i = 0; i < 10; i++) {
            const n = BigInt(Math.floor(Math.random() * 1000000000)) + 1n; // 1 to 10^9
            const sum = (n * (n + 1n)) / 2n;
            gTests.push({ input: n.toString(), output: sum.toString() });
        }
        // Max limit
        const nMax = 1000000000n;
        const sumMax = (nMax * (nMax + 1n)) / 2n;
        gTests.push({ input: nMax.toString(), output: sumMax.toString() });

        await insertTests('sheet-1', 'G', gTests);


        // ---------------------------------------------------------
        // Problem Y: The Last 2 Digits (sheet-1-Y)
        // Trap: Overflow A*B*C*D.
        // Strategy: 10 tests with A,B,C,D ~ 10^9.
        // ---------------------------------------------------------
        console.log('Generating Problem Y (Last 2 Digits)...');
        const yTests = [];
        for (let i = 0; i < 10; i++) {
            const inputs = Array(4).fill(0).map(() => Math.floor(Math.random() * 1000000000));
            const ans = inputs.reduce((acc, val) => (acc * val) % 100, 1);
            let out = ans.toString();
            if (out.length < 2) out = '0' + out;
            yTests.push({ input: inputs.join(' '), output: out });
        }
        // Max Overflow Case
        yTests.push({ input: '1000000000 1000000000 1000000000 1000000000', output: '00' });
        await insertTests('sheet-1', 'Y', yTests);


        // ---------------------------------------------------------
        // Problem Z: Hard Compare (sheet-1-Z)
        // Trap: A^B > C^D with too large numbers.
        // Strategy: Use Logarithms. B*log(A) vs D*log(C).
        // ---------------------------------------------------------
        console.log('Generating Problem Z (Hard Compare)...');
        const zTests = [];
        for (let i = 0; i < 10; i++) {
            // A, C up to 10^6? No, typical constraints up to 10^12
            // Let's use BigIntish logic but log requires doubles.
            // Problem says A,B,C,D <= 10^12? Usually <= 10^7 base, exponent higher.
            // Let's stick to safe JS randoms but large enough to break pow().
            // Bases: 1 -> 10^7. Exponents: 1 -> 10^12
            const a = Math.floor(Math.random() * 1000000) + 1;
            const c = Math.floor(Math.random() * 1000000) + 1;
            const b = Math.floor(Math.random() * 1000000000000) + 1;
            const d = Math.floor(Math.random() * 1000000000000) + 1;

            const left = b * Math.log(a);
            const right = d * Math.log(c);

            // Allow precision margin? Usually strictly greater.
            // If they are VERY close, floating point might fail, but let's test general overflow first.
            const res = left > right ? 'YES' : 'NO';
            zTests.push({ input: `${a} ${b} ${c} ${d}`, output: res });
        }
        // Close case attempt
        zTests.push({ input: `2 100 4 50`, output: 'NO' }); // 2^100 == (2^2)^50 = 4^50. Equal -> NO
        zTests.push({ input: `2 100 4 49`, output: 'YES' }); // 2^100 > 4^49
        await insertTests('sheet-1', 'Z', zTests);


        // ---------------------------------------------------------
        // Problem X: Two Intervals (sheet-1-X)
        // Trap: Logic edge cases.
        // ---------------------------------------------------------
        console.log('Generating Problem X (Two Intervals)...');
        const xTests = [];
        // [L1 R1] [L2 R2]
        // 1. Disjoint Left: [1 5] [10 15] -> -1
        xTests.push({ input: '1 5 10 15', output: '-1' });
        // 2. Disjoint Right: [10 15] [1 5] -> -1
        xTests.push({ input: '10 15 1 5', output: '-1' });
        // 3. Touching: [1 5] [5 10] -> 5 5
        xTests.push({ input: '1 5 5 10', output: '5 5' });
        // 4. Nested: [1 10] [2 5] -> 2 5
        xTests.push({ input: '1 10 2 5', output: '2 5' });
        // 5. Overlap Left: [1 5] [4 8] -> 4 5
        xTests.push({ input: '1 5 4 8', output: '4 5' });
        // 6. Overlap Right: [4 8] [1 5] -> 4 5
        xTests.push({ input: '4 8 1 5', output: '4 5' });
        // 7. Identity: [5 5] [5 5] -> 5 5
        xTests.push({ input: '5 5 5 5', output: '5 5' });
        // 8. Single point overlap: [1 10] [10 10] -> 10 10
        xTests.push({ input: '1 10 10 10', output: '10 10' });
        // Large randoms
        for (let i = 0; i < 10; i++) {
            const l1 = Math.floor(Math.random() * 1000);
            const r1 = l1 + Math.floor(Math.random() * 1000);
            const l2 = Math.floor(Math.random() * 1000);
            const r2 = l2 + Math.floor(Math.random() * 1000);

            const start = Math.max(l1, l2);
            const end = Math.min(r1, r2);

            let out = '-1';
            if (start <= end) {
                out = `${start} ${end}`;
            }
            xTests.push({ input: `${l1} ${r1} ${l2} ${r2}`, output: out });
        }
        await insertTests('sheet-1', 'X', xTests);

        console.log('✅ Strict Test Generation Complete!');
    } catch (e) {
        console.error('❌ Error generating tests:', e);
    } finally {
        await pool.end();
    }
}

async function insertTests(sheet, pid, tests) {
    let ordinalBase = 100; // Start strict tests after basic manual ones
    for (const test of tests) {
        await pool.query(
            `INSERT INTO problem_test_cases 
            (sheet_id, problem_id, input, expected_output, is_sample, is_hidden, ordinal)
            VALUES ($1, $2, $3, $4, FALSE, TRUE, $5)`,
            [sheet, pid, test.input, test.output, ordinalBase++]
        );
    }
    console.log(`   -> Inserted ${tests.length} tests for ${pid}`);
}

main();
