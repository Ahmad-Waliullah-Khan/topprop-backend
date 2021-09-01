import {ValidatorHelpers} from '../helpers';

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
        length: {min: 8},
        //string must contain 1 number , 1 lowercase and 1 uppercase. Extra symbols allowed too.
        match: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        message: {
            required: 'Password is required.',
            length: 'Password must contain at least 8 characters.',
            match: 'Password must contain at least 8 characters, one number, one uppercase alphabet, one lowercase alphabet, and one special character.',
        },
    },
    confirmPassword: {
        type: String,
        required: true,
        use: {comparePasswords: ValidatorHelpers.comparePasswords},
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
    // username: {
    //     type: String,
    //     required: true,
    //     message: {
    //         required: 'Username is required.',
    //     },
    // },
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
    username: {
        type: String,
        required: true,
        length: {min: 4, max: 20},
        match: /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]/,
        message: {
            required: 'Username is required.',
            length: 'Username must contain between 4 and 20 characters',
            match: 'Username must contain at least one letter (a,B, etc.), one number (1,16, etc.) and one special character (! , @ , # , $ , % , ^ , & , *).',
        },
    },
    forgotPasswordToken: {
        type: String,
        required: true,
        match: /^[a-z0-9]{24}$/,
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
    state: {
        type: String,
        required: true,
        message: {
            required: 'Sign Up State is required.',
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
