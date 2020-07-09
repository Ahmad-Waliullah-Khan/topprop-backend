import {
    AuthorizationContext,
    AuthorizationDecision,
    AuthorizationMetadata,
    Authorizer,
} from '@loopback/authorization';
import { Provider } from '@loopback/core';

export class CustomAuthorizationProvider implements Provider<Authorizer> {
    constructor() {}
    /**
     * @returns an authorizer function
     *
     */
    value(): Authorizer {
        return this.authorize.bind(this);
    }

    async authorize(context: AuthorizationContext, metadata: AuthorizationMetadata) {
        return AuthorizationDecision.ABSTAIN;
    }
}
