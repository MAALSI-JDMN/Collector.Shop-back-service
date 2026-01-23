var express = require('express');
var router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database');
const { Configuration, OAuth2Api } = require('@ory/client');

const hydraAdmin = new OAuth2Api(new Configuration({
    basePath: 'http://hydra:4445',
}));

// Verifier le login challenge
router.post('/login-request', async (req, res) => {
    const { challenge } = req.body;
    if (!challenge) {
        return res.status(400).json({ error: "Challenge manquant" });
    }
    try {
        const { data: loginRequest } = await hydraAdmin.getOAuth2LoginRequest({ loginChallenge: challenge });
        if (loginRequest.skip) {
            const { data: accept } = await hydraAdmin.acceptOAuth2LoginRequest({
                loginChallenge: challenge,
                acceptOAuth2LoginRequest: { subject: loginRequest.subject },
            });
            return res.json({ redirectTo: accept.redirect_to });
        }
        return res.json({ showForm: true });
    } catch (e) {
        console.error("Erreur Hydra /login-request:", e.response ? e.response.data : e.message);
        res.status(500).json({ error: "Erreur lors de la communication avec Hydra" });
    }
});

// Soumettre le login
router.post('/login-submit', async (req, res) => {
    const { challenge, email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Email et mot de passe requis" });
    }
    const query = "SELECT * FROM users WHERE email = ?";
    db.get(query, [email], async (err, user) => {
        if (err) {
            console.error("Erreur DB:", err);
            return res.status(500).json({ error: "Erreur de base de donnees" });
        }
        if (!user || !bcrypt.compareSync(password, user.password_hash)) {
            return res.status(401).json({ error: "Email ou mot de passe incorrect" });
        }
        try {
            const { data: accept } = await hydraAdmin.acceptOAuth2LoginRequest({
                loginChallenge: challenge,
                acceptOAuth2LoginRequest: {
                    subject: String(user.id),
                    remember: true,
                    remember_for: 3600,
                    context: {
                        email: user.email
                    }
                },
            });
            return res.json({ redirectTo: accept.redirect_to });
        } catch (e) {
            console.error("Erreur Hydra /login-submit:", e.response ? e.response.data : e.message);
            res.status(500).json({ error: "Impossible de valider le login aupres de Hydra" });
        }
    });
});

// Consent auto-approve
router.get('/consent', async (req, res, next) => {
    const challenge = req.query.consent_challenge;
    if (!challenge) {
        return next(new Error("Challenge de consentement manquant"));
    }
    try {
        const { data: consentRequest } = await hydraAdmin.getOAuth2ConsentRequest({ consentChallenge: challenge });
        const { data: accept } = await hydraAdmin.acceptOAuth2ConsentRequest({
            consentChallenge: challenge,
            acceptOAuth2ConsentRequest: {
                grant_scope: consentRequest.requested_scope,
                grant_access_token_audience: consentRequest.requested_access_token_audience,
                session: {
                    id_token: {
                        email: consentRequest.context?.email || "user@example.com"
                    }
                }
            }
        });
        res.redirect(accept.redirect_to);
    } catch (e) {
        next(e);
    }
});

// Logout auto-approve
router.get('/logout', async (req, res, next) => {
    const challenge = req.query.logout_challenge;
    if (!challenge) {
        return next(new Error("Challenge de logout manquant"));
    }
    try {
        // Accepter automatiquement la demande de logout
        const { data: accept } = await hydraAdmin.acceptOAuth2LogoutRequest({
            logoutChallenge: challenge,
        });
        res.redirect(accept.redirect_to);
    } catch (e) {
        console.error("Erreur Hydra /logout:", e.response ? e.response.data : e.message);
        next(e);
    }
});

// Inscription
router.post('/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Email et mot de passe requis" });
    }
    db.get("SELECT id FROM users WHERE email = ?", [email], (err, row) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Erreur base de donnees" });
        }
        if (row) {
            return res.status(409).json({ error: "Cet email est deja utilise" });
        }
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(password, salt);
        const stmt = db.prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)");
        stmt.run(email, hash, function(err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: "Erreur lors de la creation de l'utilisateur" });
            }
            res.json({ success: true, message: "Utilisateur cree avec succes" });
        });
        stmt.finalize();
    });
});

// Callback - echange code contre tokens
router.post('/callback', async (req, res) => {
    const { code } = req.body;
    if (!code) {
        return res.status(400).json({ error: "Code d'autorisation manquant" });
    }
    try {
        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('redirect_uri', 'http://localhost:3001/callback-hydra');
        params.append('client_id', 'my-react-client');
        params.append('client_secret', 'my-secret-password');

        const response = await fetch('http://hydra:4444/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Erreur Hydra Token:', data);
            return res.status(401).json({ error: "Echec de l'echange de token", details: data });
        }

        const idToken = data.id_token;
        let userPayload = {};
        if (idToken) {
            const base64Url = idToken.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            userPayload = JSON.parse(atob(base64));
        }

        res.json({
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            idToken: data.id_token,
            expiresIn: data.expires_in,
            user: userPayload
        });
    } catch (error) {
        console.error('Erreur Backend Callback:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

module.exports = router;
