# Collector.Shop - Backend & Infrastructure

Ce projet contient l'API Backend (ExpressJS) et l'infrastructure de messagerie (Kafka) entièrement dockerisés.

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
  docker logs -f shop_worker
```

```bash
  docker logs -f shop_api
```

## Lancement quotidien (Rapide - sans recompiler)

```bash
  docker-compose up -d
```

Une fois la commande terminée, les services suivants sont accessibles :

- API Express : http://localhost:3000

- Kafka Broker : Port 9092 (interne)

- Worker : En arrière-plan (visible dans les logs)

## Architecture du code

Voici les fichiers clés :

- routes/kafka.js (Producteur) : Point d'entrée API. C'est ici que l'on publie les messages vers Kafka.
- kafka/consumer.js (Consommateur) : Script du Worker. C'est ici qu'il faut ajouter la logique métier asynchrone (traitement des commandes, mails, etc.).
- /client.js : Configuration technique de la connexion Kafka.
- docker-compose.yml : Orchestration des services.

## Tester l'application

Vérifier que les services communiquent entre eux via le navigateur :

GET
- http://localhost:3000/kafka/ping

### Test avancé (Postman) : 
POST

- http://localhost:3000/kafka/publish

```
{
  "eventType": "ORDER_CREATED",
  "message": "Achat carte Dracaufeu #123"
}
```

Fast pass dans la console navigateur : 

``` 
fetch('http://localhost:3000/kafka/publish', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    eventType: 'TEST_NAVIGATEUR',
    message: 'Ceci est un test envoyé depuis la console navigateur'
  })
})
.then(response => response.json())
.then(data => console.log('Réponse du serveur :', data))
.catch(error => console.error('Erreur :', error));
```

## Arrêt et nettoyage

### Pour arrêter les services proprement :

(Libère les ports mais conserve les données.)

Dans le terminal si le service en cours :

    "Ctrl + C" 

Dans le cas contraire :
```bash
  docker-compose stop
```

### Pour supprimer les conteneurs et réinitialiser les données Kafka :

(en cas d'erreur ou de conflit)

```bash
  docker-compose down -v
```