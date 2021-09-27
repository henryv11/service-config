import config from 'config';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const serviceConfig = {
  get database() {
    const databaseConfig: DatabaseConfig = {
      database: getConfigValue('database.database', serviceConfig.application.name),
      host: getConfigValue('database.host'),
      port: getConfigValue('database.port', 5432),
      user: getConfigValue('database.user'),
      password: getConfigValue('database.password'),
      migrationsDirectory: getConfigValue<string | undefined>('database.migrationsDirectory', undefined, true),
    };
    return databaseConfig;
  },

  get application() {
    const name = getConfigValue<string>('name');
    const applicationConfig: ApplicationConfig = {
      name,
      host: getConfigValue('host'),
      port: getConfigValue('port'),
      version: getConfigValue('version', '1.0.0'),
      description: getConfigValue('description', `${name} service`),
      consumes: getConfigValue('consumes', ['application/json']),
      produces: getConfigValue('produces', ['application/json']),
    };
    return applicationConfig;
  },

  get logger() {
    const loggerConfig: LoggerConfig = {
      prettyPrint: serviceConfig.environment.isDevelopment,
    };
    return loggerConfig;
  },

  get environment() {
    const environment = process.env.NODE_ENV || 'development';
    const environmentConfig: EnvironmentConfig = {
      isProduction: environment === 'production',
      isDevelopment: environment === 'development',
    };
    return environmentConfig;
  },

  get swagger() {
    const applicationConfig = serviceConfig.application;
    const swaggerConfig: SwaggerConfig = {
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
    return swaggerConfig;
  },

  get auth() {
    const publicKeyPath = resolve('keys', 'public_key.pem');
    const privateKeyPath = resolve('keys', 'private_key.pem');
    if (!existsSync(publicKeyPath)) {
      throw new Error('Public key is missing');
    }
    const publicKey = readFileSync(publicKeyPath);
    let privateKey: Buffer | undefined;
    if (existsSync(privateKeyPath)) {
      privateKey = readFileSync(privateKeyPath);
    }
    const authConfig: AuthConfig = {
      publicKey,
      privateKey,
    };

    return authConfig;
  },
};

export default serviceConfig;

function getConfigValue<T>(key: string, defaultValue?: T): T;
function getConfigValue<T>(key: string, defaultValue: T, isUndefinedAllowed: true): T;
function getConfigValue<T>(key: string, defaultValue?: T, isUndefinedAllowed = false) {
  if (config.has(key)) {
    return config.get<T>(key);
  }
  if (!isUndefinedAllowed && defaultValue === undefined) {
    throw new Error(`application config is missing required property ${key} without default value`);
  }
  return defaultValue;
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
  prettyPrint: boolean;
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
}

interface AuthConfig {
  privateKey?: Buffer;
  publicKey: Buffer;
}
