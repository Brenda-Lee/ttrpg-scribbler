/**
 * Helpers para invocar route handlers do App Router diretamente nos testes.
 * Não há servidor HTTP — chamamos a função `(req, ctx)` e pegamos o `Response`.
 */

export function jsonRequest(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  url: string,
  body?: unknown,
) {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  return new Request(url, init);
}

export function params<T extends Record<string, string>>(value: T): { params: Promise<T> } {
  return { params: Promise.resolve(value) };
}
