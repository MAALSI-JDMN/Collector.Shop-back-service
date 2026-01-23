import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

const Home: React.FC = () => {
    const navigate = useNavigate();
    const [hoveredCard, setHoveredCard] = useState<string | null>(null);

    const cardStyle = (provider: string, borderColor: string, hoverBg: string) => ({
        padding: '40px',
        border: `2px solid ${borderColor}`,
        borderRadius: '15px',
        cursor: 'pointer',
        width: '280px',
        transition: 'all 0.3s ease',
        backgroundColor: hoveredCard === provider ? hoverBg : 'white',
        color: hoveredCard === provider ? 'white' : '#333',
        boxShadow: hoveredCard === provider
            ? `0 10px 30px ${borderColor}50`
            : '0 2px 10px rgba(0,0,0,0.1)',
        transform: hoveredCard === provider ? 'translateY(-5px)' : 'translateY(0)',
    });

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
        }}>
            <div style={{ textAlign: 'center', padding: '40px' }}>
                <h1 style={{
                    fontSize: '3.5rem',
                    marginBottom: '10px',
                    color: '#1a1a2e',
                    fontWeight: 'bold'
                }}>
                    COLLECTOR<span style={{ color: '#ff0055' }}>.</span>
                </h1>
                <p style={{
                    fontSize: '1.2rem',
                    color: '#555',
                    marginBottom: '50px',
                    maxWidth: '500px'
                }}>
                    Choisissez votre provider d'authentification pour tester
                </p>

                <div style={{
                    display: 'flex',
                    gap: '30px',
                    justifyContent: 'center',
                    flexWrap: 'wrap'
                }}>
                    {/* Keycloak Card */}
                    <div
                        onClick={() => navigate('/home-keycloak')}
                        onMouseEnter={() => setHoveredCard('keycloak')}
                        onMouseLeave={() => setHoveredCard(null)}
                        style={cardStyle('keycloak', '#007bff', '#007bff')}
                    >
                        <div style={{ fontSize: '3.5rem', marginBottom: '20px' }}>🔐</div>
                        <h2 style={{
                            marginBottom: '15px',
                            fontSize: '1.5rem',
                            fontWeight: 'bold'
                        }}>
                            Keycloak
                        </h2>
                        <p style={{
                            fontSize: '0.95rem',
                            lineHeight: '1.5',
                            opacity: hoveredCard === 'keycloak' ? 1 : 0.7
                        }}>
                            Solution open-source de Red Hat pour la gestion des identites
                        </p>
                        <div style={{
                            marginTop: '20px',
                            padding: '8px 16px',
                            backgroundColor: hoveredCard === 'keycloak' ? 'rgba(255,255,255,0.2)' : '#f0f0f0',
                            borderRadius: '20px',
                            fontSize: '0.85rem',
                            display: 'inline-block'
                        }}>
                            Port: 8081
                        </div>
                    </div>

                    {/* Hydra Card */}
                    <div
                        onClick={() => navigate('/home-hydra')}
                        onMouseEnter={() => setHoveredCard('hydra')}
                        onMouseLeave={() => setHoveredCard(null)}
                        style={cardStyle('hydra', '#ff0055', '#ff0055')}
                    >
                        <div style={{ fontSize: '3.5rem', marginBottom: '20px' }}>🐙</div>
                        <h2 style={{
                            marginBottom: '15px',
                            fontSize: '1.5rem',
                            fontWeight: 'bold'
                        }}>
                            Ory Hydra
                        </h2>
                        <p style={{
                            fontSize: '0.95rem',
                            lineHeight: '1.5',
                            opacity: hoveredCard === 'hydra' ? 1 : 0.7
                        }}>
                            Serveur OAuth 2.0 et OpenID Connect certifie
                        </p>
                        <div style={{
                            marginTop: '20px',
                            padding: '8px 16px',
                            backgroundColor: hoveredCard === 'hydra' ? 'rgba(255,255,255,0.2)' : '#f0f0f0',
                            borderRadius: '20px',
                            fontSize: '0.85rem',
                            display: 'inline-block'
                        }}>
                            Port: 4444
                        </div>
                    </div>
                </div>

                <p style={{
                    marginTop: '60px',
                    color: '#888',
                    fontSize: '0.9rem',
                    padding: '15px 25px',
                    backgroundColor: 'rgba(255,255,255,0.5)',
                    borderRadius: '30px',
                    display: 'inline-block'
                }}>
                    Projet de comparaison des solutions d'authentification
                </p>
            </div>
        </div>
    );
};

export default Home;
