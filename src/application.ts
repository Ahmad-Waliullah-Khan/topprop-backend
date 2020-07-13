import {
    AuthenticationBindings,
    AuthenticationComponent,
    registerAuthenticationStrategy,
} from '@loopback/authentication';
import { AuthorizationComponent } from '@loopback/authorization';
import { BootMixin } from '@loopback/boot';
import { addExtension, ApplicationConfig } from '@loopback/core';
import { RepositoryMixin } from '@loopback/repository';
import { RestApplication } from '@loopback/rest';
import { ServiceMixin } from '@loopback/service-proxy';
import { isEqual } from 'lodash';
import morgan from 'morgan';
import {
    JWTAuthenticationStrategy,
    PassportFacebookTokenAuthProvider,
    PassportGoogleTokenAuthProvider,
} from './authentication-strategies';
import { MySequence } from './sequence';
import { ApplicationHelpers } from './utils/helpers';

export { ApplicationConfig };

export class TopPropBackendApplication extends BootMixin(ServiceMixin(RepositoryMixin(RestApplication))) {
    constructor(options: ApplicationConfig = {}) {
        super(options);

        //Binding DB credentials
        !isEqual(process.env.NODE_ENV, 'test') && ApplicationHelpers.bindDbSourceCredential(this);

        // Register `morgan` express middleware
        !isEqual(process.env.NODE_ENV, 'test') &&
            this.expressMiddleware(
                'middleware.morgan',
                morgan(':method :url | Status: :status | Res Time: :response-time ms | Date-Time: :date[clf]'),
            );

        this.bind('TOKEN_SECRET_SIGN').to(process.env.TOKEN_SECRET_SIGN);
        this.bind('TOKEN_EXPIRATION_IN').to('15d');

        //* Register jwt auth strategy
        registerAuthenticationStrategy(this, JWTAuthenticationStrategy);

        //* Register fb token strategy
        this.bind('authentication.facebookToken.verify').toProvider(PassportFacebookTokenAuthProvider);

        // register PassportBasicAuthProvider as a custom authentication strategy
        addExtension(
            this,
            AuthenticationBindings.AUTHENTICATION_STRATEGY_EXTENSION_POINT_NAME,
            PassportFacebookTokenAuthProvider,
            {
                namespace: AuthenticationBindings.AUTHENTICATION_STRATEGY_EXTENSION_POINT_NAME,
            },
        );

        //* Register google token strategy
        this.bind('authentication.googleToken.verify').toProvider(PassportGoogleTokenAuthProvider);

        // register PassportBasicAuthProvider as a custom authentication strategy
        addExtension(
            this,
            AuthenticationBindings.AUTHENTICATION_STRATEGY_EXTENSION_POINT_NAME,
            PassportGoogleTokenAuthProvider,
            {
                namespace: AuthenticationBindings.AUTHENTICATION_STRATEGY_EXTENSION_POINT_NAME,
            },
        );

        // Set up the custom sequence
        this.sequence(MySequence);

        this.component(AuthenticationComponent);
        this.component(AuthorizationComponent);

        // Set up default home page
        // this.static('/', path.join(__dirname, '../public'));

        // Customize @loopback/rest-explorer configuration here
        // this.configure(RestExplorerBindings.COMPONENT).to({
        //     path: '/explorer',
        // });
        // this.component(RestExplorerComponent);

        this.projectRoot = __dirname;
        // Customize @loopback/boot Booter Conventions here
        this.bootOptions = {
            controllers: {
                // Customize ControllerBooter Conventions here
                dirs: ['controllers'],
                extensions: ['.controller.js'],
                nested: true,
            },
        };
    }
}
