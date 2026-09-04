/**
 * Marker matching Cloudflare OS `@validateRpc()`. gaos does not run the
 * capnweb-validate TypeScript transform yet; this is a typed no-op so RPC
 * classes stay annotated for when that transform is wired.
 */
export function validateRpc() {
  return function <Class extends abstract new (...args: never) => unknown>(
    target: Class,
    _context: ClassDecoratorContext<Class>,
  ): Class {
    return target;
  };
}
