import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  createParamDecorator,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { PrismaService } from "../../prisma/prisma.service";

export type CompanyRole = "OWNER" | "ADMIN" | "EDITOR";

const REQUIRED_COMPANY_ROLES_KEY = "REQUIRED_COMPANY_ROLES";

export const RequireCompanyRole = (...roles: CompanyRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(REQUIRED_COMPANY_ROLES_KEY, roles);

const RANK: Record<CompanyRole, number> = { EDITOR: 1, ADMIN: 2, OWNER: 3 };

@Injectable()
export class CompanyRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required =
      this.reflector.getAllAndOverride<CompanyRole[] | undefined>(REQUIRED_COMPANY_ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    const req = context.switchToHttp().getRequest<{
      params: Record<string, string>;
      user?: { id: string };
    }>();
    const companyId = req.params.companyId ?? req.params.id;
    const userId = req.user?.id;
    if (!companyId || !userId) throw new ForbiddenException();

    const member = await this.prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId, userId } },
      select: { role: true },
    });
    if (!member) throw new ForbiddenException("Not a member of this company.");

    if (required.length === 0) return true;
    const minRank = Math.min(...required.map((r) => RANK[r]));
    if (RANK[member.role] < minRank) throw new ForbiddenException("Insufficient company role.");

    (req as { companyRole?: CompanyRole }).companyRole = member.role;
    return true;
  }
}

/** The actor's role in the company named by `:companyId`, resolved by `CompanyRoleGuard`. */
export const ActorCompanyRole = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CompanyRole =>
    ctx.switchToHttp().getRequest<{ companyRole: CompanyRole }>().companyRole,
);
