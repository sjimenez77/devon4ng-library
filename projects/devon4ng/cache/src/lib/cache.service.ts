import { HttpRequest, HttpResponse } from '@angular/common/http';
import { Injectable, Optional } from '@angular/core';
import * as Hash from 'object-hash';
import { Cache, CacheEntry } from './models';
import { CacheServiceConfig } from './models/cache-config.class';

@Injectable({
  providedIn: 'root',
})
export class CacheService implements Cache {
  cacheMap = new Map<string, CacheEntry>();
  urlRegExp: string | string[] | RegExp;
  maxCacheAge: number;

  constructor(@Optional() config: CacheServiceConfig) {
    if (config) {
      if (config.maxCacheAge) {
        this.maxCacheAge = config.maxCacheAge;
      }
      if (config.urlRegExp) {
        this.urlRegExp = config.urlRegExp;
      }
    }
  }

  get(key: string): HttpResponse<any> | null {
    const entry = this.cacheMap.get(key);
    if (!entry) {
      return null;
    }
    const isExpired = Date.now() - entry.entryTime > this.maxCacheAge;
    return isExpired ? null : entry.response;
  }

  put(req: HttpRequest<any>, res: HttpResponse<any>): void {
    const entry: CacheEntry = {
      url: req.urlWithParams,
      method: req.method,
      body: req.body ? req.body : {},
      response: res,
      entryTime: Date.now(),
    };
    this.cacheMap.set(this.createEntryHash(entry), entry);
    this.deleteExpiredCache();
  }

  createEntryHash(entry: CacheEntry): string {
    // Fixes import issue with object-hash when building library for Angular 11
    const hashObject = Hash;
    const hash = hashObject({
      url: entry.url,
      method: entry.method,
      body: entry.body ? entry.body : {},
    });
    return `${hash}|${entry.method}|${entry.url}`;
  }

  cleanCache() {
    this.cacheMap.clear();
  }

  private deleteExpiredCache() {
    this.cacheMap.forEach((entry, key) => {
      if (Date.now() - entry.entryTime > this.maxCacheAge) {
        this.cacheMap.delete(key);
      }
    });
  }
}
