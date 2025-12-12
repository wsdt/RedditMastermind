import { INestApplication, VersioningType } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { writeFileSync } from "fs";
import helmet from "helmet";
import * as path from "path";
import * as process from "process";
import { AppModule } from "./app.module";
import { TYPED_ENV, validateEnv } from "./utils/env.utils";
import { API_VERSION, BE_ENDPOINT } from "./utils/misc.utils";

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        cors: {
            origin: "*",
            methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
            preflightContinue: false,
            optionsSuccessStatus: 204,
        },
        // @dev logger: new InfluxLogger(), (for developer reviewing this, big fan of persisted logging lol, not needed for this project but in real-world projects it's a must-have)
    });

    // @dev https://docs.nestjs.com/techniques/versioning
    // Set default version globally - all controllers will use v1 unless overridden
    app.enableVersioning({
        type: VersioningType.URI,
        defaultVersion: API_VERSION,
    });

    setupSwagger(app);
    setupTypedEnvs();

    // Ensure logs are written on application shutdown
    app.enableShutdownHooks();

    // security base line
    app.use(helmet());

    await app.listen(TYPED_ENV.BE_PORT);
}

const setupSwagger = (app: INestApplication) => {
    const config = new DocumentBuilder()
        .setTitle("RedditMastermind")
        .setDescription("API of RedditMastermind")
        .setVersion(API_VERSION)
        .addServer(BE_ENDPOINT)
        .addTag("app")
        .build();
    const document = SwaggerModule.createDocument(app, config, {
        deepScanRoutes: true,
        extraModels: [],
    });

    const outputPath = path.resolve(process.cwd(), "swagger.json");
    writeFileSync(outputPath, JSON.stringify(document), { encoding: "utf8" });

    SwaggerModule.setup("api", app, document);
};

/** @dev TypedENVs for better development experience. If a required env is not defined then backend should throw an error. */
const setupTypedEnvs = () => {
    try {
        validateEnv();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

bootstrap()
    .then(() =>
        console.log(
            `Backend started ${process.env.NODE_ENV ? `in ${process.env.NODE_ENV?.trim()} mode` : ""}..`,
        ),
    )
    .catch(console.error);
