// src/lib/apiAdapter.ts
import { NextRequest, NextResponse } from "next/server";
import { Writable } from "stream";

export class MockResponse extends Writable {
  statusCode = 200;
  responseHeaders = new Headers();
  chunks: Buffer[] = [];
  finishedPromise: Promise<void>;
  private resolveFinished!: () => void;
  isRedirect = false;
  redirectUrl = "";
  redirectCode = 307;

  constructor() {
    super();
    this.finishedPromise = new Promise((resolve) => {
      this.resolveFinished = resolve;
    });
    this.on("finish", () => {
      this.resolveFinished();
    });
  }

  _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void) {
    if (Buffer.isBuffer(chunk)) {
      this.chunks.push(chunk);
    } else {
      this.chunks.push(Buffer.from(chunk, encoding));
    }
    callback();
  }

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  setHeader(name: string, value: any) {
    if (name.toLowerCase() === "set-cookie") {
      if (Array.isArray(value)) {
        value.forEach((v) => this.responseHeaders.append("Set-Cookie", String(v)));
      } else {
        this.responseHeaders.append("Set-Cookie", String(value));
      }
    } else {
      this.responseHeaders.set(name, String(value));
    }
    return this;
  }

  getHeader(name: string) {
    return this.responseHeaders.get(name);
  }

  writeHead(code: number, headers?: any) {
    this.statusCode = code;
    if (headers && typeof headers === "object") {
      Object.entries(headers).forEach(([k, v]) => {
        this.setHeader(k, v);
      });
    }
    return this;
  }

  json(data: any) {
    if (!this.responseHeaders.has("Content-Type")) {
      this.responseHeaders.set("Content-Type", "application/json");
    }
    const str = JSON.stringify(data);
    this.write(str);
    this.end();
    return this;
  }

  send(data: any) {
    if (typeof data === "object" && !(data instanceof Uint8Array) && !Buffer.isBuffer(data)) {
      return this.json(data);
    }
    if (data !== undefined && data !== null) {
      this.write(data);
    }
    this.end();
    return this;
  }

  redirect(statusOrUrl: number | string, url?: string) {
    this.isRedirect = true;
    if (typeof statusOrUrl === "string") {
      this.redirectUrl = statusOrUrl;
      this.redirectCode = 307;
    } else {
      this.redirectCode = statusOrUrl;
      this.redirectUrl = url || "/";
    }
    this.end();
    return this;
  }
}

export function createRouteHandler(
  handler: (req: any, res: any) => Promise<any> | any
) {
  async function handle(
    request: NextRequest,
    context?: { params?: Promise<Record<string, string | string[]>> | Record<string, string | string[]> }
  ) {
    let resolvedParams: Record<string, any> = {};
    if (context?.params) {
      try {
        resolvedParams = await Promise.resolve(context.params);
      } catch {
        resolvedParams = {};
      }
    }

    const query: Record<string, any> = { ...resolvedParams };
    request.nextUrl.searchParams.forEach((val, key) => {
      if (query[key] !== undefined) {
        if (Array.isArray(query[key])) {
          query[key].push(val);
        } else {
          query[key] = [query[key], val];
        }
      } else {
        query[key] = val;
      }
    });

    const cookies: Record<string, string> = {};
    request.cookies.getAll().forEach((c) => {
      cookies[c.name] = c.value;
    });

    const headers: Record<string, string> = {};
    request.headers.forEach((val, key) => {
      headers[key.toLowerCase()] = val;
    });

    const method = request.method.toUpperCase();
    let body: any = {};

    if (method !== "GET" && method !== "HEAD") {
      const contentType = headers["content-type"] || "";
      if (contentType.includes("application/json")) {
        try {
          body = await request.json();
        } catch {
          body = {};
        }
      } else if (
        contentType.includes("application/x-www-form-urlencoded") ||
        contentType.includes("multipart/form-data")
      ) {
        try {
          const formData = await request.formData();
          const parsed: Record<string, any> = {};
          formData.forEach((value, key) => {
            if (parsed[key] !== undefined) {
              if (Array.isArray(parsed[key])) {
                parsed[key].push(value);
              } else {
                parsed[key] = [parsed[key], value];
              }
            } else {
              parsed[key] = value;
            }
          });
          body = parsed;
        } catch {
          body = {};
        }
      } else {
        try {
          body = await request.text();
        } catch {
          body = {};
        }
      }
    }

    const res = new MockResponse();

    const req: any = {
      method,
      url: request.nextUrl.pathname + request.nextUrl.search,
      query,
      body,
      cookies,
      headers,
      socket: {
        remoteAddress:
          headers["x-forwarded-for"] || headers["x-real-ip"] || "127.0.0.1",
      },
      rawRequest: request,
      on: (event: string, cb: any) => {
        if (event === "close") {
          request.signal.addEventListener("abort", cb);
        }
      },
    };

    try {
      const result = handler(req, res);
      if (result && typeof result.then === "function") {
        await result;
      }
    } catch (error: any) {
      console.error("API route error:", error);
      if (res.chunks.length === 0) {
        return NextResponse.json(
          { error: error?.message || "Internal server error" },
          { status: 500 }
        );
      }
    }

    // If stream or not ended, wait shortly or end
    if (!res.writableEnded) {
      res.end();
    }
    await res.finishedPromise;

    if (res.isRedirect) {
      return NextResponse.redirect(new URL(res.redirectUrl, request.url), res.redirectCode);
    }

    const bodyBuffer = Buffer.concat(res.chunks);
    return new NextResponse(bodyBuffer.length > 0 ? bodyBuffer : null, {
      status: res.statusCode,
      headers: res.responseHeaders,
    });
  }

  return {
    GET: (req: NextRequest, ctx: any) => handle(req, ctx),
    POST: (req: NextRequest, ctx: any) => handle(req, ctx),
    PUT: (req: NextRequest, ctx: any) => handle(req, ctx),
    DELETE: (req: NextRequest, ctx: any) => handle(req, ctx),
    PATCH: (req: NextRequest, ctx: any) => handle(req, ctx),
    HEAD: (req: NextRequest, ctx: any) => handle(req, ctx),
    OPTIONS: (req: NextRequest, ctx: any) => handle(req, ctx),
  };
}

export default createRouteHandler;
