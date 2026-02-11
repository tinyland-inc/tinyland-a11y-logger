/**
 * Configuration injection for tinyland-a11y-logger
 *
 * Provides a way to inject configuration without coupling to process.env
 * or any specific runtime environment.
 *
 * All config values have sensible defaults. Call `configureA11yLogger()`
 * once at application startup to override.
 *
 * @module config
 *
 * @example
 * ```typescript
 * import { configureA11yLogger } from '@tinyland-inc/tinyland-a11y-logger';
 *
 * configureA11yLogger({
 *   lokiUrl: 'http://loki:3100',
 *   lokiEnabled: true,
 *   isDevelopment: false,
 * });
 * ```
 */

/**
 * Configuration options for the accessibility logger
 */
export interface A11yLoggerConfig {
	/** Loki push endpoint URL. Default: 'http://localhost:3100' */
	lokiUrl?: string;
	/** Whether Loki push is enabled. Default: false */
	lokiEnabled?: boolean;
	/** Whether running in development mode (enables console fallback). Default: false */
	isDevelopment?: boolean;
	/** Interval in ms between buffer flushes. Default: 1000 */
	flushInterval?: number;
	/** Maximum entries before immediate flush. Default: 100 */
	maxBufferSize?: number;
	/** Loki stream label: job. Default: 'accessibility' */
	jobLabel?: string;
	/** Loki stream label: container. Default: 'stonewall-sveltekit' */
	containerLabel?: string;
	/** Loki stream label: environment. Default: 'development' */
	environment?: string;
	/** Loki stream label: service. Default: 'a11y-monitoring' */
	serviceLabel?: string;
	/** Whether to register a process.on('beforeExit') shutdown hook. Default: true */
	registerShutdownHook?: boolean;
}

/** Default configuration values */
const DEFAULTS: Required<A11yLoggerConfig> = {
	lokiUrl: 'http://localhost:3100',
	lokiEnabled: false,
	isDevelopment: false,
	flushInterval: 1000,
	maxBufferSize: 100,
	jobLabel: 'accessibility',
	containerLabel: 'stonewall-sveltekit',
	environment: 'development',
	serviceLabel: 'a11y-monitoring',
	registerShutdownHook: true,
};

let config: A11yLoggerConfig = {};

/**
 * Configure the accessibility logger with custom settings.
 *
 * Call this once at application startup before logging.
 * Merges with existing configuration (does not replace).
 *
 * @param c - Configuration options to merge
 */
export function configureA11yLogger(c: A11yLoggerConfig): void {
	config = { ...config, ...c };
}

/**
 * Get the current resolved configuration with defaults applied.
 *
 * @returns Fully resolved configuration
 */
export function getA11yLoggerConfig(): Required<A11yLoggerConfig> {
	return {
		lokiUrl: config.lokiUrl ?? DEFAULTS.lokiUrl,
		lokiEnabled: config.lokiEnabled ?? DEFAULTS.lokiEnabled,
		isDevelopment: config.isDevelopment ?? DEFAULTS.isDevelopment,
		flushInterval: config.flushInterval ?? DEFAULTS.flushInterval,
		maxBufferSize: config.maxBufferSize ?? DEFAULTS.maxBufferSize,
		jobLabel: config.jobLabel ?? DEFAULTS.jobLabel,
		containerLabel: config.containerLabel ?? DEFAULTS.containerLabel,
		environment: config.environment ?? DEFAULTS.environment,
		serviceLabel: config.serviceLabel ?? DEFAULTS.serviceLabel,
		registerShutdownHook: config.registerShutdownHook ?? DEFAULTS.registerShutdownHook,
	};
}

/**
 * Reset all configuration to defaults.
 * Primarily useful for testing.
 */
export function resetA11yLoggerConfig(): void {
	config = {};
}
