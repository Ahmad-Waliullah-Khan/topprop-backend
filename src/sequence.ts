import {
    AuthenticateFn,
    AuthenticationBindings,
    AUTHENTICATION_STRATEGY_NOT_FOUND,
    USER_PROFILE_NOT_FOUND,
} from '@loopback/authentication';
import { inject } from '@loopback/core';
import {
    FindRoute,
    InvokeMethod,
    InvokeMiddleware,
    ParseParams,
    Reject,
    RequestContext,
    RestBindings,
    Send,
    SequenceHandler,
} from '@loopback/rest';

const SequenceActions = RestBindings.SequenceActions;

export class MySequence implements SequenceHandler {
    /**
     * Optional invoker for registered middleware in a chain.
     * To be injected via SequenceActions.INVOKE_MIDDLEWARE.
     */
    @inject(SequenceActions.INVOKE_MIDDLEWARE, { optional: true })
    protected invokeMiddleware: InvokeMiddleware = () => false;

    constructor(
        @inject(SequenceActions.FIND_ROUTE) protected findRoute: FindRoute,
        @inject(SequenceActions.PARSE_PARAMS) protected parseParams: ParseParams,
        @inject(SequenceActions.INVOKE_METHOD) protected invoke: InvokeMethod,
        @inject(SequenceActions.SEND) public send: Send,
        @inject(SequenceActions.REJECT) public reject: Reject,
        @inject(AuthenticationBindings.AUTH_ACTION)
        protected authenticateRequest: AuthenticateFn,
    ) {}

    async handle(context: RequestContext) {
        try {
            const { request, response } = context;
            const finished = await this.invokeMiddleware(context);
            if (finished) return;
            const route = this.findRoute(request);
            const args = await this.parseParams(request, route);

            //call authentication action
            await this.authenticateRequest(request);

            const result = await this.invoke(route, args);
            this.send(response, result);
        } catch (err) {
            //Facebook Login Error Handling
            if (err.message && err.message.oauthError)
                Object.assign(err, {
                    statusCode: err.message.oauthError.statusCode,
                    message: err.message.message,
                    name: err.message.name,
                });
            //Google Login Error Handling
            if (err.message && err.message.message)
                Object.assign(err, {
                    // statusCode: err.message.oauthError.statusCode,
                    message: 'Session expired. Login Again.',
                    // name: err.message.name,
                });

            if (err.code === AUTHENTICATION_STRATEGY_NOT_FOUND || err.code === USER_PROFILE_NOT_FOUND)
                Object.assign(err, { statusCode: 401 });

            // if (err.statusCode === 404) Object.assign(err, { message: `The Resource was not found.` });

            this.reject(context, err);
        }
    }
}
