/**
 * Tests for Dependency Injection Container
 */

const DIContainer = require('../src/container/DIContainer');

module.exports = function(runner) {
    runner.test('DIContainer - should register and resolve services', () => {
        const container = new DIContainer();
        
        class TestService {
            constructor() {
                this.name = 'TestService';
            }
        }
        
        container.register('testService', TestService);
        const service = container.resolve('testService');
        
        runner.assert(service instanceof TestService, 'Should resolve to correct instance');
        runner.assertEqual(service.name, 'TestService');
    });

    runner.test('DIContainer - should handle dependencies', () => {
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
        
        runner.assert(service.dependency instanceof Dependency, 'Should inject dependency');
        runner.assertEqual(service.dependency.value, 'dependency');
    });

    runner.test('DIContainer - should support singletons', () => {
        const container = new DIContainer();
        
        class SingletonService {
            constructor() {
                this.id = Math.random();
            }
        }
        
        container.register('singleton', SingletonService, [], true);
        
        const instance1 = container.resolve('singleton');
        const instance2 = container.resolve('singleton');
        
        runner.assertEqual(instance1.id, instance2.id, 'Should return same instance for singleton');
    });

    runner.test('DIContainer - should support factories', () => {
        const container = new DIContainer();
        
        container.registerFactory('factory', () => {
            return { created: new Date().toISOString() };
        });
        
        const instance = container.resolve('factory');
        
        runner.assert(instance.created, 'Should create instance from factory');
    });

    runner.test('DIContainer - should register instances directly', () => {
        const container = new DIContainer();
        
        const instance = { name: 'direct instance' };
        container.registerInstance('instance', instance);
        
        const resolved = container.resolve('instance');
        
        runner.assertEqual(resolved, instance, 'Should return the same instance');
    });

    runner.test('DIContainer - should throw for unknown services', async () => {
        const container = new DIContainer();
        
        await runner.assertThrows(() => {
            container.resolve('unknown');
        }, 'Should throw error for unknown service');
    });

    runner.test('DIContainer - should check service existence', () => {
        const container = new DIContainer();
        
        container.registerInstance('exists', {});
        
        runner.assert(container.has('exists'), 'Should return true for existing service');
        runner.assert(!container.has('notExists'), 'Should return false for non-existing service');
    });
};
