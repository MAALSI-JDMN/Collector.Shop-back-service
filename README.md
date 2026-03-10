# Collector.Shop - Backend & Infrastructure

Ce projet contient l'API Backend (ExpressJS) et l'infrastructure de messagerie (Kafka + RabbitMQ) entièrement dockerisés.

## Prérequis

- **Docker Desktop** installé et lancé.

## Premier lancement (ou après modification du code)

Pour construire les images et lancer l'environnement complet :

```bash
  docker-compose up --build
```
mode silencieux (lance en arrière-plan et rend la main sur le terminal immédiatement) :
```bash
  docker-compose up -d --build
```

### Voir les logs en mode silencieux

(Les logs sont visibles de base sur Docker desktop)

```bash
  docker logs -f shop_worker          # Worker Kafka
```

```bash
  docker logs -f shop_worker_rabbit   # Worker RabbitMQ
```

```bash
  docker logs -f shop_api
```

## Lancement quotidien (Rapide - sans recompiler)

```bash
  docker-compose up -d
```

Une fois la commande terminée, les services suivants sont accessibles :

| Service | URL | Identifiants |
|---------|-----|--------------|
| API Express | http://localhost:3000 | - |
| Frontend React | http://localhost:8080 | - |
| RabbitMQ Management | http://localhost:15672 | guest / guest |
| Keycloak Admin | http://localhost:8081 | admin / admin |
| Kafka Broker | Port 9092 (interne) | - |

## Architecture du code

### Structure Messaging (Architecture Miroir Kafka/RabbitMQ)

Le projet implémente deux systèmes de messaging de manière identique pour permettre un **benchmark comparatif**.

| Composant | Kafka                | RabbitMQ |
|-----------|----------------------|----------|
| **Client** | `kafka/client.js`    | `rabbitmq/client.js` |
| **Producer** | `routes/kafka.js`    | `routes/rabbitmq.js` |
| **Consumer** | `kafka/consumer.js`  | `rabbitmq/consumer.js` |
| **Worker** | `shop_worker`        | `shop_worker_rabbit` |
| **Destination** | Topic `COMMAND_EVENT` | Queue `quickstart-events` |

### Fichiers clés

- `routes/kafka.js` - Producteur Kafka (API)
- `routes/rabbitmq.js` - Producteur RabbitMQ (API)
- `kafka/consumer.js` - Script du Worker Kafka
- `rabbitmq/consumer.js` - Script du Worker RabbitMQ
- `docker-compose.yml` - Orchestration des services

## Tester l'application

### Test Kafka

Vérifier la connectivité via le navigateur :

**GET**
- http://localhost:3000/kafka/ping

**POST** (Postman ou curl)
- http://localhost:3000/kafka/publish

```json
{
  "eventType": "ORDER_CREATED",
  "message": "Achat carte Dracaufeu #123"
}
```

### Test RabbitMQ

Vérifier la connectivité via le navigateur :

**GET**
- http://localhost:3000/rabbitmq/ping

**POST** (Postman ou curl)
- http://localhost:3000/rabbitmq/publish

```json
{
  "eventType": "ORDER_CREATED",
  "message": "Achat carte Dracaufeu #123"
}
```

### Fast pass dans la console navigateur

**Kafka :**
``` javascript
fetch('http://localhost:3000/kafka/publish', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    eventType: 'TEST_KAFKA',
    message: 'Test envoyé via Kafka'
  })
})
.then(response => response.json())
.then(data => console.log('Kafka :', data));
```

**RabbitMQ :**
``` javascript
fetch('http://localhost:3000/rabbitmq/publish', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    eventType: 'TEST_RABBITMQ',
    message: 'Test envoyé via RabbitMQ'
  })
})
.then(response => response.json())
.then(data => console.log('RabbitMQ :', data));
```

### Monitoring RabbitMQ

Accédez à l'interface de management RabbitMQ pour voir les queues, messages et connexions :

- URL : http://localhost:15672
- Login : `guest`
- Password : `guest`

## Arrêt et nettoyage

### Pour arrêter les services proprement :

(Libère les ports mais conserve les données.)

Dans le terminal si le service en cours :

    "Ctrl + C"

Dans le cas contraire :
```bash
  docker-compose stop
```

### Pour supprimer les conteneurs et réinitialiser les données :

(en cas d'erreur ou de conflit)

```bash
  docker-compose down -v
```
