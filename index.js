const express = require('express');
const path = require('path');
const PORT = process.env.PORT || 5000;
const { Client } = require('pg');
const app = express();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
});

app.use(express.static(path.join(__dirname, 'public')))
    .set('views', path.join(__dirname, 'views'))
    .set('view engine', 'ejs')
    .listen(PORT, () => console.log(`Listening on ${ PORT }`))

client.connect();

// client.query('SELECT table_schema,table_name FROM information_schema.tables;', (err, res) => {
//     if (err) throw err;
//     for (let row of res.rows) {
//         console.log(JSON.stringify(row));
//     }
//     client.end();
// });


app.get('/', (req, res) => {
    res.render('pages/index', {"client": client});
});
app.get("/stock", (req, res) => res.render('pages/stock'));
app.get("/tile", (req, res) => res.redirect('http://www.tinyurl.com/tabtiles'))
app.get("/*", (req, res) => res.redirect('http://www.tinyurl.com/tabtiles'))