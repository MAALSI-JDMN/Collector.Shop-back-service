import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

interface LogEntry {
    id: string;
    contenu: string;
    date: string;
    source: string;
    origin?: string;
    sentAt?: number;
    latency?: number;
    isReplay?: boolean;
}

type TabType = 'latency' | 'burst' | 'replay';

const API_URL = 'http://localhost:3000';

const Battle: React.FC = () => {
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<TabType>('latency');
    const [kafkaLogs, setKafkaLogs] = useState<LogEntry[]>([]);
    const [rabbitLogs, setRabbitLogs] = useState<LogEntry[]>([]);
    const [kafkaMessage, setKafkaMessage] = useState('');
    const [rabbitMessage, setRabbitMessage] = useState('');
    const [broadcastMessage, setBroadcastMessage] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [isBursting, setIsBursting] = useState(false);
    const [isReplaying, setIsReplaying] = useState(false);
    const [burstProgress, setBurstProgress] = useState(0);

    const kafkaLogsRef = useRef<HTMLDivElement>(null);
    const rabbitLogsRef = useRef<HTMLDivElement>(null);

    // Connexion Socket.io
    useEffect(() => {
        const newSocket = io(API_URL);

        newSocket.on('connect', () => {
            setIsConnected(true);
            console.log('Socket.io connected');
        });

        newSocket.on('disconnect', () => {
            setIsConnected(false);
            console.log('Socket.io disconnected');
        });

        newSocket.on('kafka-log', (data: any) => {
            const now = Date.now();
            const latency = data.sentAt ? now - data.sentAt : null;
            const entry: LogEntry = {
                ...data,
                id: now.toString() + Math.random(),
                latency: latency
            };
            setKafkaLogs(prev => [...prev, entry]);
        });

        newSocket.on('rabbitmq-log', (data: any) => {
            const now = Date.now();
            const latency = data.sentAt ? now - data.sentAt : null;
            const entry: LogEntry = {
                ...data,
                id: now.toString() + Math.random(),
                latency: latency
            };
            setRabbitLogs(prev => [...prev, entry]);
        });

        return () => {
            newSocket.close();
        };
    }, []);

    // Auto-scroll des logs
    useEffect(() => {
        if (kafkaLogsRef.current) {
            kafkaLogsRef.current.scrollTop = kafkaLogsRef.current.scrollHeight;
        }
    }, [kafkaLogs]);

    useEffect(() => {
        if (rabbitLogsRef.current) {
            rabbitLogsRef.current.scrollTop = rabbitLogsRef.current.scrollHeight;
        }
    }, [rabbitLogs]);

    // Envoi vers Kafka
    const sendToKafka = async (message: string) => {
        if (!message.trim()) return;
        try {
            await fetch(`${API_URL}/kafka/publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    eventType: 'BATTLE_KAFKA',
                    sentAt: Date.now()
                })
            });
            setKafkaMessage('');
        } catch (error) {
            console.error('Erreur Kafka:', error);
        }
    };

    // Envoi vers RabbitMQ
    const sendToRabbit = async (message: string) => {
        if (!message.trim()) return;
        try {
            await fetch(`${API_URL}/rabbitmq/publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    eventType: 'BATTLE_RABBIT',
                    sentAt: Date.now()
                })
            });
            setRabbitMessage('');
        } catch (error) {
            console.error('Erreur RabbitMQ:', error);
        }
    };

    // Broadcast vers les deux
    const broadcast = async () => {
        const message = broadcastMessage.trim() || `BROADCAST #${Date.now()}`;
        const sentAt = Date.now();

        await Promise.all([
            fetch(`${API_URL}/kafka/publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, eventType: 'BROADCAST', sentAt })
            }),
            fetch(`${API_URL}/rabbitmq/publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, eventType: 'BROADCAST', sentAt })
            })
        ]);
        setBroadcastMessage('');
    };

    // Mode Rafale - Envoi 50 messages
    const burst = async () => {
        if (isBursting) return;
        setIsBursting(true);
        setBurstProgress(0);

        const total = 50;
        const promises = [];

        for (let i = 1; i <= total; i++) {
            const sentAt = Date.now();
            const message = `BURST #${i}`;

            promises.push(
                fetch(`${API_URL}/kafka/publish`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message, eventType: 'BURST', sentAt })
                }).then(() => setBurstProgress(p => p + 1))
            );

            promises.push(
                fetch(`${API_URL}/rabbitmq/publish`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message, eventType: 'BURST', sentAt })
                })
            );
        }

        try {
            await Promise.all(promises);
        } catch (error) {
            console.error('Erreur Rafale:', error);
        } finally {
            setTimeout(() => {
                setIsBursting(false);
                setBurstProgress(0);
            }, 500);
        }
    };

    // Replay Kafka
    const replayKafka = async () => {
        if (isReplaying) return;
        setIsReplaying(true);

        try {
            await fetch(`${API_URL}/kafka/replay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.error('Erreur Replay:', error);
        } finally {
            setTimeout(() => setIsReplaying(false), 3000);
        }
    };

    // Clear logs
    const clearLogs = () => {
        setKafkaLogs([]);
        setRabbitLogs([]);
    };

    // Calcul latence moyenne
    const avgLatency = (logs: LogEntry[]) => {
        const withLatency = logs.filter(l => l.latency !== null && l.latency !== undefined && !l.isReplay);
        if (withLatency.length === 0) return null;
        const sum = withLatency.reduce((acc, l) => acc + (l.latency || 0), 0);
        return Math.round(sum / withLatency.length);
    };

    const kafkaAvg = avgLatency(kafkaLogs);
    const rabbitAvg = avgLatency(rabbitLogs);

    // Extraire le message content du JSON
    const extractMessage = (contenu: string | Record<string, unknown>): string => {
        if (typeof contenu === 'object' && contenu !== null) {
            return String(contenu.content || JSON.stringify(contenu));
        }
        try {
            const parsed = JSON.parse(contenu);
            return parsed.content || contenu;
        } catch {
            return contenu;
        }
    };

    // Tabs data
    const tabs = [
        { id: 'latency' as TabType, label: 'Latence', icon: '⚡' },
        { id: 'burst' as TabType, label: 'Charge (Burst)', icon: '🔥' },
        { id: 'replay' as TabType, label: 'Persistance', icon: '⏪' },
    ];

    return (
        <div style={styles.wrapper}>
            {/* Header */}
            <header style={styles.header}>
                <div style={styles.headerContent}>
                    <div style={styles.logo} onClick={() => navigate('/')}>
                        COLLECTOR<span style={styles.dot}>.</span>
                    </div>
                    <h1 style={styles.title}>Battle Arena - Dashboard Comparatif</h1>
                    <div style={styles.status}>
                        <span style={{
                            ...styles.statusDot,
                            backgroundColor: isConnected ? '#00ff88' : '#ff4444'
                        }} />
                        {isConnected ? 'Connected' : 'Disconnected'}
                    </div>
                </div>
            </header>

            {/* Tabs Navigation */}
            <nav style={styles.tabsNav}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            ...styles.tabBtn,
                            ...(activeTab === tab.id ? styles.tabBtnActive : {})
                        }}
                    >
                        <span style={styles.tabIcon}>{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
                <button onClick={clearLogs} style={styles.btnClearHeader}>
                    Vider les logs
                </button>
            </nav>

            {/* Tab Content */}
            <section style={styles.tabContent}>
                {/* ===== ONGLET LATENCE ===== */}
                {activeTab === 'latency' && (
                    <div style={styles.latencyTab}>
                        <div style={styles.latencyHeader}>
                            <h2 style={styles.sectionTitle}>Test de Latence en Temps Réel</h2>
                            <p style={styles.sectionDesc}>
                                Comparez le temps de trajet aller-retour (RTT) entre Kafka et RabbitMQ
                            </p>
                        </div>

                        <div style={styles.latencyControls}>
                            {/* Kafka Input */}
                            <div style={styles.controlCard}>
                                <div style={styles.controlHeader}>
                                    <span style={styles.kafkaIcon}>K</span>
                                    <span>Kafka</span>
                                </div>
                                <input
                                    type="text"
                                    value={kafkaMessage}
                                    onChange={(e) => setKafkaMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && sendToKafka(kafkaMessage)}
                                    placeholder="Message Kafka..."
                                    style={styles.input}
                                />
                                <button
                                    onClick={() => sendToKafka(kafkaMessage || `Kafka Test ${Date.now()}`)}
                                    style={styles.btnKafka}
                                >
                                    Envoyer
                                </button>
                            </div>

                            {/* Broadcast */}
                            <div style={styles.broadcastZone}>
                                <input
                                    type="text"
                                    value={broadcastMessage}
                                    onChange={(e) => setBroadcastMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && broadcast()}
                                    placeholder="Message simultané..."
                                    style={styles.inputBroadcast}
                                />
                                <button onClick={broadcast} style={styles.btnBroadcast}>
                                    BROADCAST
                                </button>
                            </div>

                            {/* RabbitMQ Input */}
                            <div style={styles.controlCard}>
                                <div style={styles.controlHeader}>
                                    <span style={styles.rabbitIcon}>R</span>
                                    <span>RabbitMQ</span>
                                </div>
                                <input
                                    type="text"
                                    value={rabbitMessage}
                                    onChange={(e) => setRabbitMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && sendToRabbit(rabbitMessage)}
                                    placeholder="Message RabbitMQ..."
                                    style={styles.input}
                                />
                                <button
                                    onClick={() => sendToRabbit(rabbitMessage || `Rabbit Test ${Date.now()}`)}
                                    style={styles.btnRabbit}
                                >
                                    Envoyer
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ===== ONGLET BURST ===== */}
                {activeTab === 'burst' && (
                    <div style={styles.burstTab}>
                        <h2 style={styles.sectionTitle}>Test de Charge - Mode Rafale</h2>
                        <p style={styles.sectionDesc}>
                            Envoyez 50 messages simultanément aux deux brokers pour tester leur capacité de traitement
                        </p>

                        <div style={styles.burstZone}>
                            <button
                                onClick={burst}
                                disabled={isBursting}
                                style={{
                                    ...styles.btnBurstBig,
                                    opacity: isBursting ? 0.7 : 1,
                                    cursor: isBursting ? 'not-allowed' : 'pointer',
                                    transform: isBursting ? 'scale(0.98)' : 'scale(1)'
                                }}
                            >
                                {isBursting ? (
                                    <>
                                        <span style={styles.burstSpinner}></span>
                                        ENVOI EN COURS...
                                        <span style={styles.burstCounter}>{burstProgress}/50</span>
                                    </>
                                ) : (
                                    <>
                                        🔥 TIRER RAFALE
                                        <span style={styles.burstSubtext}>(50 messages)</span>
                                    </>
                                )}
                            </button>

                            <div style={styles.burstStats}>
                                <div style={styles.burstStatCard}>
                                    <span style={styles.kafkaIcon}>K</span>
                                    <span>Kafka</span>
                                    <span style={styles.burstStatValue}>{kafkaLogs.filter(l => l.source === 'kafka-worker' || l.origin?.includes('Docker')).length}</span>
                                    <span style={styles.burstStatLabel}>reçus</span>
                                </div>
                                <div style={styles.burstStatCard}>
                                    <span style={styles.rabbitIcon}>R</span>
                                    <span>RabbitMQ</span>
                                    <span style={styles.burstStatValue}>{rabbitLogs.filter(l => l.source === 'rabbitmq-worker' || l.origin?.includes('Docker')).length}</span>
                                    <span style={styles.burstStatLabel}>reçus</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ===== ONGLET REPLAY ===== */}
                {activeTab === 'replay' && (
                    <div style={styles.replayTab}>
                        <h2 style={styles.sectionTitle}>Test de Persistance - Replay Historique</h2>
                        <p style={styles.sectionDesc}>
                            Kafka conserve les messages, RabbitMQ les supprime après consommation
                        </p>

                        <div style={styles.replayComparison}>
                            {/* Kafka Replay */}
                            <div style={styles.replayCard}>
                                <div style={styles.replayCardHeader}>
                                    <span style={styles.kafkaIconLarge}>K</span>
                                    <h3>Apache Kafka</h3>
                                </div>
                                <div style={styles.replayCardBody}>
                                    <div style={styles.featureTag}>
                                        <span style={styles.checkIcon}>✓</span>
                                        Log distribué persistant
                                    </div>
                                    <div style={styles.featureTag}>
                                        <span style={styles.checkIcon}>✓</span>
                                        Retention configurable
                                    </div>
                                    <div style={styles.featureTag}>
                                        <span style={styles.checkIcon}>✓</span>
                                        Rejouable à volonté
                                    </div>
                                </div>
                                <button
                                    onClick={replayKafka}
                                    disabled={isReplaying}
                                    style={{
                                        ...styles.btnReplayKafka,
                                        opacity: isReplaying ? 0.7 : 1
                                    }}
                                >
                                    {isReplaying ? '⏳ Replay en cours...' : '✅ Replay Historique'}
                                </button>
                                <p style={styles.replayHint}>
                                    Relit tous les messages depuis le début du topic
                                </p>
                            </div>

                            {/* VS */}
                            <div style={styles.vsBlock}>VS</div>

                            {/* RabbitMQ Replay */}
                            <div style={styles.replayCard}>
                                <div style={styles.replayCardHeader}>
                                    <span style={styles.rabbitIconLarge}>R</span>
                                    <h3>RabbitMQ</h3>
                                </div>
                                <div style={styles.replayCardBody}>
                                    <div style={styles.featureTagDisabled}>
                                        <span style={styles.crossIcon}>✗</span>
                                        Queue volatile (FIFO)
                                    </div>
                                    <div style={styles.featureTagDisabled}>
                                        <span style={styles.crossIcon}>✗</span>
                                        Supprimé après ACK
                                    </div>
                                    <div style={styles.featureTagDisabled}>
                                        <span style={styles.crossIcon}>✗</span>
                                        Pas de replay natif
                                    </div>
                                </div>
                                <button
                                    disabled
                                    style={styles.btnReplayDisabled}
                                    title="Impossible sur RabbitMQ (Queue volatile)"
                                >
                                    ❌ Replay Impossible
                                </button>
                                <p style={styles.replayHintDisabled}>
                                    Les messages sont supprimés après consommation
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {/* Zone Logs - Toujours visible */}
            <section style={styles.logsSection}>
                {/* Kafka Logs */}
                <div style={styles.logPanel}>
                    <div style={styles.logHeader}>
                        <span style={styles.kafkaIcon}>K</span>
                        Flux Kafka
                        <span style={styles.logCount}>{kafkaLogs.length}</span>
                        {kafkaAvg !== null && (
                            <span style={{
                                ...styles.avgLatency,
                                color: kafkaAvg < 50 ? '#00ff88' : '#ffaa00'
                            }}>
                                ~{kafkaAvg}ms
                            </span>
                        )}
                    </div>
                    <div ref={kafkaLogsRef} style={{ ...styles.logContent, ...styles.kafkaLog }}>
                        {kafkaLogs.length === 0 ? (
                            <div style={styles.emptyLog}>En attente de messages...</div>
                        ) : (
                            kafkaLogs.map((log) => (
                                <div
                                    key={log.id}
                                    style={{
                                        ...styles.logEntry,
                                        ...(log.isReplay ? styles.logEntryReplay : {})
                                    }}
                                >
                                    {log.isReplay && <span style={styles.replayIcon}>⏪</span>}
                                    <span style={styles.logTime}>[{log.date}]</span>
                                    {log.origin && (
                                        <span style={log.isReplay ? styles.originBadgeReplay : styles.originBadge}>
                                            {log.origin}
                                        </span>
                                    )}
                                    <span style={log.isReplay ? styles.logMessageReplay : styles.logMessage}>
                                        {extractMessage(log.contenu)}
                                    </span>
                                    {log.latency !== null && log.latency !== undefined && !log.isReplay && (
                                        <span style={{
                                            ...styles.latencyBadge,
                                            color: log.latency < 50 ? '#00ff88' : '#ffaa00'
                                        }}>
                                            +{log.latency}ms
                                        </span>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* VS Separator */}
                <div style={styles.vsSeparator}>VS</div>

                {/* RabbitMQ Logs */}
                <div style={styles.logPanel}>
                    <div style={styles.logHeader}>
                        <span style={styles.rabbitIcon}>R</span>
                        Flux RabbitMQ
                        <span style={styles.logCount}>{rabbitLogs.length}</span>
                        {rabbitAvg !== null && (
                            <span style={{
                                ...styles.avgLatency,
                                color: rabbitAvg < 50 ? '#00ff88' : '#ffaa00'
                            }}>
                                ~{rabbitAvg}ms
                            </span>
                        )}
                    </div>
                    <div ref={rabbitLogsRef} style={{ ...styles.logContent, ...styles.rabbitLog }}>
                        {rabbitLogs.length === 0 ? (
                            <div style={styles.emptyLog}>En attente de messages...</div>
                        ) : (
                            rabbitLogs.map((log) => (
                                <div key={log.id} style={styles.logEntry}>
                                    <span style={styles.logTime}>[{log.date}]</span>
                                    {log.origin && (
                                        <span style={styles.originBadgeRabbit}>{log.origin}</span>
                                    )}
                                    <span style={styles.logMessageRabbit}>{extractMessage(log.contenu)}</span>
                                    {log.latency !== null && log.latency !== undefined && (
                                        <span style={{
                                            ...styles.latencyBadge,
                                            color: log.latency < 50 ? '#00ff88' : '#ffaa00'
                                        }}>
                                            +{log.latency}ms
                                        </span>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    wrapper: {
        minHeight: '100vh',
        backgroundColor: '#0a0a0f',
        color: '#fff',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
    },
    header: {
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        padding: '12px 24px',
        borderBottom: '1px solid #333',
    },
    headerContent: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: '1400px',
        margin: '0 auto',
    },
    logo: {
        fontSize: '20px',
        fontWeight: 700,
        cursor: 'pointer',
    },
    dot: {
        color: '#ff6b35',
    },
    title: {
        fontSize: '22px',
        fontWeight: 600,
        background: 'linear-gradient(90deg, #00d4ff, #ff6b35)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        margin: 0,
    },
    status: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '13px',
        color: '#888',
    },
    statusDot: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
    },

    // Tabs Navigation
    tabsNav: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 24px',
        background: '#12121a',
        borderBottom: '1px solid #2a2a3a',
        maxWidth: '1400px',
        margin: '0 auto',
    },
    tabBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 20px',
        borderRadius: '8px',
        border: '1px solid #3a3a4a',
        background: 'transparent',
        color: '#888',
        fontSize: '14px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    tabBtnActive: {
        background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
        border: '1px solid #00d4ff',
        color: '#00d4ff',
        boxShadow: '0 0 15px rgba(0, 212, 255, 0.2)',
    },
    tabIcon: {
        fontSize: '16px',
    },
    btnClearHeader: {
        marginLeft: 'auto',
        padding: '8px 16px',
        borderRadius: '6px',
        border: '1px solid #444',
        background: 'transparent',
        color: '#666',
        fontSize: '12px',
        cursor: 'pointer',
    },

    // Tab Content
    tabContent: {
        padding: '20px 24px',
        maxWidth: '1400px',
        margin: '0 auto',
    },
    sectionTitle: {
        fontSize: '20px',
        fontWeight: 600,
        marginBottom: '8px',
        color: '#fff',
    },
    sectionDesc: {
        fontSize: '14px',
        color: '#666',
        marginBottom: '24px',
    },

    // Latency Tab
    latencyTab: {},
    latencyHeader: {
        textAlign: 'center',
        marginBottom: '24px',
    },
    latencyControls: {
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        gap: '20px',
        alignItems: 'start',
    },
    controlCard: {
        background: '#12121a',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #2a2a3a',
    },
    controlHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '16px',
        fontSize: '16px',
        fontWeight: 600,
    },
    input: {
        width: '100%',
        padding: '12px 14px',
        borderRadius: '8px',
        border: '1px solid #3a3a4a',
        background: '#1a1a2a',
        color: '#fff',
        fontSize: '14px',
        marginBottom: '12px',
        boxSizing: 'border-box' as const,
    },
    btnKafka: {
        width: '100%',
        padding: '12px 16px',
        borderRadius: '8px',
        border: 'none',
        background: 'linear-gradient(135deg, #00d4ff, #0099cc)',
        color: '#fff',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
    },
    btnRabbit: {
        width: '100%',
        padding: '12px 16px',
        borderRadius: '8px',
        border: 'none',
        background: 'linear-gradient(135deg, #ff6b35, #ff4444)',
        color: '#fff',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
    },
    broadcastZone: {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
    },
    inputBroadcast: {
        width: '200px',
        padding: '12px 14px',
        borderRadius: '8px',
        border: '1px solid #3a3a4a',
        background: '#1a1a2a',
        color: '#fff',
        fontSize: '14px',
        marginBottom: '16px',
        textAlign: 'center' as const,
    },
    btnBroadcast: {
        width: '140px',
        height: '140px',
        borderRadius: '50%',
        border: '3px solid #ff4444',
        background: 'linear-gradient(135deg, #cc0000, #ff4444)',
        color: '#fff',
        fontSize: '14px',
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: '0 0 30px rgba(255, 68, 68, 0.4)',
    },

    // Burst Tab
    burstTab: {
        textAlign: 'center' as const,
    },
    burstZone: {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        gap: '30px',
        padding: '40px',
    },
    btnBurstBig: {
        width: '280px',
        height: '120px',
        borderRadius: '20px',
        border: '3px solid #ff9500',
        background: 'linear-gradient(135deg, #ff6600, #ff9500)',
        color: '#fff',
        fontSize: '22px',
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: '0 0 40px rgba(255, 149, 0, 0.4)',
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        transition: 'all 0.2s',
    },
    burstSubtext: {
        fontSize: '14px',
        fontWeight: 400,
        opacity: 0.8,
    },
    burstSpinner: {
        width: '20px',
        height: '20px',
        border: '3px solid rgba(255,255,255,0.3)',
        borderTop: '3px solid #fff',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
    burstCounter: {
        fontSize: '16px',
        fontWeight: 600,
    },
    burstStats: {
        display: 'flex',
        gap: '40px',
    },
    burstStatCard: {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        gap: '8px',
        padding: '20px 40px',
        background: '#12121a',
        borderRadius: '12px',
        border: '1px solid #2a2a3a',
    },
    burstStatValue: {
        fontSize: '36px',
        fontWeight: 700,
        color: '#00ff88',
    },
    burstStatLabel: {
        fontSize: '12px',
        color: '#666',
    },

    // Replay Tab
    replayTab: {
        textAlign: 'center' as const,
    },
    replayComparison: {
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'center',
        gap: '30px',
        marginTop: '30px',
    },
    replayCard: {
        flex: 1,
        maxWidth: '350px',
        background: '#12121a',
        borderRadius: '16px',
        padding: '30px',
        border: '1px solid #2a2a3a',
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
    },
    replayCardHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '24px',
    },
    replayCardBody: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '12px',
        marginBottom: '24px',
        width: '100%',
    },
    featureTag: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 16px',
        background: 'rgba(0, 255, 136, 0.1)',
        borderRadius: '8px',
        fontSize: '13px',
        color: '#00ff88',
    },
    featureTagDisabled: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 16px',
        background: 'rgba(255, 68, 68, 0.1)',
        borderRadius: '8px',
        fontSize: '13px',
        color: '#ff4444',
    },
    checkIcon: {
        fontSize: '16px',
        fontWeight: 700,
    },
    crossIcon: {
        fontSize: '16px',
        fontWeight: 700,
    },
    btnReplayKafka: {
        width: '100%',
        padding: '16px 24px',
        borderRadius: '10px',
        border: '2px solid #00d4ff',
        background: 'linear-gradient(135deg, #00d4ff, #0099cc)',
        color: '#fff',
        fontSize: '16px',
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: '0 0 20px rgba(0, 212, 255, 0.3)',
    },
    btnReplayDisabled: {
        width: '100%',
        padding: '16px 24px',
        borderRadius: '10px',
        border: '2px solid #444',
        background: '#2a2a3a',
        color: '#666',
        fontSize: '16px',
        fontWeight: 700,
        cursor: 'not-allowed',
    },
    replayHint: {
        marginTop: '12px',
        fontSize: '12px',
        color: '#00d4ff',
    },
    replayHintDisabled: {
        marginTop: '12px',
        fontSize: '12px',
        color: '#666',
    },
    vsBlock: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '28px',
        fontWeight: 700,
        color: '#333',
        padding: '0 20px',
    },
    kafkaIconLarge: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #00d4ff, #0099cc)',
        color: '#fff',
        fontWeight: 700,
        fontSize: '24px',
    },
    rabbitIconLarge: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #ff6b35, #ff4444)',
        color: '#fff',
        fontWeight: 700,
        fontSize: '24px',
    },

    // Icons
    kafkaIcon: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '24px',
        height: '24px',
        borderRadius: '5px',
        background: 'linear-gradient(135deg, #00d4ff, #0099cc)',
        color: '#fff',
        fontWeight: 700,
        fontSize: '12px',
    },
    rabbitIcon: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '24px',
        height: '24px',
        borderRadius: '5px',
        background: 'linear-gradient(135deg, #ff6b35, #ff4444)',
        color: '#fff',
        fontWeight: 700,
        fontSize: '12px',
    },

    // Logs Section
    logsSection: {
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        gap: '0',
        padding: '0 24px 24px',
        maxWidth: '1400px',
        margin: '0 auto',
    },
    logPanel: {
        background: '#0d0d12',
        borderRadius: '12px',
        border: '1px solid #2a2a3a',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column' as const,
    },
    logHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 16px',
        background: '#12121a',
        borderBottom: '1px solid #2a2a3a',
        fontSize: '14px',
        fontWeight: 600,
    },
    logCount: {
        marginLeft: 'auto',
        background: '#2a2a3a',
        padding: '2px 8px',
        borderRadius: '8px',
        fontSize: '12px',
        color: '#888',
    },
    avgLatency: {
        fontSize: '12px',
        fontWeight: 600,
        marginLeft: '8px',
    },
    logContent: {
        flex: 1,
        padding: '12px 16px',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: '12px',
        overflowY: 'auto' as const,
        minHeight: '280px',
        maxHeight: '280px',
    },
    kafkaLog: {
        background: 'linear-gradient(180deg, rgba(0, 212, 255, 0.03) 0%, transparent 100%)',
    },
    rabbitLog: {
        background: 'linear-gradient(180deg, rgba(255, 107, 53, 0.03) 0%, transparent 100%)',
    },
    emptyLog: {
        color: '#444',
        fontStyle: 'italic' as const,
        textAlign: 'center' as const,
        paddingTop: '40px',
        fontSize: '13px',
    },
    logEntry: {
        marginBottom: '6px',
        lineHeight: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap' as const,
    },
    logEntryReplay: {
        background: 'rgba(255, 200, 0, 0.08)',
        padding: '4px 8px',
        borderRadius: '4px',
        borderLeft: '3px solid #ffc800',
    },
    replayIcon: {
        fontSize: '12px',
    },
    logTime: {
        color: '#555',
        fontSize: '11px',
        flexShrink: 0,
    },
    originBadge: {
        background: 'rgba(0, 212, 255, 0.2)',
        color: '#00d4ff',
        padding: '2px 6px',
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: 600,
        flexShrink: 0,
    },
    originBadgeReplay: {
        background: 'rgba(255, 200, 0, 0.2)',
        color: '#ffc800',
        padding: '2px 6px',
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: 600,
        flexShrink: 0,
    },
    originBadgeRabbit: {
        background: 'rgba(255, 107, 53, 0.2)',
        color: '#ff6b35',
        padding: '2px 6px',
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: 600,
        flexShrink: 0,
    },
    logMessage: {
        color: '#00ff88',
        flex: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap' as const,
    },
    logMessageReplay: {
        color: '#ffc800',
        flex: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap' as const,
    },
    logMessageRabbit: {
        color: '#ffcc00',
        flex: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap' as const,
    },
    latencyBadge: {
        fontSize: '11px',
        fontWeight: 600,
        flexShrink: 0,
    },
    vsSeparator: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 16px',
        fontSize: '24px',
        fontWeight: 700,
        color: '#333',
    },
};

export default Battle;
