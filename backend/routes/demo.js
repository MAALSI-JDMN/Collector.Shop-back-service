const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
    res.render("demo");
});

router.post("/valider", (req, res) => {
    const { nom, email, age } = req.body;
    res.send(`Nom: ${nom} | Email: ${email} | Age: ${age}`);
});

module.exports = router;
