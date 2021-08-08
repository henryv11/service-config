import config from 'config';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const serviceConfig = {
  get database() {
    if (!config.has('database')) {
      throw new Error('no database config provided');
    }
    const databaseConfig = config.get<DatabaseConfig>('database');
    databaseConfig.database ??= serviceConfig.application.name;
    for (const prop of <const>['host', 'port', 'user', 'password', 'database']) {
      if (!databaseConfig[prop]) {
        throw new Error(`database config is missing property '${prop}'`);
      }
    }
    return databaseConfig;
  },

  get application() {
    const name = config.get<string>('name');
    const applicationConfig: ApplicationConfig = {
      name,
      host: config.get('host'),
      port: config.get('port'),
      version: config.get('version') ?? '1.0.0',
      description: config.get('description') ?? `${name} service`,
      consumes: config.get('consumes') ?? ['application/json'],
      produces: config.get('produces') ?? ['application/json'],
    };
    for (const prop of <const>['name', 'host', 'port']) {
      if (!applicationConfig[<keyof ApplicationConfig>prop]) {
        throw new Error(`application config is missing required property ${prop}`);
      }
    }
    return applicationConfig;
  },

  get logger() {
    const loggerConfig: LoggerConfig = {
      prettyPrint: serviceConfig.environment.isDevelopment,
    };
    return loggerConfig;
  },

  get environment() {
    const environmentConfig: EnvironmentConfig = {
      isProduction: process.env.NODE_ENV === 'production',
      isDevelopment: process.env.NODE_ENV === 'development',
    };
    return environmentConfig;
  },

  get swagger() {
    const applicationConfig = serviceConfig.application;
    const swaggerConfig: SwaggerConfig = {
      routePrefix: config.get('documentation.routePrefix') ?? '/documentation',
      exposeRoute: config.get('documentation.exposeRoutes') ?? true,
      swagger: {
        info: {
          title: `${applicationConfig.name} API`,
          description: applicationConfig.description,
          version: applicationConfig.version,
        },
        consumes: applicationConfig.consumes,
        produces: applicationConfig.produces,
      },
    };
    return swaggerConfig;
  },

  get auth() {
    const publicKeyPath = resolve(__dirname, 'keys', 'public_key.pem');
    const privateKeyPath = resolve(__dirname, 'keys', 'private_key.pem');
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
