import mysql from 'mysql2/promise';

async function check() {
    const pool = mysql.createPool({
        host: 'yamabiko.proxy.rlwy.net',
        user: 'root',
        password: 'eLfTUyLYovLyzXHcbKgsBhLsFGreewbt',
        database: 'railway',
        port: 48079
    });
    const [rows] = await pool.query('DESCRIBE results');
    console.log(rows);
    process.exit(0);
}
check();
