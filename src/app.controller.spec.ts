import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { ConfigService } from '@nestjs/config';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: ConfigService,
          useValue: { get: () => 'mock_key' },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('status', () => {
    it('should return health status', () => {
      expect(appController.getStatus().status).toBe('healthy');
    });
  });
});
