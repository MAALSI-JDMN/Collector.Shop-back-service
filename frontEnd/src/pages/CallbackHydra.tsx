import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function CallbackHydra() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const processedRef = useRef(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (processedRef.current) return;
        processedRef.current = true;

        const code = searchParams.get('code');
        const errorParam = searchParams.get('error');
        const errorDesc = searchParams.get('error_description');

        if (errorParam) {
            setError(`Erreur d'authentification : ${errorDesc || errorParam}`);
            return;
        }

        if (!code) {
            setError("Code d'autorisation introuvable.");
            return;
        }

        const exchangeCode = async () => {
            try {
                const response = await fetch('http://localhost:3000/hydra/callback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Erreur lors de l'echange de token");
                }

                console.log("Login reussi !", data);

                // Stocker tous les tokens
                localStorage.setItem('access_token', data.accessToken);
                localStorage.setItem('refresh_token', data.refreshToken);
                localStorage.setItem('id_token', data.idToken);
                localStorage.setItem('user_info', JSON.stringify(data.user));

                navigate('/home-hydra', { replace: true });

            } catch (err: any) {
                console.error(err);
                setError(err.message || "Erreur de connexion au serveur.");
            }
        };

        exchangeCode();
    }, [searchParams, navigate]);

    if (error) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px', color: 'red' }}>
                <div>
                    <h2>Oups !</h2>
                    <p>{error}</p>
                    <button onClick={() => navigate('/home-hydra')}>Retour</button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '100px' }}>
            <div style={{ fontSize: '24px', marginBottom: '20px' }}>Chargement...</div>
            <h3>Connexion securisee en cours...</h3>
        </div>
    );
}
