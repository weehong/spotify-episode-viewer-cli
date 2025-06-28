/**
 * Tests for Dependency Injection Container
 */

const DIContainer = require('../src/container/DIContainer');

describe('DIContainer Tests', () => {
    test('should register and resolve services', () => {
        const container = new DIContainer();
        
        class TestService {
            constructor() {
                this.name = 'TestService';
            }
        }
        
        container.register('testService', TestService);
        const service = container.resolve('testService');
        
        expect(service).toBeInstanceOf(TestService);
        expect(service.name).toBe('TestService');
    });

    test('should handle dependencies', () => {
        const container = new DIContainer();
        
        class Dependency {
            constructor() {
                this.value = 'dependency';
            }
        }
        
        class Service {
            constructor(dep) {
                this.dependency = dep;
            }
        }
        
        container.register('dependency', Dependency);
        container.register('service', Service, ['dependency']);
        
        const service = container.resolve('service');
        
        expect(service.dependency).toBeInstanceOf(Dependency);
        expect(service.dependency.value).toBe('dependency');
    });

    test('should support singletons', () => {
        const container = new DIContainer();
        
        class SingletonService {
            constructor() {
                this.id = Math.random();
            }
        }
        
        container.register('singleton', SingletonService, [], true);
        
        const instance1 = container.resolve('singleton');
        const instance2 = container.resolve('singleton');
        
        expect(instance1.id).toBe(instance2.id);
    });

    test('should support factories', () => {
        const container = new DIContainer();
        
        container.registerFactory('factory', () => {
            return { created: new Date().toISOString() };
        });
        
        const instance = container.resolve('factory');
        
        expect(instance.created).toBeTruthy();
    });

    test('should register instances directly', () => {
        const container = new DIContainer();
        
        const instance = { name: 'direct instance' };
        container.registerInstance('instance', instance);
        
        const resolved = container.resolve('instance');
        
        expect(resolved).toBe(instance);
    });

    test('should throw for unknown services', async () => {
        const container = new DIContainer();
        
        expect(() => {
            container.resolve('unknown');
        }).toThrow();
    });

    test('should check service existence', () => {
        const container = new DIContainer();
        
        container.registerInstance('exists', {});
        
        expect(container.has('exists')).toBe(true);
        expect(container.has('notExists')).toBe(false);
    });
});
