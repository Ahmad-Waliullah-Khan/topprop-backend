import { AuthenticationStrategy } from '@loopback/authentication';
import { StrategyAdapter } from '@loopback/authentication-passport';
import { Provider, service, ValueOrPromise } from '@loopback/core';
import { repository } from '@loopback/repository';
import { isEqual } from 'lodash';
import moment from 'moment';
//@ts-ignore
// import * as GoogleTokenStrategy from 'passport-google-id-token';
import GoogleTokenStrategy from 'passport-google-id-token';
import { UserRepository } from '../repositories';
import { UserService } from '../services';

export class PassportGoogleTokenAuthProvider implements Provider<AuthenticationStrategy> {
    name: string = 'googleToken';
    constructor(
        @repository(UserRepository) private userRepository: UserRepository,
        @service()
        protected userService: UserService,
    ) {}
    value(): ValueOrPromise<AuthenticationStrategy> {
        const verify = async (parsedToken: any, googleId: string, done: Function) => {
            try {
                const profileJSON = parsedToken.payload;

                if (!profileJSON || !profileJSON.email)
                    return done(null, false, { message: 'The current profile does not have an email.' });
                let user = await this.userRepository.findOne({
                    where: { or: [{ socialId: googleId }, { email: profileJSON.email }] },
                });

                if (user) {
                    let shouldUpdate = false;
                    if (!isEqual(user.socialId, googleId)) {
                        user.socialId = googleId;
                        user.profileImage = profileJSON.picture;
                        shouldUpdate = true;
                    }
                    if (!isEqual(user.email, profileJSON.email)) {
                        user.email = profileJSON.email;
                        shouldUpdate = true;
                    }
                    if (shouldUpdate) user = await this.userRepository.save(user);
                }
                if (!user) {
                    user = await this.userRepository.create({
                        email: profileJSON.email,
                        fullName: profileJSON.name || 'N/A',
                        username: this.userService.buildUsername(profileJSON.email),
                        socialId: googleId,
                        accountConfirmedAt: moment().toDate(),
                        permissions: this.userService.assignDefaultPermissions(),
                        role: this.userService.assignDefaultRole(),
                        profileImage: profileJSON.picture || '',
                    });
                }
                done(null, {
                    id: user.id.toString(),
                    email: user.email,
                    username: user.username,
                    // role: user.role,
                    // permissions: user.permissions,
                });
            } catch (err) {
                if (err.name === 'UnauthorizedError') done(null, false, { message: 'Unauthorized' });
                done(null, false, err);
            }
        };
        const googleTokenStrategy = this.configuredGoogleTokenStrategy(verify);
        return this.convertToAuthStrategy(googleTokenStrategy);
    }
    // Takes in the verify callback function and returns a configured basic strategy.
    private configuredGoogleTokenStrategy(verifyFn: Function) {
        return new GoogleTokenStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID as string,
                // clientSecret: process.env.FACEBOOK_APP_SECRET_ID as string,
                // fbGraphVersion: 'v7.0',
                // profileFields: ['email', 'displayName', 'id'],
            },
            verifyFn,
        );
    }

    // Applies the `StrategyAdapter` to the configured basic strategy instance.
    // You'd better define your strategy name as a constant, like
    // `const AUTH_STRATEGY_NAME = 'basic'`
    // You will need to decorate the APIs later with the same name
    private convertToAuthStrategy(basic: any): AuthenticationStrategy {
        return new StrategyAdapter(basic, this.name);
    }
}
