var express = require('express');
var router = express.Router();
const db = require('../database')

// GET /articles
router.get('/', (req, res) => {
    db.all("SELECT * FROM articles", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// POST /articles
router.post('/', (req, res) => {
    const { nom, prix, stock } = req.body;

    // Validation des champs
    if(!nom || prix == null || stock == null) {
        return res.status(400).json({ error: "Champs manquants" });
    }

    // Insertion dans la base de données
    const sql = 'INSERT INTO articles (nom, prix, stock) VALUES (?, ?, ?)';
    const params = [nom, prix, stock];

    // Exécution de la requête
    db.run(sql, params, function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        // `this.lastID` contient l'id de l'article inséré
        res.status(201).json({
            message: "Article ajouté avec succès",
            article: { id: this.lastID, nom, prix, stock }
        });
    });
});

// DELETE /articles/:id
router.delete('/:id', (req, res) => {3
    const { id } = req.params;

    // Requête de suppression
    const sql = 'DELETE FROM articles WHERE id = ?';

    // Exécution de la requête
    db.run(sql, id, function(err) {
        // Gestion des erreurs
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Vérification si un article a été supprimé & retour d'une erreur 404 si aucun article trouvé
        if (this.changes === 0) {
            return res.status(404).json({ error: "Article non trouvé" });
        }

        res.json({ message: "Article supprimé avec succès" });
    });
});

// PATCH /articles/:id
router.patch('/:id', (req, res) => {
    const { id } = req.params;

    const { nom, prix, stock } = req.body;

    // Construction dynamique de la requête SQL
    let fields = [];
    let params = [];

    // Si un champ est fourni, on l'ajoute à la requête
    if (nom !== undefined) {
        fields.push("nom = ?");
        params.push(nom);
    }

    if (prix !== undefined) {
        fields.push("prix = ?");
        params.push(prix);
    }

    if (stock !== undefined) {
        fields.push("stock = ?");
        params.push(stock);
    }

    // Si aucun champ n'est fourni, on retourne une erreur
    if (fields.length === 0) {
        return res.status(400).json({ error: "Aucun champ à mettre à jour" });
    }

    params.push(id);

    // Requête de mise à jour
    const sql = `UPDATE articles SET ${fields.join(", ")} WHERE id = ?`;

    // Exécution de la requête
    db.run(sql, params, function(err) {
        // Gestion des erreurs
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Vérification si un article a été mis à jour & retour d'une erreur 404 si aucun article trouvé
        if (this.changes === 0) {
            return res.status(404).json({ error: "Article non trouvé" });
        }

        res.json({ message: "Article mis à jour avec succès" });
    });
});


module.exports = router;
