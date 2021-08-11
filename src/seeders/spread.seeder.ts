import lobbySeeder from './spread/lobby.seeder';
import oneToTwoSeeder from './spread/1-2.seeder';
import threeToSixSeeder from './spread/3-6.seeder';
import sevenToEighteenSeeder from './spread/7-18.seeder';

export const SpreadSeeder = [...lobbySeeder, ...oneToTwoSeeder, ...threeToSixSeeder, ...sevenToEighteenSeeder];
