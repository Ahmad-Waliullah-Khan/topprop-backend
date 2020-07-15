import { bind, /* inject, */ BindingScope, inject } from '@loopback/core';
import { repository } from '@loopback/repository';
import { HttpErrors } from '@loopback/rest';
import { securityId } from '@loopback/security';
import { UserRepository } from '@src/repositories';
import { ROLES } from '@src/utils/constants';
import { ICustomUserProfile } from '@src/utils/interfaces';
import { sign, TokenExpiredError, verify } from 'jsonwebtoken';
import { isEqual } from 'lodash';

@bind({ scope: BindingScope.SINGLETON })
export class JwtService {
    constructor(
        @inject('TOKEN_SECRET_SIGN')
        private jwtSecret: string,
        @inject('TOKEN_EXPIRATION_IN')
        private jwtExpiresIn: string,
        @repository(UserRepository) private userRepository: UserRepository,
    ) {}

    async verifyToken(token: string): Promise<ICustomUserProfile> {
        if (!token) {
            throw new HttpErrors.Unauthorized(`Error verifying token: 'token' is null`);
        }

        try {
            //     // decode user profile from token
            const decryptedToken = verify(token, this.jwtSecret);
            let userProfile: ICustomUserProfile;
            // don't copy over  token field 'iat' and 'exp', nor 'email' to user profile
            if (!(await this.userRepository.exists((decryptedToken as any)['id'])))
                throw new HttpErrors.NotFound(`User not found with auth token provided.`);

            const user = await this.userRepository.findById((decryptedToken as any)['id']);
            userProfile = {
                id: user.id,
                email: user.email,
                [securityId]: user.id.toString(),
                role: user.role,
                permissions: user.permissions,
                isAdmin: isEqual(user.role, ROLES.ADMIN),
            };
            return userProfile;
        } catch (error) {
            if (error instanceof TokenExpiredError) throw new HttpErrors.Unauthorized(`Session expired.`);
            else throw new HttpErrors.Unauthorized(error.message);
        }
    }

    async generateToken(userProfile: ICustomUserProfile): Promise<string> {
        if (!userProfile) {
            throw new HttpErrors.Unauthorized('Error generating token: userProfile is null');
        }

        // Generate a JSON Web Token
        let token: string;
        try {
            token = sign(userProfile, this.jwtSecret, { expiresIn: this.jwtExpiresIn });
        } catch (error) {
            throw new HttpErrors.Unauthorized(`Error signing token: ${error}`);
        }

        return token;
    }
}
