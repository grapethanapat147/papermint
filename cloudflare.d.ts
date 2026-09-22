/**
 * Minimal ambient types for the Cloudflare runtime this app deploys onto.
 *
 * Hand-written rather than pulled from @cloudflare/workers-types so the app
 * gains no dependency for types alone. It covers only what the code touches —
 * widen it as needed, or replace it wholesale if the real package is ever added.
 */

declare module "cloudflare:workers" {
  /**
   * Bindings are injected by the platform and their shapes come from
   * Cloudflare's own package, which this project does not depend on. Values
   * stay loose on purpose; each call site narrows what it needs.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const env: Record<string, any>;
}

interface Fetcher {
  fetch(input: Request | string, init?: RequestInit): Promise<Response>;
}

interface D1Database {
  prepare(query: string): unknown;
}

interface R2Object {
  json<T = unknown>(): Promise<T>;
  text(): Promise<string>;
  readonly customMetadata?: Record<string, string>;
}

interface R2Bucket {
  get(key: string): Promise<R2Object | null>;
  put(
    key: string,
    value: string | ArrayBuffer | ReadableStream,
    options?: {
      httpMetadata?: { contentType?: string };
      customMetadata?: Record<string, string>;
    },
  ): Promise<unknown>;
  delete(key: string): Promise<void>;
}
