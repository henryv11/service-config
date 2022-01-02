import { readFileSync } from 'fs';
import { resolve } from 'path';
import serviceConfig from '../src';

const packageJson = JSON.parse(readFileSync(resolve('package.json'), { encoding: 'utf-8' }));

describe('service config', () => {
  test('packageInfo', () => {
    const packageInfo = serviceConfig.packageInfo;
    expect(packageInfo.name).toEqual(packageJson.name);
    expect(packageInfo.version).toEqual(packageJson.version);
    expect(packageInfo.description).toEqual(packageJson.description);
  });

  test('database', () => {
    const database = serviceConfig.database;
    expect(database.database).toEqual(packageJson.name);
    expect(database.host).toEqual('postgres_container');
    expect(database.port).toEqual(5432);
    expect(database.user).toEqual('postgres');
    expect(database.password).toEqual('postgres');
    expect(database.migrationsDirectory).toBeUndefined();
  });

  test('application', () => {
    const application = serviceConfig.application;
    expect(application.name).toEqual(packageJson.name);
    expect(application.version).toEqual(packageJson.version);
    expect(application.host).toEqual('0.0.0.0');
    expect(application.port).toEqual(8080);
    expect(application.pid).toBeDefined();
    expect(application.pid).toHaveLength(36); // uuidv4 is 36 characters long
  });

  test('auth', async () => {
    const auth = serviceConfig.auth;
    const [publicKey, privateKey] = await Promise.all([auth.publicKey, auth.privateKey]);
    expect(publicKey.toString('utf-8')).toEqual('this is public key');
    expect(privateKey?.toString('utf-8')).toEqual('this is private key');
    expect(auth.kafka.groupId).toEqual(serviceConfig.application.name + '_' + serviceConfig.application.pid);
  });

  test('environment', () => {
    const environment = serviceConfig.environment;
    expect(environment.environment).toEqual('test');
    expect(environment.isDevelopment).toEqual(false);
    expect(environment.isProduction).toEqual(false);
    expect(environment.isTest).toEqual(true);
  });

  test('logger', () => {
    const logger = serviceConfig.logger;
    expect(logger).toEqual(false);
  });

  test('swagger', () => {
    const swagger = serviceConfig.swagger;
    expect(swagger.routePrefix).toEqual('/documentation');
    expect(swagger.exposeRoute).toEqual(true);
    expect(swagger.openapi.info.title).toEqual(packageJson.name + ' API');
    expect(swagger.openapi.info.description).toEqual(packageJson.description);
    expect(swagger.openapi.info.version).toEqual(packageJson.version);
  });

  test('kafka', () => {
    const kafka = serviceConfig.kafka;
    expect(kafka.brokers).toBeInstanceOf(Array);
    expect(kafka.clientId).toEqual(serviceConfig.application.name);
  });
});
