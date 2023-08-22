import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import YAML from 'yamljs';
import swaggerUiExpress from 'swagger-ui-express';
import connectDatabase from './config/db.config.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import path from 'path';
import routes from './routes/index.js';
import multer from 'multer';
// import logger from './utils/logger.js';
import { deleteExpiredTokens } from './cronJobs/cronJobs.js';

dotenv.config();
connectDatabase();
const app = express();
app.use(express.static('public'));
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));
//handle route for api v1.0
routes(app);

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

// parse application/json
app.use(bodyParser.json());

// swagger;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const swaggerPath = path.join(__dirname, 'config', 'swagger.config.yaml');
const swaggerDocument = YAML.load(swaggerPath);
app.use(
    '/fashionshopswagger',
    swaggerUiExpress.serve,
    swaggerUiExpress.setup(swaggerDocument, {
        swaggerOptions: {
            docExpansion: 'none',
        },
    }),
);
app.use('/fashionshopswagger', express.static(path.join(__dirname, 'node_modules/swagger-ui-dist')));
app.use('/fashionshopswagger', express.static(path.join(__dirname, 'node_modules/swagger-ui-dist/css')));
app.use('/fashionshopswagger', express.static(path.join(__dirname, 'node_modules/swagger-ui-dist/js')));

// ERROR HANDLER
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 1000;

app.listen(PORT, console.log(`Server run in port ${PORT}`));
