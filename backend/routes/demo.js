const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
    res.render("demo");
});

router.post("/valider", (req, res) => {
    const { nom, email, age } = req.body;
    res.render("demo-result", { nom, email, age });
});

module.exports = router;
