import { AuthenticationStrategy } from '@loopback/authentication';
import { service } from '@loopback/core';
import { HttpErrors, Request } from '@loopback/rest';
import { JwtService } from '@src/services';
import { ICustomUserProfile } from '@src/utils/interfaces';

export class JWTAuthenticationStrategy implements AuthenticationStrategy {
    name: string = 'jwt';

    constructor(
        @service()
        private jwtService: JwtService,
    ) {}

    async authenticate(request: Request): Promise<ICustomUserProfile | undefined> {
        const token: string = this.extractCredentials(request);
        const userProfile: ICustomUserProfile = await this.jwtService.verifyToken(token);
        return { ...userProfile, token };
    }

    private extractCredentials(request: Request): string {
        if (!request.headers.authorization) {
            throw new HttpErrors.Unauthorized(`Please login to view the page.`);
        }

        // for example: Bearer xxx.yyy.zzz
        const authHeaderValue = request.headers.authorization;

        if (!authHeaderValue.startsWith('Bearer')) {
            throw new HttpErrors.Unauthorized(`Authorization header is not of type 'Bearer'.`);
        }

        //split the string into 2 parts: 'Bearer ' and the `xxx.yyy.zzz`
        const parts = authHeaderValue.split(' ');
        if (parts.length !== 2)
            throw new HttpErrors.Unauthorized(
                `Authorization header value has too many parts. It must follow the pattern: 'Bearer xx.yy.zz' where xx.yy.zz is a valid JWT token.`,
            );
        const token = parts[1];

        return token;
    }
}
