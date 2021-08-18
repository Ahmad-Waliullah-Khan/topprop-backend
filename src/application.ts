import {
    AuthenticationBindings,
    AuthenticationComponent,
    registerAuthenticationStrategy,
} from '@loopback/authentication';
import { AuthorizationComponent } from '@loopback/authorization';
import { BootMixin } from '@loopback/boot';
import { addExtension, ApplicationConfig, createBindingFromClass } from '@loopback/core';
import { CronComponent } from '@loopback/cron';
import { RepositoryMixin } from '@loopback/repository';
import { RequestBodyParserOptions, RestApplication, RestBindings } from '@loopback/rest';
import { CrudRestComponent } from '@loopback/rest-crud';
import { ServiceMixin } from '@loopback/service-proxy';
import { isEqual } from 'lodash';
import morgan from 'morgan';
import { join } from 'path';
import {
    JWTAuthenticationStrategy,
    PassportFacebookTokenAuthProvider,
    PassportGoogleTokenAuthProvider,
} from './authentication-strategies';
import {
    PlayersCron,
    ProjectedFantasyPointsCron,
    PlayerFantasyPointsCron,
    WinCriteriaCron,
    TimeframeCron,
    CloseContestsCron,
    SpecialTeamsCron,
    SyncGamesCron,
    EspnSyncLeaguesCron,
    YahooSyncLeaguesCron,
    LeagueWinCriteriaCron,
} from './cron-jobs';
import { ImportSourceRepository, ScoringTypeRepository, SpreadRepository } from './repositories';
import { ImportSourceSeeder, ScoringTypeSeeder, SpreadSeeder } from './seeders';
import { MySequence } from './sequence';
import { ApplicationHelpers } from './utils/helpers';
import { IRawRequest } from './utils/interfaces';

export { ApplicationConfig };

export class TopPropBackendApplication extends BootMixin(ServiceMixin(RepositoryMixin(RestApplication))) {
    constructor(options: ApplicationConfig = {}) {
        super(options);

        //* Handle raw body data for stripe webhook endpoints
        const requestBodyParserOptions: RequestBodyParserOptions = {
            json: {
                strict: true,
                limit: '2mb',
                verify: function (req: IRawRequest, res, buf) {
                    const url = req.originalUrl;
                    if (/stripe-webhooks/gi.test(url)) req.rawBody = buf;
                },
            },
        };
        this.bind(RestBindings.REQUEST_BODY_PARSER_OPTIONS).to(requestBodyParserOptions);

        

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

        this.bind(RestBindings.ERROR_WRITER_OPTIONS).to({ debug: false, safeFields: ['errorCode'] });

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
        this.component(CrudRestComponent);

        this.component(CronComponent);

        const PlayersCronBinding = createBindingFromClass(PlayersCron);
        this.add(PlayersCronBinding);

        const ProjectedFantasyPointsCronBinding = createBindingFromClass(ProjectedFantasyPointsCron);
        this.add(ProjectedFantasyPointsCronBinding);

        const PlayerFantasyPointsCronBinding = createBindingFromClass(PlayerFantasyPointsCron);
        this.add(PlayerFantasyPointsCronBinding);

        const WinCriteriaCronBinding = createBindingFromClass(WinCriteriaCron);
        this.add(WinCriteriaCronBinding);

        const TimeframeCronBinding = createBindingFromClass(TimeframeCron);
        this.add(TimeframeCronBinding);

        const CloseContestsCronBinding = createBindingFromClass(CloseContestsCron);
        this.add(CloseContestsCronBinding);

        const SpecialTeamsCronBinding = createBindingFromClass(SpecialTeamsCron);
        this.add(SpecialTeamsCronBinding);

        const LeagueWinCriteriaCronBinding = createBindingFromClass(LeagueWinCriteriaCron);
        this.add(LeagueWinCriteriaCronBinding);

        // const fakeResultsCronBinding = createBindingFromClass(FakeResultsCron);
        // this.add(fakeResultsCronBinding);

        // const syncTeamsCronBinding = createBindingFromClass(SyncTeamsCron);
        // this.add(syncTeamsCronBinding);

        const syncGamesCronBinding = createBindingFromClass(SyncGamesCron);
        this.add(syncGamesCronBinding);

        const EspnSyncLeaguesCronBinding = createBindingFromClass(EspnSyncLeaguesCron);
        this.add(EspnSyncLeaguesCronBinding);

        const YahooSyncLeaguesCronBinding = createBindingFromClass(YahooSyncLeaguesCron);
        this.add(YahooSyncLeaguesCronBinding);

        // const playerResultsCronBinding = createBindingFromClass(PlayerResultsCron);
        // this.add(playerResultsCronBinding);
        // Set up default home page
        // this.static('/', path.join(__dirname, '../public'));
        this.static('/images', join(__dirname, '../public/images'));
    }

    async migrateSchema(options: any) {
        // 1. Run migration scripts provided by connectors
        await super.migrateSchema(options);

        // 2. Make further changes. When creating predefined model instances,
        // handle the case when these instances already exist.
        const spreadRepo = await this.getRepository(SpreadRepository);
        spreadRepo.deleteAll();
        await spreadRepo.createAll(SpreadSeeder);

        const scoringTypeRepo = await this.getRepository(ScoringTypeRepository);
        await scoringTypeRepo.deleteAll();
        await scoringTypeRepo.createAll(ScoringTypeSeeder);

        const importSourceRepo = await this.getRepository(ImportSourceRepository);
        await importSourceRepo.deleteAll();
        await importSourceRepo.createAll(ImportSourceSeeder);
    }
}
