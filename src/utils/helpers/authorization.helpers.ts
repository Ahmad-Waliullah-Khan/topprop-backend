import { AuthorizationContext, AuthorizationDecision, AuthorizationMetadata } from '@loopback/authorization';
import { securityId } from '@loopback/security';
import { isEqual } from 'lodash';
import { ICustomUserProfile } from '../interfaces';

export class AuthorizationHelpers {
    static allowedByPermission(permission: string) {
        return async (authorizationCtx: AuthorizationContext, metadata: AuthorizationMetadata) => {
            if (authorizationCtx.principals.length > 0) {
                const decodedUser = authorizationCtx.principals[0];
                if (decodedUser.permissions && !isEqual(decodedUser.permissions.indexOf(permission), -1))
                    return AuthorizationDecision.ALLOW;
                else return AuthorizationDecision.DENY;
            } else return AuthorizationDecision.DENY;
        };
    }
    static async ensureSameUserOrAdmin(authorizationCtx: AuthorizationContext, metadata: AuthorizationMetadata) {
        if (authorizationCtx.principals.length > 0) {
            const decodedUser = authorizationCtx.principals[0];

            if (decodedUser.isAdmin) return AuthorizationDecision.ALLOW;

            const userId = authorizationCtx.invocationContext.args[0];
            return userId === +decodedUser[(securityId as unknown) as string]
                ? AuthorizationDecision.ALLOW
                : AuthorizationDecision.DENY;
        } else return AuthorizationDecision.DENY;
    }
}
