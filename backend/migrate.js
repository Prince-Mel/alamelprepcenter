import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

(async () => {
    const config = {
        host: process.env.DB_HOST || 'junction.proxy.rlwy.net',
        port: process.env.DB_PORT || 19169,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'ZqUvIsYFpPZlFEShJzIKRmswVvAunTCl',
        database: process.env.DB_NAME || 'railway'
    };

    console.log('Connecting to database:', config.host);
    let connection;
    try {
        connection = await mysql.createConnection(config);
        console.log('Checking for show_score column...');
        const [columns] = await connection.execute('DESCRIBE results');
        const hasColumn = columns.some(c => c.Field === 'show_score');

        if (!hasColumn) {
            console.log('Adding show_score column...');
            await connection.execute('ALTER TABLE results ADD COLUMN show_score BOOLEAN DEFAULT FALSE');
            console.log('Column added successfully.');
        } else {
            console.log('Column already exists.');
        }

    } catch (e) {
        console.error('Migration error:', e.message);
    } finally {
        if (connection) await connection.end();
        process.exit(0);
    }
})();
