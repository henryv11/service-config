import { resolve } from 'path';
import serviceConfig from '../src';
import { readFileSync } from 'fs';

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
    expect(application.consumes).toEqual(['application/json']);
    expect(application.produces).toEqual(['application/json']);
  });

  test('auth', async () => {
    const auth = serviceConfig.auth;
    const [publicKey, privateKey] = await Promise.all([auth.publicKey, auth.privateKey]);
    expect(publicKey.toString('utf-8')).toEqual('this is public key');
    expect(privateKey?.toString('utf-8')).toEqual('this is private key');
    expect(auth.kafka.brokers).toEqual([]);
    expect(auth.kafka.clientId).toEqual(packageJson.name);
    expect(auth.kafka.groupId).toBeDefined();
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
    expect(swagger.swagger.info.title).toEqual(packageJson.name + ' API');
    expect(swagger.swagger.info.description).toEqual(packageJson.description);
    expect(swagger.swagger.info.version).toEqual(packageJson.version);
    expect(swagger.swagger.host).toEqual('api.dropshoppers.ee/' + packageJson.name);
    expect(swagger.swagger.consumes).toEqual(['application/json']);
    expect(swagger.swagger.produces).toEqual(['application/json']);
  });
});
