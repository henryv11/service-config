# Service Config

Place [environment].json under ./config/
e.g production.json / development.json / test.json  
default.json for default config

```ts
import serviceConfig from '@heviir/service-config';

// Package info
serviceConfig.packageInfo; // read from package.json
serviceConfig.packageInfo.name; // "name" from package.json
serviceConfig.packageInfo.version; // "version" from package.json defaults to "1.0.0"
serviceConfig.packageInfo.description; // "description" from package.json defaults to name + " API"

// Application config
serviceConfig.application.name; // same as packageInfo.name
serviceConfig.application.version; // same as packageInfo.version
serviceConfig.application.description; // same as packageInfo.description
serviceConfig.application.host; // config file property "host" defaults to "0.0.0.0"
serviceConfig.application.port; // config file property "port" defaults to 8080
serviceConfig.application.consumes; // config file property "consumes" defaults to ["application/json"]
serviceConfig.application.produces; // config file property "produces" defaults to ["application/json"]

// Auth config
serviceConfig.auth.publicKey; // Promise<Buffer>; read from ./keys/public_key.pem; throws if not found
serviceConfig.auth.privateKey; // Promise<Buffer | undefined>; read from ./keys/private_key.pem; optional

// Environment config
serviceConfig.environment.environment; // "test" | "development" | "production"
serviceConfig.environment.isProduction; // boolean
serviceConfig.environment.isDevelopment; // boolean
serviceConfig.environment.isTest; // boolean

// Logger config
serviceConfig.logger; // fastify pino logger options
// "test" environment:
serviceConfig.logger; // false
// "development" environment:
serviceConfig.logger.prettyPrint; // prettyPrint options; can be configured via "logger.prettyPrint" in config file
serviceConfig.logger.stream; // (message: string) => void; logs to console and writes to file
// "production" environment:
serviceConfig.logger.prettyPrint; // false; can be configured via "logger.prettyPrint" in config file
serviceConfig.logger.stream; // (message: string) => void; writes to file
// log file can be configured via "logger.destination" in config file

// Database config
serviceConfig.database.database; // same as packageInfo.name; can be configured via "database.database" in config file
serviceConfig.database.host; // defaults to "postgres_container" in "test" / "development" environment; can be configured via "database.host" in config file
serviceConfig.database.port; // defaults to 5432; can be configured via "database.port" in config file
serviceConfig.database.user; // defaults to "postgres" in "test" / "development" environment; can be configured via "database.user" in config file
serviceConfig.database.password; // defaults to "postgres" in "test" / "development" environment; can be configured via "database.password" in config file
serviceConfig.database.migrationsDirectory; // path to migration files; can be configured via "database.migrationsDirectory" in config file
```
