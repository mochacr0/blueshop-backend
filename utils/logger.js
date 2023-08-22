// import winston from 'winston';
// import 'winston-mongodb';
// import Log from '../models/logs.model.js';

// const logger = winston.createLogger({
//     transports: [
//         new winston.transports.Console(),
//         new winston.transports.MongoDB({
//             level: 'error',
//             db: process.env.MONGO_URL,
//             collection: 'logs',
//             options: { useNewUrlParser: true, useUnifiedTopology: true },
//         }),
//         new winston.transports.MongoDB({
//             level: 'info',
//             db: process.env.MONGO_URL,
//             collection: 'logs',
//             options: { useNewUrlParser: true, useUnifiedTopology: true },
//         }),
//     ],
// });

// export default logger;
