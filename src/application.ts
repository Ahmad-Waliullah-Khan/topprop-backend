import { AuthenticationComponent, registerAuthenticationStrategy } from '@loopback/authentication';
import { BootMixin } from '@loopback/boot';
import { ApplicationConfig } from '@loopback/core';
import { RepositoryMixin } from '@loopback/repository';
import { RestApplication } from '@loopback/rest';
import { ServiceMixin } from '@loopback/service-proxy';
import { isEqual } from 'lodash';
import morgan from 'morgan';
import { JWTAuthenticationStrategy } from './authentication-strategies';
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

        //* Register jwt ath strategy
        registerAuthenticationStrategy(this, JWTAuthenticationStrategy);

        // Set up the custom sequence
        this.sequence(MySequence);

        this.component(AuthenticationComponent);

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
