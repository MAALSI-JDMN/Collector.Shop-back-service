import React, { useEffect, useState, useRef } from 'react';
import keycloak from '../keycloak'
import '../App.css';

const HomeKeycloak: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const isRun = useRef(false);

    useEffect(() => {
        if (isRun.current) return;
        isRun.current = true;

        keycloak.init({
            onLoad: 'check-sso',
            checkLoginIframe: false
        }).then((authenticated: boolean | ((prevState: boolean) => boolean)) => {
            setIsAuthenticated(authenticated);
            if (authenticated) {
                keycloak.loadUserProfile().then((profile: any) => {
                    setUserProfile(profile);
                });
            }
            setLoading(false);
        }).catch((err) => {
            console.error(err);
            setLoading(false);
        });
    }, []);

    const handleLoginClick = () => {
        keycloak.login();
    };

    const handleLogoutClick = () => {
        keycloak.logout();
    };

    const categories = [
        { id: 1, title: "Sneakers Edition Limitee", icon: "👟" },
        { id: 2, title: "Figurines & Jouets", icon: "🤖" },
        { id: 3, title: "Posters Dedicaces", icon: "🖼️" },
        { id: 4, title: "Cassettes & Vintage", icon: "📼" },
    ];

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <div>Chargement Keycloak...</div>
            </div>
        );
    }

    return (
        <div className="home-wrapper">
            {/* Navigation Bar */}
            <nav className="navbar">
                <div className="container navbar-content">
                    <div className="logo">COLLECTOR<span className="dot">.</span> <span style={{fontSize: '12px', color: '#007bff'}}>(Keycloak)</span></div>
                    <div className="nav-links">
                        <a href="/" style={{marginRight: '15px', color: '#666', textDecoration: 'none'}}>Changer de provider</a>
                        <button className="btn-secondary">Vendre un objet</button>

                        {!isAuthenticated ? (
                            <button className="btn-primary" onClick={handleLoginClick}>
                                Se connecter
                            </button>
                        ) : (
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <span style={{ fontWeight: 'bold' }}>
                                    Bonjour, {userProfile?.firstName || "Membre"}
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

export default HomeKeycloak;
