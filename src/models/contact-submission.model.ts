import { belongsTo, Entity, model, property } from '@loopback/repository';
import { User } from './user.model';

@model()
export class ContactSubmission extends Entity {
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
    message: string;

    @property({
        type: 'string',
    })
    reply: string;

    @belongsTo(() => User)
    userId: number;

    @property({
        type: 'date',
        default: () => new Date(),
    })
    createdAt?: Date;

    @property({
        type: 'date',
        default: () => new Date(),
    })
    updatedAt?: Date;

    @property({
        type: 'boolean',
        default: false,
    })
    read: boolean;

    @property({
        type: 'date',
    })
    readAt?: Date | null;

    @property({
        type: 'date',
    })
    repliedAt?: Date | null;

    constructor(data?: Partial<ContactSubmission>) {
        super(data);
    }
}

export interface ContactSubmissionRelations {
    // describe navigational properties here
    user?: User;
}

export type ContactSubmissionWithRelations = ContactSubmission & ContactSubmissionRelations;
