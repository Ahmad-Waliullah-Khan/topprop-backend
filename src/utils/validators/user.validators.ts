import { ValidatorHelpers } from '../helpers';

export const USER_VALIDATORS = {
    id: {
        required: true,
        type: Number,
        message: {
            required: 'User id is required.',
            type: 'User id must be a number.',
        },
    },
    password: {
        type: String,
        required: true,
        length: { min: 6 },
        //string must contain 1 number , 1 lowercase and 1 uppercase. Extra symbols allowed too.
        // match: /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[~!@#$ <>()=,;:%^&*-_\.+]).{8,}$/,
        message: {
            required: 'Password is required.',
            length: 'Password must contain at least 6 characters.',
            // match: 'Password must have at least one uppercase, one lowercase and 1 number.',
        },
    },
    confirmPassword: {
        type: String,
        required: true,
        use: { comparePasswords: ValidatorHelpers.comparePasswords },
        message: {
            comparePasswords: 'Confirm Password must match with password.',
            required: 'Confirm Password is required.',
        },
    },
    email: {
        type: String,
        required: true,
        match: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        message: {
            required: 'Email is required.',
            match: 'Invalid email.',
        },
    },
    emailOrUsername: {
        type: String,
        required: true,
        message: {
            required: 'Email or username is required.',
        },
    },
    username: {
        type: String,
        required: true,
        match: /^@(?=.{5,20}$)(?:[a-zA-Z\d]+(?:(?:\.|-|_)[a-zA-Z\d])*)+$/,
        message: {
            required: 'Username is required.',
            match: `Username must start with @. Could be alphanumeric and can contain symbols (- _ . -one at a time-) and must contain between 6 and 20 characters.`,
        },
    },
    fullName: {
        type: String,
        required: true,
        message: {
            required: 'Full Name is required.',
        },
    },
    // phone: {
    //     type: String,
    //     required: true,
    //     match: /^\d{10}$|^(\+1|\+52)\d{10}$/,
    //     message: {
    //         required: 'Phone number is required.',
    //         match: 'Phone must have 10 digits.',
    //     },
    // },
    // address: {
    //     use: { validAddress: ValidatorHelpers.validAddress },
    //     required: true,
    //     message: {
    //         validAddress:
    //             'Address must contain at least: street 1, city, state, country, latitude, longitude and zip code (5 digits).',
    //     },
    // },
    // username: {
    //     type: String,
    //     length: { min: 5, max: 16 },
    //     match: /^[a-zA-Z0-9]{5,16}$/,
    //     message: {
    //         length: 'Username must contain between 5 and 16 characters',
    //         match: 'Username must contain only letters (a,B, etc.) and numbers (1,16, etc.).',
    //     },
    // },
    forgotPasswordToken: {
        type: String,
        required: true,
        match: /^[a-z0-9]{6}$/,
        message: {
            required: 'Forgot password token is required.',
            match: 'Bad formatted token.',
        },
    },
    confirmAccountToken: {
        type: String,
        required: true,
        match: /^[a-z0-9]{6}$/,
        message: {
            required: 'Confirm Account Token is required.',
            match: 'Bad formatted token.',
        },
    },
    // notificationType: {
    //     type: String,
    //     required: true,
    //     enum: values(USER_NOTIFICATION_TYPES),
    //     message: {
    //         required: 'Notification type is a required param (notificationType).',
    //         enum: `Notification type must be one of these options: ${values(USER_NOTIFICATION_TYPES).join(', ')}.`,
    //     },
    //     // type: String,
    //     // required: true,
    //     // length: {
    //     //     min: 2,
    //     //     max: 4
    //     // },
    //     // use: { validNotificationTypes: validNotificationTypes() },
    //     // message: {
    //     //     required: 'Notification types is required.',
    //     //     length: "Notification types must contain between 2 and 4 elements",
    //     //     validNotificationTypes: validNotificationTypes(true)
    //     // }
    // },
};
