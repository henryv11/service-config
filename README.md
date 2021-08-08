# Service Config


Place config.json under ./config/


## Full config
```json
{
  "name": "service-name", // required, string 
  "port": 8080, // required, number
  "host": "0.0.0.0", // required, string
  "description": "description", // optional
  "version": "1.0.0", // optional, default - 1.0.0
  "produces": ["application/json"], // optional, default - application/json
  "consumes": ["application/json"], // optional, default - application/json
  "database": { // optional, required to connect to database
    "host": "postgres_host", // required, string
    "port": 5432, // required, number
    "user": "postgres_user", // required, string
    "password": "postgres_password", // required, string
    "migrationsDirectory": "./path/to/migrations", // optional
    "database", // optional, default service name
  },
  "documentation": { // optional
    "routePrefix": "/documentation", // optional, default - /documentation
    "exposeRoute": true, // optional, default - true
  },
  "logger": { // optional
    "prettyPrint": true // optional true if dev else false
  }
}
```

## Required config

```json
{  
    "name": "service name",
    "port": 8080,
    "host": "0.0.0.0",
    "version": "1.0.0", // recommended
    "database": { // required for database connection
        "host": "postgres_host",
        "port": 5432,
        "user": "postgres_user",
        "password": "postgres_password",
        "migrationsDirectory": "./path/to/migrations", // optional, need this to run database migrations
    },
}
```


## Usage

```ts
import config from '@heviir/service-config';

/*
@heviir/fastify-pg config
throws if not present in config or invalid
*/
const databaseConfig = config.database;

/*
general application config
throws if not present in config or invalid
*/
const applicationConfig = config.application;

/*
@heviir/fastify-auth config
throws if public key is not present under ./keys/public_key.pem
*/
const authConfig = config.auth;
// buffer, requires ./keys/public_key.pem
authConfig.publicKey;
// optional, buffer, requires ./keys/private_key.pem
authConfig.privateKey;

// fastify-swagger config
const swaggerConfig = config.swagger;
```