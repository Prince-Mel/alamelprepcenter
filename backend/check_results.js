import mysql from 'mysql2/promise';

async function check() {
    const pool = mysql.createPool({
        host: 'yamabiko.proxy.rlwy.net',
        user: 'root',
        password: 'eLfTUyLYovLyzXHcbKgsBhLsFGreewbt',
        database: 'railway',
        port: 48079
    });
    const [rows] = await pool.query('SELECT * FROM results ORDER BY timestamp DESC LIMIT 3');
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
}
check();
