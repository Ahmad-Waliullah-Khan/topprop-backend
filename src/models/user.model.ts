import { Entity, hasMany, model, property } from '@loopback/repository';
import { ROLES } from '@src/utils/constants';
import { Bet } from './bet.model';
import { ContactSubmission } from './contact-submission.model';
import { Contest } from './contest.model';
import { Gain } from './gain.model';
import { TopUp } from './top-up.model';

@model({
    settings: {
        hiddenProperties: ['hash', 'permissions', 'role'],
    },
})
export class User extends Entity {
    @property({
        type: 'number',
        id: true,
        generated: true,
    })
    id: number;

    @property({
        type: 'string',
        required: true,
    })
    fullName: string;

    @property({
        type: 'string',
        required: true,
        index: {
            unique: true,
        },
    })
    username: string;

    @property({
        type: 'string',
        required: true,
        index: {
            unique: true,
        },
    })
    email: string;

    @property({
        type: 'string',
    })
    hash?: string;

    @property({
        type: 'string',
    })
    _customerToken: string;

    @property({
        type: 'string',
    })
    _connectToken: string;

    @property({
        type: 'date',
        default: null,
    })
    accountConfirmedAt?: Date | null;

    @property({
        type: 'string',
    })
    confirmAccountToken?: string | null;

    @property({
        type: 'string',
        default: null,
    })
    forgotPasswordToken?: string | null;

    @property({
        type: 'date',
        default: null,
    })
    forgotPasswordTokenExpiresIn?: Date | null;

    @property({
        type: 'array',
        itemType: 'string',
    })
    permissions: string[];

    @property({
        type: 'string',
    })
    role: ROLES;

    @property({
        type: 'string',
    })
    socialId?: string;

    @property({
        type: 'string',
    })
    profileImage?: string | null;

    @property({
        type: 'date',
        default: () => new Date(),
    })
    createdAt?: string;

    @property({
        type: 'date',
        default: () => new Date(),
    })
    updatedAt?: string;

    @hasMany(() => ContactSubmission)
    contactSubmissions: ContactSubmission[];

    @hasMany(() => TopUp)
    topUps: TopUp[];

    @hasMany(() => Contest, { keyTo: 'creatorId' })
    contests: Contest[];

    @hasMany(() => Bet)
    bets: Bet[];

    @hasMany(() => Gain)
    gains: Gain[];

    constructor(data?: Partial<User>) {
        super(data);
    }
}

export interface UserRelations {
    // describe navigational properties here
    contactSubmissions?: ContactSubmission[];
    topUps?: TopUp[];
    gains?: Gain[];
    bets?: Bet[];
}

export type UserWithRelations = User & UserRelations;
