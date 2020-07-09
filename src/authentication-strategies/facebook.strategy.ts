import { AuthenticationStrategy } from '@loopback/authentication';
import { StrategyAdapter } from '@loopback/authentication-passport';
import { Provider, service, ValueOrPromise } from '@loopback/core';
import { repository } from '@loopback/repository';
import { isEqual } from 'lodash';
import moment from 'moment';
import FacebookStrategy, { Profile, StrategyInstance, VerifyFunction } from 'passport-facebook-token';
import { UserRepository } from '../repositories';
import { UserService } from '../services';

export class PassportFacebookTokenAuthProvider implements Provider<AuthenticationStrategy> {
    name: string = 'facebookToken';
    constructor(
        @repository(UserRepository) private userRepository: UserRepository,
        @service()
        protected userService: UserService,
    ) {}
    value(): ValueOrPromise<AuthenticationStrategy> {
        const verify = async (accessToken: string, refreshToken: string, profile: Profile, done: Function) => {
            try {
                const profileJSON = profile._json;

                if (!profileJSON.email)
                    return done(null, false, { message: 'The current profile does not have an email.' });
                let user = await this.userRepository.findOne({ where: { socialId: profileJSON.id } });
                if (user && !isEqual(user.email, profileJSON.email)) {
                    user.email = profileJSON.email;
                    await this.userRepository.updateById(user.id, user);
                }
                if (!user) {
                    user = await this.userRepository.create({
                        email: profileJSON.email,
                        fullName: profileJSON.name || 'N/A',
                        username: this.userService.buildUsername(profileJSON.email),
                        socialId: profile.id,
                        accountConfirmedAt: moment().toDate(),
                        permissions: this.userService.assignDefaultPermissions(),
                        role: this.userService.assignDefaultRole(),
                        profileImage: `https://graph.facebook.com/${profile.id}/picture?type=large`,
                    });
                }
                done(null, {
                    id: user.id.toString(),
                    email: user.email,
                    username: user.username,
                    role: user.role,
                    permissions: user.permissions,
                });
            } catch (err) {
                if (err.name === 'UnauthorizedError') done(null, false, { message: 'Unauthorized' });
                done(null, false, err);
            }
        };
        const facebookTokenStrategy = this.configuredFacebookTokenStrategy(verify);
        return this.convertToAuthStrategy(facebookTokenStrategy);
    }
    // Takes in the verify callback function and returns a configured basic strategy.
    private configuredFacebookTokenStrategy(verifyFn: VerifyFunction): StrategyInstance {
        return new FacebookStrategy(
            {
                clientID: process.env.FACEBOOK_APP_ID as string,
                clientSecret: process.env.FACEBOOK_APP_SECRET_ID as string,
                fbGraphVersion: 'v7.0',
                profileFields: ['email', 'displayName', 'id'],
            },
            verifyFn,
        );
    }

    // Applies the `StrategyAdapter` to the configured basic strategy instance.
    // You'd better define your strategy name as a constant, like
    // `const AUTH_STRATEGY_NAME = 'basic'`
    // You will need to decorate the APIs later with the same name
    private convertToAuthStrategy(basic: StrategyInstance): AuthenticationStrategy {
        return new StrategyAdapter(basic, this.name);
    }
}
