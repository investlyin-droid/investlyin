import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
    constructor(
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const client: Socket = context.switchToWs().getClient<Socket>();
        const token = this.extractToken(client);
        if (!token) return false;

        try {
            const payload = this.jwtService.verify(token, {
                secret: this.configService.get<string>('JWT_SECRET') || 'secretKey',
            });
            // Attach user to client for later use
            (client as any).user = {
                userId: payload.sub,
                email: payload.email,
                role: payload.role,
                isAdmin: payload.role === 'admin',
            };
            return true;
        } catch (e) {
            return false;
        }
    }

    private extractToken(client: Socket): string | null {
        const auth = client.handshake.auth as { token?: string } | undefined;
        if (auth?.token) return auth.token.replace('Bearer ', '').trim();

        const h = client.handshake.headers.authorization;
        if (typeof h === 'string' && h.startsWith('Bearer ')) {
            return h.slice(7).trim();
        }
        return null;
    }
}
