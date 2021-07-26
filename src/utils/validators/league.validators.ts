export const LEAGUE_CONTEST_VALIDATOR = {
    creatorTeamId: {
        required: true,
        type: Number,
        message: {
            required: 'Creator Team Id is required.',
            type: 'Creator Team Id must be a number.',
        },
    },
    claimerTeamId: {
        required: true,
        type: Number,
        message: {
            required: 'Claimer Team Id is required.',
            type: 'Claimer Team Id must be a number.',
        },
    },
    entryAmount: {
        required: true,
        type: Number,
        message: {
            required: 'Entry Amount is required.',
            type: 'Entry Amount must be a numeric value.',
        },
    },
    winBonus: {
        required: true,
        type: Boolean,
        message: {
            required: 'Win Bonus Key is required.',
            type: 'Win Bonus Key must be a Boolean.',
        },
    },

};

export const LEAGUE_CONTEST_CLAIM_VALIDATOR = {
    leagueContestId: {
        required: true,
        type: Number,
        message: {
            required: 'League Contest id is required.',
            type: 'League Contest id must be a number.',
        },
    },
    claimerId: {
        required: true,
        type: Number,
        message: {
            required: 'Claimer id is required.',
            type: 'Claimer id must be a number.',
        },
    },
};
