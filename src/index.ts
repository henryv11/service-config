import config from 'config';
import { createWriteStream, readFile } from 'fs';
import { resolve } from 'path';

const serviceConfig = {
  get database() {
    return cached(getDatabaseConfig);
  },

  get application() {
    return cached(getApplicationConfig);
  },

  get logger() {
    return cached(getLoggerConfig);
  },

  get environment() {
    return cached(getEnvironmentConfig);
  },

  get swagger() {
    return cached(getSwaggerConfig);
  },

  get auth() {
    return cached(getAuthConfig);
  },
};

export default serviceConfig;

const cache: Record<string, unknown> = {};
function cached<T>(generate: { (): T; name: string }) {
  return <T>cache[generate.name] ?? <T>(cache[generate.name] = generate());
}

function getConfigValue<T>(key: string, defaultValue?: T): T;
function getConfigValue<T>(key: string, defaultValue: T | undefined, isUndefinedAllowed: true): T | undefined;
function getConfigValue<T>(key: string, defaultValue?: T, isUndefinedAllowed = false) {
  if (config.has(key)) {
    return config.get<T>(key);
  }
  if (!isUndefinedAllowed && defaultValue === undefined) {
    throw new Error(`service config is missing required property "${key}"`);
  }
  return defaultValue;
}

function getDatabaseConfig(): DatabaseConfig {
  return {
    database: getConfigValue('database.database', serviceConfig.application.name),
    host: getConfigValue('database.host'),
    port: getConfigValue('database.port', 5432),
    user: getConfigValue('database.user'),
    password: getConfigValue('database.password'),
    migrationsDirectory: getConfigValue('database.migrationsDirectory', undefined, true),
  };
}

function getApplicationConfig(): ApplicationConfig {
  const name = getConfigValue<string>('name');
  return {
    name,
    host: getConfigValue('host', '0.0.0.0'),
    port: getConfigValue('port', 8080),
    version: getConfigValue('version', '1.0.0'),
    description: getConfigValue('description', `${name} service`),
    consumes: getConfigValue('consumes', ['application/json']),
    produces: getConfigValue('produces', ['application/json']),
  };
}

function getLoggerConfig(): LoggerConfig {
  const logDestination = getConfigValue('logger.destination', '.logs');
  const writeStream = createWriteStream(resolve(logDestination), { flags: 'a', encoding: 'utf-8' });
  if (serviceConfig.environment.isDevelopment) {
    return {
      prettyPrint: getConfigValue('logger.prettyPrint', {
        colorize: true,
        levelFirst: true,
        translateTime: 'yyyy-dd-mm, h:MM:ss TT',
        crlf: true,
      }),
      stream: {
        write: chunk => {
          console.log(chunk);
          writeStream.write(chunk, 'utf8');
        },
      },
    };
  } else {
    return {
      prettyPrint: getConfigValue('logger.prettyPrint', false),
      stream: { write: chunk => writeStream.write(chunk, 'utf-8') },
    };
  }
}

function getEnvironmentConfig(): EnvironmentConfig {
  const environment = process.env.NODE_ENV?.toLowerCase().startsWith('prod') ? 'production' : 'development';
  return {
    isProduction: environment === 'production',
    isDevelopment: environment === 'development',
    environment,
  };
}

function getSwaggerConfig(): SwaggerConfig {
  const applicationConfig = serviceConfig.application;
  return {
    routePrefix: getConfigValue('documentation.routePrefix', '/documentation'),
    exposeRoute: getConfigValue('documentation.exposeRoutes', true),
    swagger: {
      info: {
        title: `${applicationConfig.name} API`,
        description: applicationConfig.description,
        version: applicationConfig.version,
      },
      host: getConfigValue('documentation.host', 'api.dropshoppers.ee/' + applicationConfig.name),
      consumes: applicationConfig.consumes,
      produces: applicationConfig.produces,
    },
  };
}

function getAuthConfig(): AuthConfig {
  return {
    publicKey: new Promise((onResolve, onReject) => {
      const path = resolve('keys', 'public_key.pem');
      readFile(path, (error, data) => {
        if (error) {
          onReject(new Error('missing public key'));
        } else {
          onResolve(data);
        }
      });
    }),
    privateKey: new Promise(onResolve => {
      const path = resolve('keys', 'private_key.pem');
      readFile(path, (error, data) => {
        if (error) {
          onResolve(undefined);
        } else {
          onResolve(data);
        }
      });
    }),
  };
}

interface DatabaseConfig {
  database: string;
  host: string;
  port: number;
  user: string;
  password: string;
  migrationsDirectory?: string;
}

interface ApplicationConfig {
  host: string;
  port: number;
  name: string;
  version: string;
  description: string;
  consumes: string[];
  produces: string[];
}

interface LoggerConfig {
  prettyPrint?:
    | {
        colorize?: boolean;
        levelFirst?: boolean;
        translateTime?: string;
        crlf?: boolean;
      }
    | boolean;
  stream: { write(chunk: string): void };
}

interface SwaggerConfig {
  routePrefix: string;
  exposeRoute: boolean;
  swagger: {
    info: {
      title: string;
      description?: string;
      version: string;
    };
    consumes: string[];
    produces: string[];
    host: string;
  };
}

interface EnvironmentConfig {
  isProduction: boolean;
  isDevelopment: boolean;
  environment: 'production' | 'development';
}

interface AuthConfig {
  privateKey: Promise<Buffer | undefined>;
  publicKey: Promise<Buffer>;
}
