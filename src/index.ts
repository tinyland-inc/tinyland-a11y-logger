/**
 * @tummycrypt/tinyland-a11y-logger
 *
 * Accessibility Loki logger with buffered batch sending for WCAG violation tracking.
 * Provides structured logging methods for contrast issues, WCAG violations, ARIA
 * problems, evaluation metrics, session tracking, and error reporting.
 *
 * Usage:
 * ```typescript
 * import {
 *   configureA11yLogger,
 *   a11yLogger,
 * } from '@tummycrypt/tinyland-a11y-logger';
 *
 * // Configure once at startup
 * configureA11yLogger({
 *   lokiUrl: 'http://loki:3100',
 *   lokiEnabled: true,
 *   isDevelopment: false,
 * });
 *
 * // Log accessibility issues
 * a11yLogger.contrast('Low contrast on heading', {
 *   selector: 'h1.title',
 *   ratio: 2.5,
 *   requiredRatio: 4.5,
 * });
 *
 * // Flush on shutdown
 * await a11yLogger.flush();
 * ```
 *
 * @module @tummycrypt/tinyland-a11y-logger
 */

// Configuration
export {
	configureA11yLogger,
	getA11yLoggerConfig,
	resetA11yLoggerConfig,
} from './config.js';

export type { A11yLoggerConfig } from './config.js';

// Logger
export {
	a11yLogger,
	_getLogBuffer,
	_resetInternalState,
	_hasFlushTimer,
} from './a11y-logger.js';

// Types
export type {
	A11yLogEntry,
	A11yLoggerApi,
	ContrastLabels,
	WcagLabels,
	EvaluationLabels,
	SessionLabels,
	ErrorLabels,
	SummaryData,
	AriaLabels,
} from './types.js';
