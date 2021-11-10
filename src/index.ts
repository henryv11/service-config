import config from 'config';
import { createWriteStream, readFile, readFileSync } from 'fs';
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

  get packageInfo() {
    return cached(getPackageInfo);
  },
};

export default serviceConfig;

const cache: Record<string, unknown> = {};
function cached<T>(generate: { (): T; name: string }) {
  return generate.name in cache ? <T>cache[generate.name] : <T>(cache[generate.name] = generate());
}

function getConfigValue<T>(key: string, defaultValue?: T, isUndefinedAllowed?: false): T;
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
  const environment = serviceConfig.environment;
  const defaults =
    environment.isDevelopment || environment.isTest
      ? { host: 'postgres_container', user: 'postgres', password: 'postgres', port: 5432 }
      : { port: 5432 };
  return {
    database: getConfigValue('database.database', serviceConfig.application.name),
    host: getConfigValue('database.host', defaults.host),
    port: getConfigValue('database.port', defaults.port),
    user: getConfigValue('database.user', defaults.user),
    password: getConfigValue('database.password', defaults.password),
    migrationsDirectory: getConfigValue('database.migrationsDirectory', undefined, true),
  };
}

function getApplicationConfig(): ApplicationConfig {
  const { name, version, description } = serviceConfig.packageInfo;
  return {
    name,
    version,
    description,
    host: getConfigValue('host', '0.0.0.0'),
    port: getConfigValue('port', 8080),
    consumes: getConfigValue('consumes', ['application/json']),
    produces: getConfigValue('produces', ['application/json']),
  };
}

function getLoggerConfig(): LoggerConfig | boolean {
  const environment = serviceConfig.environment;
  if (environment.isTest) {
    return false;
  }
  const encoding = 'utf-8';
  const logDestination = getConfigValue('logger.destination', '.logs');
  const writeStream = createWriteStream(resolve(logDestination), { flags: 'a', encoding });
  if (environment.isDevelopment) {
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
          writeStream.write(chunk, encoding);
        },
      },
    };
  }
  return {
    prettyPrint: getConfigValue('logger.prettyPrint', false),
    stream: { write: chunk => writeStream.write(chunk, encoding) },
  };
}

function getEnvironmentConfig(): EnvironmentConfig {
  const nodeEnv = process.env.NODE_ENV?.toLowerCase() || '';
  const environment = nodeEnv.startsWith('prod') ? 'production' : nodeEnv.startsWith('test') ? 'test' : 'development';
  return {
    isProduction: environment === 'production',
    isDevelopment: environment === 'development',
    isTest: environment === 'test',
    environment,
  };
}

function getSwaggerConfig(): SwaggerConfig {
  const applicationConfig = serviceConfig.application;
  return {
    routePrefix: getConfigValue('documentation.routePrefix', '/documentation'),
    exposeRoute: getConfigValue('documentation.exposeRoute', true),
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
  const defaultBrokersByEnvironment = {
    development: ['kafka:29092'],
    test: [],
    production: undefined,
  };
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
    kafka: {
      clientId: serviceConfig.application.name,
      brokers: getConfigValue('auth.kafka.brokers', defaultBrokersByEnvironment[serviceConfig.environment.environment]),
      groupId: serviceConfig.application.name + '_' + process.pid,
    },
  };
}

function getPackageInfo(): PackageInfo {
  const path = resolve('package.json');
  const packageString = readFileSync(path, { encoding: 'utf-8' });
  const { name, version = '1.0.0', description = name + ' service' } = JSON.parse(packageString);
  if (!name) {
    throw new Error('package.json is missing property "name"');
  }
  return { name, version, description };
}

interface PackageInfo {
  name: string;
  version: string;
  description: string;
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
  isTest: boolean;
  environment: 'production' | 'development' | 'test';
}

interface AuthConfig {
  privateKey: Promise<Buffer | undefined>;
  publicKey: Promise<Buffer>;
  kafka: {
    groupId: string;
    clientId: string;
    brokers: string[];
  };
}
