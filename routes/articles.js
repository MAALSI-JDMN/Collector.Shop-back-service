var express = require('express');
var router = express.Router();
const db = require('../database')

/* GET users listing. */
router.get('/', (req, res) => {
    db.all("SELECT * FROM articles", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

module.exports = router;
