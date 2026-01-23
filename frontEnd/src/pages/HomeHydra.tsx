import React, { useEffect, useState } from 'react';
import '../App.css';

const HomeHydra: React.FC = () => {
    // Initialiser directement depuis localStorage
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        return !!localStorage.getItem('access_token');
    });
    const [userProfile, setUserProfile] = useState<any>(() => {
        const userInfo = localStorage.getItem('user_info');
        if (userInfo) {
            try {
                return JSON.parse(userInfo);
            } catch {
                return null;
            }
        }
        return null;
    });

    const loginWithHydra = () => {
        const clientId = "my-react-client";
        const redirectUri = encodeURIComponent("http://localhost:3001/callback-hydra");
        const scope = encodeURIComponent("openid offline");
        const state = "random_string_xyz";

        window.location.href = `http://localhost:4444/oauth2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}`;
    };

    const handleLogoutClick = () => {
        const idToken = localStorage.getItem('id_token');

        // Supprimer les tokens locaux
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('id_token');
        localStorage.removeItem('user_info');
        setIsAuthenticated(false);
        setUserProfile(null);

        // Deconnecter aussi de Hydra (invalider la session cote serveur)
        if (idToken) {
            const postLogoutRedirect = encodeURIComponent('http://localhost:3001/home-hydra');
            window.location.href = `http://localhost:4444/oauth2/sessions/logout?id_token_hint=${idToken}&post_logout_redirect_uri=${postLogoutRedirect}`;
        }
    };

    const categories = [
        { id: 1, title: "Sneakers Edition Limitee", icon: "👟" },
        { id: 2, title: "Figurines & Jouets", icon: "🤖" },
        { id: 3, title: "Posters Dedicaces", icon: "🖼️" },
        { id: 4, title: "Cassettes & Vintage", icon: "📼" },
    ];

    return (
        <div className="home-wrapper">
            {/* Navigation Bar */}
            <nav className="navbar">
                <div className="container navbar-content">
                    <div className="logo">COLLECTOR<span className="dot">.</span> <span style={{fontSize: '12px', color: '#ff0055'}}>(Hydra/Ory)</span></div>
                    <div className="nav-links">
                        <a href="/" style={{marginRight: '15px', color: '#666', textDecoration: 'none'}}>Changer de provider</a>
                        <button className="btn-secondary">Vendre un objet</button>

                        {!isAuthenticated ? (
                            <button onClick={loginWithHydra} style={{backgroundColor: '#ff0055', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer'}}>
                                Se connecter avec Hydra
                            </button>
                        ) : (
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <span style={{ fontWeight: 'bold' }}>
                                    Bonjour, {userProfile?.email || "Membre"}
                                </span>
                                <button className="btn-primary" onClick={handleLogoutClick}>
                                    Deconnexion
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="hero">
                <div className="container hero-content">
                    <h1>Ravivez vos souvenirs & emotions</h1>
                    <p>
                        La premiere plateforme securisee entre particuliers dediee aux objets d'exception.
                        Trouvez la perle rare ou donnez une seconde vie a votre collection.
                    </p>
                    <div className="hero-buttons">
                        <button className="btn-cta">Explorer le catalogue</button>
                        {isAuthenticated && (
                            <button className="btn-secondary" style={{marginLeft: '10px'}}>
                                Mon Tableau de bord
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Categories Section */}
            <section className="categories-section">
                <div className="container">
                    <h2>Nos Univers de Collection</h2>
                    <div className="grid">
                        {categories.map((cat) => (
                            <div key={cat.id} className="card">
                                <div className="card-icon">{cat.icon}</div>
                                <h3>{cat.title}</h3>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Trust Section */}
            <section className="trust-section">
                <div className="container">
                    <p>Paiement securise - Garantie Collector - Verification des annonces</p>
                </div>
            </section>
        </div>
    );
};

export default HomeHydra;
