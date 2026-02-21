/**
 * Accessibility Logger for Loki Integration
 *
 * Specialized logger for streaming accessibility evaluation results to Loki.
 * Handles structured logging of WCAG violations, contrast issues, and evaluation metrics.
 *
 * All configuration is injected via the DI config module -- no direct process.env reads.
 *
 * @module a11y-logger
 */

import { getA11yLoggerConfig } from './config.js';
import type {
	A11yLogEntry,
	A11yLoggerApi,
	AriaLabels,
	ContrastLabels,
	ErrorLabels,
	EvaluationLabels,
	SessionLabels,
	SummaryData,
	WcagLabels,
} from './types.js';

// ---------------------------------------------------------------------------
// Internal buffer state
// ---------------------------------------------------------------------------

let logBuffer: A11yLogEntry[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let shutdownHookRegistered = false;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Flush buffered logs to Loki (or console in dev mode).
 */
async function flushLogs(): Promise<void> {
	if (logBuffer.length === 0) return;

	const logsToSend = [...logBuffer];
	logBuffer = [];

	const cfg = getA11yLoggerConfig();

	if (!cfg.lokiEnabled) {
		// In development without Loki, just console log
		logsToSend.forEach((log) => {
			if (cfg.isDevelopment) {
				console.log(`[A11y ${log.level.toUpperCase()}] ${log.message}`, log.labels);
			}
		});
		return;
	}

	try {
		const streams = [
			{
				stream: {
					job: cfg.jobLabel,
					container: cfg.containerLabel,
					environment: cfg.environment,
					service: cfg.serviceLabel,
				},
				values: logsToSend.map((log) => [
					(new Date(log.timestamp).getTime() * 1000000).toString(), // nanoseconds
					JSON.stringify({
						level: log.level,
						msg: log.message,
						...log.labels,
					}),
				]),
			},
		];

		await fetch(`${cfg.lokiUrl}/loki/api/v1/push`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ streams }),
		});
	} catch (err) {
		console.error('[A11y Logger] Failed to send logs to Loki:', err);
	}
}

/**
 * Schedule a deferred flush if one is not already pending.
 */
function scheduleFlush(): void {
	if (flushTimer) return;

	const cfg = getA11yLoggerConfig();
	flushTimer = setTimeout(() => {
		flushTimer = null;
		flushLogs();
	}, cfg.flushInterval);

	// Prevent the timer from keeping Node.js alive
	if (flushTimer && typeof flushTimer === 'object' && 'unref' in flushTimer) {
		flushTimer.unref();
	}
}

/**
 * Add a log entry to the buffer and trigger flush logic.
 */
function addLog(entry: A11yLogEntry): void {
	logBuffer.push(entry);

	const cfg = getA11yLoggerConfig();

	// Immediate flush if buffer is full
	if (logBuffer.length >= cfg.maxBufferSize) {
		if (flushTimer) {
			clearTimeout(flushTimer);
			flushTimer = null;
		}
		flushLogs();
	} else {
		scheduleFlush();
	}
}

/**
 * Ensure the shutdown hook is registered (at most once).
 */
function ensureShutdownHook(): void {
	if (shutdownHookRegistered) return;

	const cfg = getA11yLoggerConfig();
	if (!cfg.registerShutdownHook) return;

	if (typeof process !== 'undefined' && typeof process.on === 'function') {
		process.on('beforeExit', () => {
			a11yLogger.flush();
		});
		shutdownHookRegistered = true;
	}
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Accessibility logger with buffered Loki integration.
 *
 * Provides structured logging methods for contrast violations, WCAG issues,
 * ARIA problems, evaluation metrics, session tracking, errors, and summaries.
 *
 * Logs are buffered and flushed in batches to Loki. In development mode
 * (when Loki is not enabled), logs are written to the console.
 */
export const a11yLogger: A11yLoggerApi = {
	/**
	 * Log contrast ratio violation
	 */
	contrast(message: string, labels: ContrastLabels) {
		ensureShutdownHook();
		addLog({
			level: labels.ratio !== undefined && labels.ratio < 3 ? 'error' : 'warn',
			message,
			timestamp: new Date().toISOString(),
			sessionId: labels.sessionId,
			labels: {
				type: 'contrast',
				selector: labels.selector || 'unknown',
				ratio: labels.ratio || 0,
				requiredRatio: labels.requiredRatio || 4.5,
				foreground: labels.foreground || 'unknown',
				background: labels.background || 'unknown',
				wcagLevel: labels.wcagLevel || 'AA',
				tagName: labels.elementInfo?.tagName || 'unknown',
				page: labels.page || '',
				theme: labels.theme || '',
			},
		});
	},

	/**
	 * Log WCAG violation
	 */
	wcag(message: string, labels: WcagLabels) {
		ensureShutdownHook();
		addLog({
			level: labels.severity === 'error' ? 'error' : 'warn',
			message,
			timestamp: new Date().toISOString(),
			sessionId: labels.sessionId,
			labels: {
				type: 'wcag',
				selector: labels.selector || 'unknown',
				rule: labels.rule || 'unknown',
				wcagLevel: labels.wcagLevel || 'AA',
				severity: labels.severity || 'warning',
			},
		});
	},

	/**
	 * Log evaluation batch
	 */
	evaluation(message: string, labels: EvaluationLabels) {
		ensureShutdownHook();
		addLog({
			level: 'info',
			message,
			timestamp: new Date().toISOString(),
			sessionId: labels.sessionId,
			labels: {
				type: 'evaluation',
				resultsCount: labels.resultsCount || 0,
				issuesCount: labels.issuesCount || 0,
				criticalCount: labels.criticalCount || 0,
				evaluationTimeMs: labels.evaluationTimeMs || 0,
			},
		});
	},

	/**
	 * Log session info
	 */
	session(message: string, labels: SessionLabels) {
		ensureShutdownHook();
		addLog({
			level: 'info',
			message,
			timestamp: new Date().toISOString(),
			sessionId: labels.sessionId,
			labels: {
				type: 'session',
				action: labels.action || 'unknown',
				userId: labels.userId || 'anonymous',
				userAgent: labels.userAgent || 'unknown',
			},
		});
	},

	/**
	 * Log error
	 */
	error(message: string, labels: ErrorLabels) {
		ensureShutdownHook();
		addLog({
			level: 'error',
			message,
			timestamp: new Date().toISOString(),
			sessionId: labels.sessionId,
			labels: {
				type: 'error',
				error: labels.error || 'unknown',
				stack: labels.stack || '',
			},
		});
	},

	/**
	 * Log summary of accessibility evaluation
	 */
	summary(data: SummaryData) {
		ensureShutdownHook();
		addLog({
			level: 'info',
			message: `Accessibility summary: ${data.issues} issues (${data.criticalIssues} critical)`,
			timestamp: new Date().toISOString(),
			sessionId: data.sessionId,
			labels: {
				type: 'summary',
				totalElements: data.totalElements,
				evaluatedElements: data.evaluatedElements,
				issues: data.issues,
				criticalIssues: data.criticalIssues,
				evaluationTimeMs: data.evaluationTimeMs,
			},
		});
	},

	/**
	 * Log ARIA violation
	 */
	aria(message: string, labels: AriaLabels) {
		ensureShutdownHook();
		addLog({
			level: 'warn',
			message,
			timestamp: new Date().toISOString(),
			sessionId: labels.sessionId,
			labels: {
				type: 'aria',
				selector: labels.selector || 'unknown',
				issue: labels.issue || 'unknown',
				tagName: labels.elementInfo?.tagName || 'unknown',
				fix: labels.fix || '',
				page: labels.page || '',
			},
		});
	},

	/**
	 * Flush logs immediately (for graceful shutdown).
	 */
	async flush() {
		if (flushTimer) {
			clearTimeout(flushTimer);
			flushTimer = null;
		}
		await flushLogs();
	},
};

// ---------------------------------------------------------------------------
// Test helpers (not part of the public API contract, but exported for tests)
// ---------------------------------------------------------------------------

/**
 * @internal Get a shallow copy of the current log buffer.
 * Exported for testing only.
 */
export function _getLogBuffer(): A11yLogEntry[] {
	return [...logBuffer];
}

/**
 * @internal Reset internal state (buffer, timer, shutdown hook flag).
 * Exported for testing only.
 */
export function _resetInternalState(): void {
	if (flushTimer) {
		clearTimeout(flushTimer);
		flushTimer = null;
	}
	logBuffer = [];
	shutdownHookRegistered = false;
}

/**
 * @internal Check if a flush timer is currently pending.
 * Exported for testing only.
 */
export function _hasFlushTimer(): boolean {
	return flushTimer !== null;
}
