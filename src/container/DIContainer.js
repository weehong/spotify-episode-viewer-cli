/**
 * Simple Dependency Injection Container following Dependency Inversion Principle
 * Manages object creation and dependency resolution
 */
class DIContainer {
    constructor() {
        this.services = new Map();
        this.singletons = new Map();
        this.factories = new Map();
    }

    /**
     * Register a service with its dependencies
     * @param {string} name - Service name
     * @param {Function} constructor - Service constructor
     * @param {string[]} dependencies - Array of dependency names
     * @param {boolean} singleton - Whether to create as singleton
     */
    register(name, constructor, dependencies = [], singleton = true) {
        this.services.set(name, {
            constructor,
            dependencies,
            singleton
        });
    }

    /**
     * Register a factory function
     * @param {string} name - Service name
     * @param {Function} factory - Factory function
     * @param {boolean} singleton - Whether to cache the result
     */
    registerFactory(name, factory, singleton = true) {
        this.factories.set(name, {
            factory,
            singleton
        });
    }

    /**
     * Register an instance directly
     * @param {string} name - Service name
     * @param {*} instance - The instance to register
     */
    registerInstance(name, instance) {
        this.singletons.set(name, instance);
    }

    /**
     * Resolve a service by name
     * @param {string} name - Service name
     * @returns {*} The resolved service instance
     */
    resolve(name) {
        // Check if already instantiated as singleton
        if (this.singletons.has(name)) {
            return this.singletons.get(name);
        }

        // Check if it's a factory
        if (this.factories.has(name)) {
            return this.resolveFactory(name);
        }

        // Check if it's a registered service
        if (this.services.has(name)) {
            return this.resolveService(name);
        }

        throw new Error(`Service '${name}' not found in container`);
    }

    /**
     * Resolve a service from factory
     * @private
     * @param {string} name - Service name
     * @returns {*} The resolved service instance
     */
    resolveFactory(name) {
        const factoryInfo = this.factories.get(name);
        const instance = factoryInfo.factory(this);

        if (factoryInfo.singleton) {
            this.singletons.set(name, instance);
        }

        return instance;
    }

    /**
     * Resolve a service from constructor
     * @private
     * @param {string} name - Service name
     * @returns {*} The resolved service instance
     */
    resolveService(name) {
        const serviceInfo = this.services.get(name);
        const dependencies = serviceInfo.dependencies.map(dep => this.resolve(dep));
        const instance = new serviceInfo.constructor(...dependencies);

        if (serviceInfo.singleton) {
            this.singletons.set(name, instance);
        }

        return instance;
    }

    /**
     * Check if a service is registered
     * @param {string} name - Service name
     * @returns {boolean} True if service is registered
     */
    has(name) {
        return this.services.has(name) || 
               this.factories.has(name) || 
               this.singletons.has(name);
    }

    /**
     * Clear all registrations (useful for testing)
     */
    clear() {
        this.services.clear();
        this.singletons.clear();
        this.factories.clear();
    }

    /**
     * Get all registered service names
     * @returns {string[]} Array of service names
     */
    getRegisteredServices() {
        const serviceNames = Array.from(this.services.keys());
        const factoryNames = Array.from(this.factories.keys());
        const instanceNames = Array.from(this.singletons.keys());
        
        return [...new Set([...serviceNames, ...factoryNames, ...instanceNames])];
    }
}

module.exports = DIContainer;
