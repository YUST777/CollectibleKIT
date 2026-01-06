const pg = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Training Sheets Data (Hardcoded from next-app/lib/problems.ts)
const problems = {
    'sheet-1-A': {
        id: 'A',
        title: 'Say Hello With C++',
        examples: [
            { input: 'programmer', output: 'Hello, programmer' }
        ],
        testCases: [
            { input: 'programmer', expectedOutput: 'Hello, programmer' },
            { input: 'world', expectedOutput: 'Hello, world' },
            { input: 'Alice', expectedOutput: 'Hello, Alice' },
            { input: 'Codeforces', expectedOutput: 'Hello, Codeforces' },
            { input: 'ICPC', expectedOutput: 'Hello, ICPC' },
        ]
    },
    'sheet-1-B': {
        id: 'B',
        title: 'Basic Data Types',
        examples: [
            {
                input: '3 12345678912345 a 334.23 14049.30493',
                output: '3\n12345678912345\na\n334.23\n14049.3'
            }
        ],
        testCases: [
            { input: '3 12345678912345 a 334.23 14049.30493', expectedOutput: '3\n12345678912345\na\n334.23\n14049.3' },
            { input: '42 9876543210123 x 123.45 678.901', expectedOutput: '42\n9876543210123\nx\n123.45\n678.901' },
            { input: '0 1 z 0.0 0.0', expectedOutput: '0\n1\nz\n0\n0' },
            { input: '100 99999999999999 M 50.5 100.25', expectedOutput: '100\n99999999999999\nM\n50.5\n100.25' },
        ]
    },
    'sheet-1-C': {
        id: 'C',
        title: 'Simple Calculator',
        examples: [
            {
                input: '5 10',
                output: '5 + 10 = 15\n5 * 10 = 50\n5 - 10 = -5'
            }
        ],
        testCases: [
            { input: '5 10', expectedOutput: '5 + 10 = 15\n5 * 10 = 50\n5 - 10 = -5' },
            { input: '10 5', expectedOutput: '10 + 5 = 15\n10 * 5 = 50\n10 - 5 = 5' },
            { input: '1 1', expectedOutput: '1 + 1 = 2\n1 * 1 = 1\n1 - 1 = 0' },
            { input: '100 200', expectedOutput: '100 + 200 = 300\n100 * 200 = 20000\n100 - 200 = -100' },
            { input: '99999 1', expectedOutput: '99999 + 1 = 100000\n99999 * 1 = 99999\n99999 - 1 = 99998' },
            { input: '100000 100000', expectedOutput: '100000 + 100000 = 200000\n100000 * 100000 = 10000000000\n100000 - 100000 = 0' },
            { input: '50000 50000', expectedOutput: '50000 + 50000 = 100000\n50000 * 50000 = 2500000000\n50000 - 50000 = 0' },
        ]
    },
    'sheet-1-D': {
        id: 'D',
        title: 'Difference',
        examples: [
            { input: '1 2 3 4', output: 'Difference = -10' },
            { input: '2 3 4 5', output: 'Difference = -14' },
            { input: '4 5 2 3', output: 'Difference = 14' }
        ],
        testCases: [
            { input: '1 2 3 4', expectedOutput: 'Difference = -10' },
            { input: '2 3 4 5', expectedOutput: 'Difference = -14' },
            { input: '4 5 2 3', expectedOutput: 'Difference = 14' },
            { input: '0 0 0 0', expectedOutput: 'Difference = 0' },
            { input: '10 10 5 5', expectedOutput: 'Difference = 75' },
            { input: '-5 2 3 -4', expectedOutput: 'Difference = 2' },
            { input: '100000 100000 1 1', expectedOutput: 'Difference = 9999999999' },
            { input: '100000 100000 100000 100000', expectedOutput: 'Difference = 0' },
            { input: '-100000 100000 100000 100000', expectedOutput: 'Difference = -20000000000' },
        ]
    },
    'sheet-1-E': {
        id: 'E',
        title: 'Area of a Circle',
        examples: [
            { input: '2.00', output: '12.566370612' }
        ],
        testCases: [
            { input: '2.00', expectedOutput: '12.566370612' },
            { input: '1', expectedOutput: '3.141592653' },
            { input: '5', expectedOutput: '78.539816325' },
            { input: '10', expectedOutput: '314.159265300' },
            { input: '3.5', expectedOutput: '38.484509999' },
        ]
    },
    'sheet-1-F': {
        id: 'F',
        title: 'Digits Summation',
        examples: [
            { input: '13 12', output: '5' }
        ],
        testCases: [
            { input: '13 12', expectedOutput: '5' },
            { input: '99 99', expectedOutput: '18' },
            { input: '10 20', expectedOutput: '0' },
            { input: '123456789 987654321', expectedOutput: '10' },
            { input: '0 0', expectedOutput: '0' },
            { input: '5 5', expectedOutput: '10' },
            { input: '999999999999999999 999999999999999999', expectedOutput: '18' },
            { input: '1000000000000000000 1', expectedOutput: '1' },
        ]
    },
    'sheet-1-G': {
        id: 'G',
        title: 'Summation from 1 to N',
        examples: [
            { input: '3', output: '6' },
            { input: '10', output: '55' }
        ],
        testCases: [
            { input: '3', expectedOutput: '6' },
            { input: '10', expectedOutput: '55' },
            { input: '1', expectedOutput: '1' },
            { input: '100', expectedOutput: '5050' },
            { input: '1000000', expectedOutput: '500000500000' },
            { input: '1000000000', expectedOutput: '500000000500000000' },
        ]
    },
    'sheet-1-H': {
        id: 'H',
        title: 'Two Numbers',
        examples: [
            { input: '10 3', output: '3 4 3' },
            { input: '7 2', output: '3 4 4' }
        ],
        testCases: [
            { input: '10 3', expectedOutput: '3 4 3' },
            { input: '7 2', expectedOutput: '3 4 4' },
            { input: '5 2', expectedOutput: '2 3 3' },
            { input: '10 5', expectedOutput: '2 2 2' },
            { input: '1 2', expectedOutput: '0 1 1' },
            { input: '99 10', expectedOutput: '9 10 10' },
        ]
    },
    'sheet-1-I': {
        id: 'I',
        title: 'Welcome for you with Conditions',
        examples: [
            { input: '10 9', output: 'Yes' },
            { input: '5 5', output: 'Yes' },
            { input: '5 7', output: 'No' }
        ],
        testCases: [
            { input: '10 9', expectedOutput: 'Yes' },
            { input: '5 5', expectedOutput: 'Yes' },
            { input: '5 7', expectedOutput: 'No' },
            { input: '0 0', expectedOutput: 'Yes' },
            { input: '100 50', expectedOutput: 'Yes' },
            { input: '1 100', expectedOutput: 'No' },
        ]
    },
    'sheet-1-J': {
        id: 'J',
        title: 'Multiples',
        examples: [
            { input: '9 3', output: 'Multiples' },
            { input: '6 24', output: 'Multiples' },
            { input: '12 5', output: 'No Multiples' }
        ],
        testCases: [
            { input: '9 3', expectedOutput: 'Multiples' },
            { input: '6 24', expectedOutput: 'Multiples' },
            { input: '12 5', expectedOutput: 'No Multiples' },
            { input: '1 1', expectedOutput: 'Multiples' },
            { input: '100 10', expectedOutput: 'Multiples' },
            { input: '7 13', expectedOutput: 'No Multiples' },
        ]
    },
    'sheet-1-K': {
        id: 'K',
        title: 'Max and Min',
        examples: [
            { input: '1 2 3', output: '1 3' },
            { input: '-1 -2 -3', output: '-3 -1' },
            { input: '10 20 -5', output: '-5 20' }
        ],
        testCases: [
            { input: '1 2 3', expectedOutput: '1 3' },
            { input: '-1 -2 -3', expectedOutput: '-3 -1' },
            { input: '10 20 -5', expectedOutput: '-5 20' },
            { input: '5 5 5', expectedOutput: '5 5' },
            { input: '0 -100 100', expectedOutput: '-100 100' },
            { input: '99999 1 50000', expectedOutput: '1 99999' },
        ]
    },
    'sheet-1-L': {
        id: 'L',
        title: 'The Brothers',
        examples: [
            { input: 'bassam ramadan\nahmed ramadan', output: 'ARE Brothers' },
            { input: 'ali salah\nayman salah', output: 'ARE Brothers' },
            { input: 'ali kamel\nali salah', output: 'NOT' }
        ],
        testCases: [
            { input: 'bassam ramadan\nahmed ramadan', expectedOutput: 'ARE Brothers' },
            { input: 'ali salah\nayman salah', expectedOutput: 'ARE Brothers' },
            { input: 'ali kamel\nali salah', expectedOutput: 'NOT' },
            { input: 'john doe\njane doe', expectedOutput: 'ARE Brothers' },
            { input: 'alice smith\nbob jones', expectedOutput: 'NOT' },
            { input: 'x y\nz y', expectedOutput: 'ARE Brothers' },
        ]
    },
    'sheet-1-M': {
        id: 'M',
        title: 'Capital or Small or Digit',
        examples: [
            { input: 'A', output: 'ALPHA\nIS CAPITAL' },
            { input: '9', output: 'IS DIGIT' },
            { input: 'a', output: 'ALPHA\nIS SMALL' }
        ],
        testCases: [
            { input: 'A', expectedOutput: 'ALPHA\nIS CAPITAL' },
            { input: '9', expectedOutput: 'IS DIGIT' },
            { input: 'a', expectedOutput: 'ALPHA\nIS SMALL' },
            { input: 'Z', expectedOutput: 'ALPHA\nIS CAPITAL' },
            { input: '0', expectedOutput: 'IS DIGIT' },
            { input: 'z', expectedOutput: 'ALPHA\nIS SMALL' },
        ]
    },
    'sheet-1-N': {
        id: 'N',
        title: 'Char',
        examples: [
            { input: 'a', output: 'A' },
            { input: 'A', output: 'a' }
        ],
        testCases: [
            { input: 'a', expectedOutput: 'A' },
            { input: 'A', expectedOutput: 'a' },
            { input: 'z', expectedOutput: 'Z' },
            { input: 'Z', expectedOutput: 'z' },
            { input: 'm', expectedOutput: 'M' },
            { input: 'M', expectedOutput: 'm' },
        ]
    },
    'sheet-1-O': {
        id: 'O',
        title: 'Calculator',
        examples: [
            { input: '7+54', output: '61' },
            { input: '17*10', output: '170' }
        ],
        testCases: [
            { input: '7+54', expectedOutput: '61' },
            { input: '17*10', expectedOutput: '170' },
            { input: '100-50', expectedOutput: '50' },
            { input: '20/4', expectedOutput: '5' },
            { input: '10+10', expectedOutput: '20' },
            { input: '7/2', expectedOutput: '3' },
            { input: '10000*10000', expectedOutput: '100000000' },
            { input: '1-10000', expectedOutput: '-9999' },
            { input: '9999/1', expectedOutput: '9999' },
        ]
    },
    'sheet-1-P': {
        id: 'P',
        title: 'First digit !',
        examples: [
            { input: '4569', output: 'EVEN' },
            { input: '3569', output: 'ODD' }
        ],
        testCases: [
            { input: '4569', expectedOutput: 'EVEN' },
            { input: '3569', expectedOutput: 'ODD' },
            { input: '2000', expectedOutput: 'EVEN' },
            { input: '1111', expectedOutput: 'ODD' },
            { input: '8888', expectedOutput: 'EVEN' },
            { input: '9999', expectedOutput: 'ODD' },
        ]
    },
    'sheet-1-Q': {
        id: 'Q',
        title: 'Quadrant',
        examples: [
            { input: '4.5 -2.2', output: 'Q4' },
            { input: '0.1 0.1', output: 'Q1' }
        ],
        testCases: [
            { input: '4.5 -2.2', expectedOutput: 'Q4' },
            { input: '0.1 0.1', expectedOutput: 'Q1' },
            { input: '-5 5', expectedOutput: 'Q2' },
            { input: '-3 -3', expectedOutput: 'Q3' },
            { input: '0 0', expectedOutput: 'Origem' },
            { input: '5 0', expectedOutput: 'Eixo X' },
            { input: '0 5', expectedOutput: 'Eixo Y' },
        ]
    },
    'sheet-1-R': {
        id: 'R',
        title: 'Age in Days',
        examples: [
            { input: '400', output: '1 years\n1 months\n5 days' },
            { input: '800', output: '2 years\n2 months\n10 days' },
            { input: '30', output: '0 years\n1 months\n0 days' }
        ],
        testCases: [
            { input: '400', expectedOutput: '1 years\n1 months\n5 days' },
            { input: '800', expectedOutput: '2 years\n2 months\n10 days' },
            { input: '30', expectedOutput: '0 years\n1 months\n0 days' },
            { input: '365', expectedOutput: '1 years\n0 months\n0 days' },
            { input: '0', expectedOutput: '0 years\n0 months\n0 days' },
            { input: '395', expectedOutput: '1 years\n1 months\n0 days' },
        ]
    },
    'sheet-1-S': {
        id: 'S',
        title: 'Interval',
        examples: [
            { input: '25.1', output: 'Interval (25,50]' },
            { input: '25.0', output: 'Interval [0,25]' },
            { input: '100.0', output: 'Interval (75,100]' },
            { input: '-25.2', output: 'Out of Intervals' }
        ],
        testCases: [
            { input: '25.1', expectedOutput: 'Interval (25,50]' },
            { input: '25.0', expectedOutput: 'Interval [0,25]' },
            { input: '100.0', expectedOutput: 'Interval (75,100]' },
            { input: '-25.2', expectedOutput: 'Out of Intervals' },
            { input: '0', expectedOutput: 'Interval [0,25]' },
            { input: '50', expectedOutput: 'Interval (25,50]' },
            { input: '75', expectedOutput: 'Interval (50,75]' },
        ]
    },
    'sheet-1-T': {
        id: 'T',
        title: 'Sort Numbers',
        examples: [
            { input: '3 -2 1', output: '-2\n1\n3\n\n3\n-2\n1' },
            { input: '-2 10 0', output: '-2\n0\n10\n\n-2\n10\n0' }
        ],
        testCases: [
            { input: '3 -2 1', expectedOutput: '-2\n1\n3\n\n3\n-2\n1' },
            { input: '-2 10 0', expectedOutput: '-2\n0\n10\n\n-2\n10\n0' },
            { input: '1 2 3', expectedOutput: '1\n2\n3\n\n1\n2\n3' },
            { input: '5 5 5', expectedOutput: '5\n5\n5\n\n5\n5\n5' },
        ]
    },
    'sheet-1-U': {
        id: 'U',
        title: 'Float or int',
        examples: [
            { input: '234.000', output: 'int 234' },
            { input: '534.958', output: 'float 534 0.958' }
        ],
        testCases: [
            { input: '234.000', expectedOutput: 'int 234' },
            { input: '534.958', expectedOutput: 'float 534 0.958' },
            { input: '100.5', expectedOutput: 'float 100 0.5' },
            { input: '1.0', expectedOutput: 'int 1' },
            { input: '999.999', expectedOutput: 'float 999 0.999' },
        ]
    },
    'sheet-1-V': {
        id: 'V',
        title: 'Comparison',
        examples: [
            { input: '5 > 4', output: 'Right' },
            { input: '9 < 1', output: 'Wrong' },
            { input: '4 = 4', output: 'Right' }
        ],
        testCases: [
            { input: '5 > 4', expectedOutput: 'Right' },
            { input: '9 < 1', expectedOutput: 'Wrong' },
            { input: '4 = 4', expectedOutput: 'Right' },
            { input: '0 < 0', expectedOutput: 'Wrong' },
            { input: '-5 < 5', expectedOutput: 'Right' },
            { input: '100 > 99', expectedOutput: 'Right' },
        ]
    },
    'sheet-1-W': {
        id: 'W',
        title: 'Mathematical Expression',
        examples: [
            { input: '5 + 10 = 15', output: 'Yes' },
            { input: '3 - 1 = 2', output: 'Yes' },
            { input: '2 * 10 = 19', output: '20' }
        ],
        testCases: [
            { input: '5 + 10 = 15', expectedOutput: 'Yes' },
            { input: '3 - 1 = 2', expectedOutput: 'Yes' },
            { input: '2 * 10 = 19', expectedOutput: '20' },
            { input: '10 + 5 = 16', expectedOutput: '15' },
            { input: '7 * 7 = 49', expectedOutput: 'Yes' },
            { input: '100 - 50 = 60', expectedOutput: '50' },
        ]
    },
    'sheet-1-X': {
        id: 'X',
        title: 'Two intervals',
        examples: [
            { input: '1 15 5 27', output: '5 15' },
            { input: '2 5 6 12', output: '-1' }
        ],
        testCases: [
            { input: '1 15 5 27', expectedOutput: '5 15' },
            { input: '2 5 6 12', expectedOutput: '-1' },
            { input: '1 10 5 8', expectedOutput: '5 8' },
            { input: '10 20 15 25', expectedOutput: '15 20' },
            { input: '1 5 5 10', expectedOutput: '5 5' },
        ]
    },
    'sheet-1-Y': {
        id: 'Y',
        title: 'The last 2 digits',
        examples: [
            { input: '5 7 2 4', output: '80' },
            { input: '3 9 9 9', output: '87' }
        ],
        testCases: [
            { input: '5 7 2 4', expectedOutput: '80' },
            { input: '3 9 9 9', expectedOutput: '87' },
            { input: '10 10 10 10', expectedOutput: '00' },
            { input: '2 2 2 2', expectedOutput: '16' },
            { input: '99 99 99 99', expectedOutput: '01' },
            { input: '1000000000 1000000000 1000000000 1000000000', expectedOutput: '00' },
            { input: '123456789 987654321 111111111 999999999', expectedOutput: '41' },
        ]
    },
    'sheet-1-Z': {
        id: 'Z',
        title: 'Hard Compare',
        examples: [
            { input: '3 2 5 4', output: 'NO' },
            { input: '5 2 4 2', output: 'YES' },
            { input: '5 2 5 2', output: 'NO' }
        ],
        testCases: [
            { input: '3 2 5 4', expectedOutput: 'NO' },
            { input: '5 2 4 2', expectedOutput: 'YES' },
            { input: '5 2 5 2', expectedOutput: 'NO' },
            { input: '2 10 3 6', expectedOutput: 'YES' },
            { input: '10 1 2 4', expectedOutput: 'NO' },
        ]
    }
};

const migrate = async () => {
    try {
        console.log('Starting migration of test cases...');

        // Clear existing test cases to avoid duplicates/stale data (re-runnable script)
        await pool.query('TRUNCATE TABLE problem_test_cases');
        console.log('Cleared existing test cases.');

        for (const [key, problem] of Object.entries(problems)) {
            const [sheetId, _, problemId] = key.split('-');
            const sheet = 'sheet-1'; // Hardcoded for this batch

            console.log(`Processing ${key} (${problem.title})...`);

            let ordinal = 1;

            // 1. Insert Examples (as sample tests)
            for (const example of problem.examples) {
                await pool.query(
                    `INSERT INTO problem_test_cases 
                    (sheet_id, problem_id, input, expected_output, is_sample, ordinal)
                    VALUES ($1, $2, $3, $4, TRUE, $5)`,
                    [sheet, problem.id, example.input, example.output, ordinal++]
                );
            }

            // 2. Insert Test Cases (as hidden tests)
            for (const testCase of problem.testCases) {
                await pool.query(
                    `INSERT INTO problem_test_cases 
                    (sheet_id, problem_id, input, expected_output, is_sample, ordinal)
                    VALUES ($1, $2, $3, $4, FALSE, $5)`,
                    [sheet, problem.id, testCase.input, testCase.expectedOutput, ordinal++]
                );
            }
        }

        console.log('✅ Migration completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await pool.end();
    }
};

migrate();
