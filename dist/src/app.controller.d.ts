import { ConfigService } from '@nestjs/config';
export declare class AppController {
    private readonly configService;
    constructor(configService: ConfigService);
    getStatus(): {
        isMockMode: boolean;
        status: string;
        time: string;
    };
}
