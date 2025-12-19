import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

const Home: React.FC = () => {
    const navigate = useNavigate();

    const handleLoginClick = () => {
        navigate('/login');
    };

    const categories = [
        { id: 1, title: "Sneakers Édition Limitée", icon: "👟" },
        { id: 2, title: "Figurines & Jouets", icon: "🤖" },
        { id: 3, title: "Posters Dédicacés", icon: "🖼️" },
        { id: 4, title: "Cassettes & Vintage", icon: "📼" },
    ];

    return (
        <div className="home-wrapper">
            {/* Navigation Bar */}
            <nav className="navbar">
                <div className="container navbar-content">
                    <div className="logo">COLLECTOR<span className="dot">.</span></div>
                    <div className="nav-links">
                        <button className="btn-secondary">Vendre un objet</button>
                        <button className="btn-primary" onClick={handleLoginClick}>Se connecter</button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="hero">
                <div className="container hero-content">
                    <h1>Ravivez vos souvenirs & émotions</h1>
                    <p>
                        La première plateforme sécurisée entre particuliers dédiée aux objets d'exception.
                        Trouvez la perle rare ou donnez une seconde vie à votre collection.
                    </p>
                    <div className="hero-buttons">
                        <button className="btn-cta">Explorer le catalogue</button>
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
                    <p>🛡️ Paiement sécurisé • Garantie Collector • Vérification des annonces</p>
                </div>
            </section>
        </div>
    );
};

export default Home;