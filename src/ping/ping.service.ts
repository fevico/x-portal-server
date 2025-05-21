// src/ping.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PingService {
  private readonly logger = new Logger(PingService.name);

  constructor(private readonly http: HttpService) {}

  /**
   * Runs every 14th minute (i.e. at minute 0, 14, 28, 42, 56 of each hour)
   */
  @Cron('*/14 * * * *')
  async handleCron() {
    const url = process.env.API_URL;
    if (!url) {
      this.logger.error('API_URL not configured');
      return;
    }

    try {
      // Using Nest’s HttpService (wraps axios + RxJS)
      const response = await firstValueFrom(this.http.get(url));
      if (response.status === 200) {
        this.logger.log('Ping OK');
      } else {
        this.logger.error(`Ping failed: HTTP ${response.status}`);
      }
    } catch (err) {
      this.logger.error('Error pinging:', err);
    }
  }
}
