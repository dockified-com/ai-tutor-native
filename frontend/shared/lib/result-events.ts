import "server-only";
import { jwtVerify } from "jose";

const SIGNING_SECRET = new TextEncoder().encode(process.env.SESSION_SIGNING_SECRET!);

export async function verifyResultEvent<T = unknown>(token: string): Promise<T> {
  const { payload } = await jwtVerify(token, SIGNING_SECRET, { algorithms: ["HS256"] });
  return (payload as { result: T }).result;
}