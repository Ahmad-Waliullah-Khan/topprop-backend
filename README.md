
# TopProp Backend

## Requirements

 1. Node JS (Dockerized or locally)
 2. [Loobpack 4 CLI](https://loopback.io/doc/en/lb4/Command-line-interface.html) (Optional but useful to create resources like services, controllers, relationships, etc)
 3. PostgreSQL (Optional)
 4. Set `.env` file

## Run Locally
If the server will be running locally there are some considerations to take into account to establish a DB connection.

### Setup Database
#### Use the remote DB (RDS)
The remote database is hosted in an RDS AWS Instance, by default the connection port is blocked and the instance only allows connections for certain IP addresses. **You must add your current IP address to the instance security group to be allowed to connect to the remote DB.**

#### Use a local server instance
On the other hand, you can create a local postgres server and connect to it. For this, you can dockerize a postgres image or you can download and set up  your local environment.
If you decide to use docker, you must pass the env variables required to establish the connection. Please see the `.env` file to know those variables.

### Run
Once you have the environment ready, run the following:

    npm start


### Debug
Within the repository there is a `launch.json` file that contains the configuration to debug the app using Visual Studio Code. You need to do the following to start debugging the app:

 1. Run `npm run build:watch`
 2. Start the debugger

### Test

There are several commands in the `package.json` file to test certain resources, to test them individually, you need to:

 1. `npm run build:watch`
 2. `npm run test:users` For example

To run all the test you need to run `npm test`

**NOTE: To run the tests locally you need to have a local postgres server instance running with the same env variables that in the `.env` to simulate the DB interactions.**

### Seed Data
If you would like to work with a local DB instance, it is recommended to copy at least the admin user. If not you can simulate a sign-up API call using the admin email provided in the `.env` file and that will create an admin.

###  Migrations

By default the app is configured to run migration on every startup, however, there are some commands that help to perform this actions. To know more details, please see [this](https://loopback.io/doc/en/lb4/Database-migrations.html)

### Postman
A copy of the collection will be provided along with the environments
