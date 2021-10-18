import config from 'config';
import { existsSync, readFileSync, createWriteStream } from 'fs';
import { resolve } from 'path';

const cache: Record<string, unknown> = {};
const cached = <T>(key: string, generate: () => T) => <T>cache[key] ?? <T>(cache[key] = generate());

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

const serviceConfig = {
  get database() {
    return cached<DatabaseConfig>('database', () => ({
      database: getConfigValue('database.database', serviceConfig.application.name),
      host: getConfigValue('database.host'),
      port: getConfigValue('database.port', 5432),
      user: getConfigValue('database.user'),
      password: getConfigValue('database.password'),
      migrationsDirectory: getConfigValue('database.migrationsDirectory', undefined, true),
    }));
  },

  get application() {
    return cached<ApplicationConfig>('application', () => {
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
    });
  },

  get logger() {
    return cached<LoggerConfig>('logger', () => {
      if (serviceConfig.environment.isDevelopment) {
        return {
          prettyPrint: getConfigValue('logs.prettyPrint', {
            colorize: true,
            levelFirst: true,
            translateTime: 'yyyy-dd-mm, h:MM:ss TT',
            crlf: true,
          }),
          stream: { write: console.log },
        };
      } else {
        const logDestination = resolve(getConfigValue('logs.destination', '.logs'));
        const writeStream = createWriteStream(logDestination, { flags: 'a' });
        return {
          stream: { write: chunk => writeStream.write(chunk) },
        };
      }
    });
  },

  get environment() {
    return cached<EnvironmentConfig>('environment', () => {
      const environment = process.env.NODE_ENV?.toLowerCase().startsWith('prod') ? 'production' : 'development';
      return {
        isProduction: environment === 'production',
        isDevelopment: environment === 'development',
        environment,
      };
    });
  },

  get swagger() {
    return cached<SwaggerConfig>('swagger', () => {
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
    });
  },

  get auth() {
    return cached<AuthConfig>('auth', () => {
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
      return {
        publicKey,
        privateKey,
      };
    });
  },
};

export default serviceConfig;

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
  prettyPrint?: {
    colorize?: boolean;
    levelFirst?: boolean;
    translateTime?: string;
    crlf?: boolean;
  };
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
  privateKey?: Buffer;
  publicKey: Buffer;
}
