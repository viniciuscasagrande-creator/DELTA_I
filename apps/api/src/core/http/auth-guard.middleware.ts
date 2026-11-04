import http from 'node:http';
import { IdentityService, JwtTokenPayload } from '../auth/identity.service';

const PUBLIC_UNAUTHENTICATED_PATHS = new Set<string>([
  '/api/health',
  '/api/health/ready',
  '/api/system/capabilities',
  '/api/core/auth/login',
  '/api/core/auth/mfa/verify',
  '/api/core/auth/password-recovery',
  '/api/docs',
  '/api/docs/',
  '/api/openapi.json',
]);

export function extractBearerTokenFromRequest(req: http.IncomingMessage): string | null {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}

/**
 * Guard Centralizado de Autenticação JWT:
 * - Rotas públicas (health, login, mfa, recovery) passam livremente.
 * - Sempre que um token Bearer for enviado no header Authorization, valida assinatura e expiração.
 * - Em produção (NODE_ENV=production ou ENFORCE_JWT_AUTH=true), exige obrigatoriamente token JWT válido
 *   em todas as rotas protegidas, bloqueando acesso anônimo num único ponto central.
 */
export function assertCentralRouteAuthGuard(
  req: http.IncomingMessage,
  pathname: string,
  identityService: IdentityService
): JwtTokenPayload | null {
  if (req.method === 'OPTIONS' || PUBLIC_UNAUTHENTICATED_PATHS.has(pathname)) {
    return null;
  }

  const token = extractBearerTokenFromRequest(req);
  if (token) {
    return identityService.verifyJwt(token);
  }

  const enforceJwt =
    process.env.NODE_ENV === 'production' || process.env.ENFORCE_JWT_AUTH === 'true';

  if (enforceJwt) {
    throw new Error(
      `FORBIDDEN_AUTH_REQUIRED: Rota protegida (${req.method} ${pathname}) exige header Authorization: Bearer <JWT>.`
    );
  }

  return null;
}
