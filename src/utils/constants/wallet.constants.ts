import Stripe from 'stripe';

export const US_STATES_ABBREVIATIONS = [
    {
        text: 'Alabama',
        value: 'AL',
    },
    {
        text: 'Alaska',
        value: 'AK',
    },
    //? INVALID FOR STRIPE
    // {
    //     text: "American Samoa",
    //     value: "AS",
    // },
    {
        text: 'Arizona',
        value: 'AZ',
    },
    {
        text: 'Arkansas',
        value: 'AR',
    },
    {
        text: 'California',
        value: 'CA',
    },
    {
        text: 'Colorado',
        value: 'CO',
    },
    {
        text: 'Connecticut',
        value: 'CT',
    },
    {
        text: 'Delaware',
        value: 'DE',
    },
    {
        text: 'District Of Columbia',
        value: 'DC',
    },
    //? INVALID FOR STRIPE
    // {
    //     text: "Federated States Of Micronesia",
    //     value: "FM",
    // },
    {
        text: 'Florida',
        value: 'FL',
    },
    {
        text: 'Georgia',
        value: 'GA',
    },
    //? INVALID FOR STRIPE
    // {
    //     text: "Guam",
    //     value: "GU",
    // },
    {
        text: 'Hawaii',
        value: 'HI',
    },
    {
        text: 'Idaho',
        value: 'ID',
    },
    {
        text: 'Illinois',
        value: 'IL',
    },
    {
        text: 'Indiana',
        value: 'IN',
    },
    {
        text: 'Iowa',
        value: 'IA',
    },
    {
        text: 'Kansas',
        value: 'KS',
    },
    {
        text: 'Kentucky',
        value: 'KY',
    },
    {
        text: 'Louisiana',
        value: 'LA',
    },
    {
        text: 'Maine',
        value: 'ME',
    },
    //? INVALID FOR STRIPE
    // {
    //     text: "Marshall Islands",
    //     value: "MH",
    // },
    {
        text: 'Maryland',
        value: 'MD',
    },
    {
        text: 'Massachusetts',
        value: 'MA',
    },
    {
        text: 'Michigan',
        value: 'MI',
    },
    {
        text: 'Minnesota',
        value: 'MN',
    },
    {
        text: 'Mississippi',
        value: 'MS',
    },
    {
        text: 'Missouri',
        value: 'MO',
    },
    {
        text: 'Montana',
        value: 'MT',
    },
    {
        text: 'Nebraska',
        value: 'NE',
    },
    {
        text: 'Nevada',
        value: 'NV',
    },
    {
        text: 'New Hampshire',
        value: 'NH',
    },
    {
        text: 'New Jersey',
        value: 'NJ',
    },
    {
        text: 'New Mexico',
        value: 'NM',
    },
    {
        text: 'New York',
        value: 'NY',
    },
    {
        text: 'North Carolina',
        value: 'NC',
    },
    {
        text: 'North Dakota',
        value: 'ND',
    },
    //? INVALID FOR STRIPE
    // {
    //     text: "Northern Mariana Islands",
    //     value: "MP",
    // },
    {
        text: 'Ohio',
        value: 'OH',
    },
    {
        text: 'Oklahoma',
        value: 'OK',
    },
    {
        text: 'Oregon',
        value: 'OR',
    },
    //? INVALID FOR STRIPE
    // {
    //     text: "Palau",
    //     value: "PW",
    // },
    {
        text: 'Pennsylvania',
        value: 'PA',
    },
    {
        text: 'Puerto Rico',
        value: 'PR',
    },
    {
        text: 'Rhode Island',
        value: 'RI',
    },
    {
        text: 'South Carolina',
        value: 'SC',
    },
    {
        text: 'South Dakota',
        value: 'SD',
    },
    {
        text: 'Tennessee',
        value: 'TN',
    },
    {
        text: 'Texas',
        value: 'TX',
    },
    {
        text: 'Utah',
        value: 'UT',
    },
    {
        text: 'Vermont',
        value: 'VT',
    },
    //? INVALID FOR STRIPE
    // {
    //     text: "Virgin Islands",
    //     value: "VI",
    // },
    {
        text: 'Virginia',
        value: 'VA',
    },
    {
        text: 'Washington',
        value: 'WA',
    },
    {
        text: 'West Virginia',
        value: 'WV',
    },
    {
        text: 'Wisconsin',
        value: 'WI',
    },
    {
        text: 'Wyoming',
        value: 'WY',
    },
];

export enum WALLET_VERIFICATION_FILE_SIDES {
    FRONT = 'front',
    BACK = 'back',
}

export const DEFAULT_CAPABILITIES: Stripe.AccountCreateParams.Capabilities = {
    transfers: {
        requested: true,
    },
};

export enum WITHDRAW_REQUEST_STATUSES {
    PENDING = 'pending',
    DENIED = 'denied',
    ACCEPTED = 'accepted',
}
