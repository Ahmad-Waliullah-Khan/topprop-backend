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

export enum WITHDRAW_REQUEST_STATUSES {
    PENDING = 'pending',
    APPROVED = 'approved',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    DENIED = 'denied',
}

export enum DWOLLA_WEBHOOK_EVENTS {
    CUSTOMER_CREATED = 'customer_created',
    CUSTOMER_VERIFIED = 'customer_verified',
    CUSTOMER_VERIFICATION_DOCUMENT_NEEDED = 'customer_verification_document_needed', //	Additional documentation is needed to verify a Customer.
    CUSTOMER_VERIFICATION_DOCUMENT_UPLOADED = 'customer_verification_document_uploaded', //	A verification document was uploaded for a Customer.
    CUSTOMER_VERIFICATION_DOCUMENT_FAILED = 'customer_verification_document_failed', //	A verification document has been rejected for a Customer.
    CUSTOMER_VERIFICATION_DOCUMENT_APPROVED = 'customer_verification_document_approved', //	A verification document was approved for a Customer.
    CUSTOMER_REVERIFICATION_NEEDED = 'customer_reverification_needed', //	Incomplete information was received for a Customer; updated information is needed to verify the Customer.
    CUSTOMER_FUNDING_SOURCE_VERIFIED = 'customer_funding_source_verified', //	Incomplete information was received for a Customer; updated information is needed to verify the Customer.
    CUSTOMER_FUNDING_SOURCE_UNVERIFIED = 'customer_funding_source_unverified', //	Incomplete information was received for a Customer; updated information is needed to verify the Customer.
    CUSTOMER_BANK_TRANSFER_CREATED = 'customer_bank_transfer_created', //	Incomplete information was received for a Customer; updated information is needed to verify the Customer.
    CUSTOMER_BANK_TRANSFER_COMPLETED = 'customer_bank_transfer_completed', //	Incomplete information was received for a Customer; updated information is needed to verify the Customer.
    CUSTOMER_BANK_TRANSFER_FAILED = 'customer_bank_transfer_failed', //	Incomplete information was received for a Customer; updated information is needed to verify the Customer.
}
// export const DWOLLA_WEBHOOKS: { url: string; secret: string; type: DWOLLA_WEBHOOK_EVENTS }[] = [
//     {
//         url: '',
//         secret: process.env.DWOLLA_WEBHOOK_CUSTOMER_VERIFIED_SECRET as string,
//         type: DWOLLA_WEBHOOK_EVENTS.CUSTOMER_VERIFIED,
//     },
//     {
//         url: '',
//         secret: process.env.DWOLLA_WEBHOOK_CUSTOMER_VERIFICATION_DOCUMENT_NEEDED_SECRET as string,
//         type: DWOLLA_WEBHOOK_EVENTS.CUSTOMER_VERIFICATION_DOCUMENT_NEEDED,
//     },
//     // {
//     //     url: '',
//     //     secret: process.env.DWOLLA_WEBHOOK_CUSTOMER_VERIFICATION_DOCUMENT_UPLOADED_SECRET as string,
//     //     type: DWOLLA_WEBHOOK_EVENTS.CUSTOMER_VERIFICATION_DOCUMENT_UPLOADED,
//     // },
//     {
//         url: '',
//         secret: process.env.DWOLLA_WEBHOOK_CUSTOMER_VERIFICATION_DOCUMENT_FAILED_SECRET as string,
//         type: DWOLLA_WEBHOOK_EVENTS.CUSTOMER_VERIFICATION_DOCUMENT_FAILED,
//     },
//     {
//         url: '',
//         secret: process.env.DWOLLA_WEBHOOK_CUSTOMER_VERIFICATION_DOCUMENT_APPROVED_SECRET as string,
//         type: DWOLLA_WEBHOOK_EVENTS.CUSTOMER_VERIFICATION_DOCUMENT_APPROVED,
//     },
//     {
//         url: '',
//         secret: process.env.DWOLLA_WEBHOOK_CUSTOMER_REVERIFICATION_NEEDED_SECRET as string,
//         type: DWOLLA_WEBHOOK_EVENTS.CUSTOMER_REVERIFICATION_NEEDED,
//     },
//     {
//         url: '',
//         secret: process.env.DWOLLA_WEBHOOK_CUSTOMER_FUNDING_SOURCE_VERIFIED_SECRET as string,
//         type: DWOLLA_WEBHOOK_EVENTS.CUSTOMER_FUNDING_SOURCE_VERIFIED,
//     },
//     {
//         url: '',
//         secret: process.env.DWOLLA_WEBHOOK_CUSTOMER_FUNDING_SOURCE_UNVERIFIED_SECRET as string,
//         type: DWOLLA_WEBHOOK_EVENTS.CUSTOMER_FUNDING_SOURCE_UNVERIFIED,
//     },
//     // {
//     //     url: '',
//     //     secret: process.env.DWOLLA_WEBHOOK_CUSTOMER_BANK_TRANSFER_CREATED_SECRET as string,
//     //     type: DWOLLA_WEBHOOK_EVENTS.CUSTOMER_BANK_TRANSFER_CREATED,
//     // },
//     {
//         url: '',
//         secret: process.env.DWOLLA_WEBHOOK_CUSTOMER_BANK_TRANSFER_FAILED_SECRET as string,
//         type: DWOLLA_WEBHOOK_EVENTS.CUSTOMER_BANK_TRANSFER_FAILED,
//     },
//     {
//         url: '',
//         secret: process.env.DWOLLA_WEBHOOK_CUSTOMER_BANK_TRANSFER_COMPLETED_SECRET as string,
//         type: DWOLLA_WEBHOOK_EVENTS.CUSTOMER_BANK_TRANSFER_COMPLETED,
//     },
// ];
