import type { HttpClient } from '../http.js';

/**
 * Base class for API resources.
 * @internal
 */
export abstract class Resource {
  protected readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }
}
