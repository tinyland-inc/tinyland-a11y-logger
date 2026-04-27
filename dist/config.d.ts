export interface A11yLoggerConfig {
    lokiUrl?: string;
    lokiEnabled?: boolean;
    isDevelopment?: boolean;
    flushInterval?: number;
    maxBufferSize?: number;
    jobLabel?: string;
    containerLabel?: string;
    environment?: string;
    serviceLabel?: string;
    registerShutdownHook?: boolean;
}
export declare function configureA11yLogger(c: A11yLoggerConfig): void;
export declare function getA11yLoggerConfig(): Required<A11yLoggerConfig>;
export declare function resetA11yLoggerConfig(): void;
//# sourceMappingURL=config.d.ts.map