const express = require('express');
const path = require('path');
const PORT = process.env.PORT || 5000;
const app = express();

app.use(express.static(path.join(__dirname, 'public')))
    .set('views', path.join(__dirname, 'views'))
    .set('view engine', 'ejs')
    .listen(PORT, () => console.log(`Listening on ${ PORT }`))

app.get('/', (req, res) => {
    res.render('pages/index', {});
});
app.get("/stock", (req, res) => res.render('pages/stock'));
app.get("/profile", (req, res) => res.render('pages/profile'));
app.get("/tile", (req, res) => res.redirect('http://www.tinyurl.com/tabtiles'))
app.get("/*", (req, res) => res.redirect('http://www.tinyurl.com/tabtiles'))