import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import morgan from 'morgan';
import path from 'path';
import swaggerUiExpress from 'swagger-ui-express';
import { fileURLToPath } from 'url';
import YAML from 'yamljs';
import connectDatabase from './config/db.config.js';
import routes from './controllers/index.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';
import OrderService from './services/OrderService.js';

dotenv.config();
const app = express();
app.use(express.static('public'));
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));
app.enable('trust proxy');

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

// parse application/json
app.use(bodyParser.json());

//handle route for api v1.0
routes(app);

app.get('/', (req, res) => {
    res.json('Hello World');
});

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

app.listen(PORT, async () => {
    console.log(`Server run in port ${PORT}`);
    await connectDatabase();
    await OrderService.cancelExpiredOrdersOnStarup();
});
