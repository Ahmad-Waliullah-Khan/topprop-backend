import { bind, /* inject, */ BindingScope } from '@loopback/core';
import { repository } from '@loopback/repository';
import { UserRepository } from '@src/repositories';

@bind({ scope: BindingScope.SINGLETON })
export class WalletService {
    constructor(@repository('UserRepository') private userRepository: UserRepository) {}

    async userBalance(userId: number): Promise<number> {
        //* RETRIEVE ALL TOP-UPS WHICH HAVE NOT BEEN PAID OUT

        const topUps = await this.userRepository.topUps(userId).find({
            where: { transferred: false, refunded: false },
            fields: { netAmount: true },
        });
        const bets = await this.userRepository.bets(userId).find({
            where: { transferred: false },
            fields: { amount: true },
        });
        const gains = await this.userRepository.gains(userId).find({
            where: { transferred: false },
            fields: { amount: true },
        });

        const totalTopUpsAMount = topUps.reduce((total, current) => {
            return total + current.netAmount;
        }, 0);
        const totalBetsAMount = bets.reduce((total, current) => {
            return total + +current.amount;
        }, 0);

        const totalGainsAMount = gains.reduce((total, current) => {
            return total + +current.amount;
        }, 0);

        return totalTopUpsAMount + totalGainsAMount - totalBetsAMount;
    }
}
