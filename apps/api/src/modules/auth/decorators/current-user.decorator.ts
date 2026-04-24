import type { ExecutionContext } from "@nestjs/common";
import { createParamDecorator } from "@nestjs/common";
import type { Request } from "express";

export interface AuthUser {
  id: string;
  email: string;
  role: "USER" | "COMPANY_ADMIN" | "MODERATOR" | "ADMIN";
  locale: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    if (!req.user) {
      throw new Error("CurrentUser used on a route without JwtAuthGuard.");
    }
    return req.user;
  },
);
