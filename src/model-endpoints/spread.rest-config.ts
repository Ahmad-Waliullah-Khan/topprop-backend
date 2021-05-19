import {ModelCrudRestApiConfig} from '@loopback/rest-crud';
import {Spread} from '../models';

const config: ModelCrudRestApiConfig = {
  model: Spread,
  pattern: 'CrudRest',
  dataSource: 'db',
  basePath: '/spreads',
};
module.exports = config;
