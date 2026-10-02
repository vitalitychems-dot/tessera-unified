import { AsyncLocalStorage } from "node:async_hooks";

const adminBootstrapContext = new AsyncLocalStorage<boolean>();

export function isAdminBootstrapContext(): boolean {
  return adminBootstrapContext.getStore() === true;
}

export function runAsAdminBootstrap<T>(operation: () => Promise<T>): Promise<T> {
  return adminBootstrapContext.run(true, operation);
}