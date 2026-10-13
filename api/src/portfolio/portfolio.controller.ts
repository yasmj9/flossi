import { Controller, Get, Post, Body } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';

@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get('summary')
  async getSummary() {
    return this.portfolioService.getPortfolioSummary();
  }

  @Post('buy')
  async recordBuy(@Body() body: { ticker: string; quantity: number; pricePerShare: number; fees: number; transactionDate: string; notes?: string }) {
    return this.portfolioService.recordBuy(body);
  }

  @Post('sell')
  async recordSell(@Body() body: { ticker: string; quantity: number; pricePerShare: number; fees: number; transactionDate: string; notes?: string }) {
    return this.portfolioService.recordSell(body);
  }

  @Post('cash')
  async recordCash(@Body() body: { type: 'DEPOSIT' | 'WITHDRAWAL'; amount: number; transactionDate: string; notes?: string }) {
    return this.portfolioService.recordCashMovement(body);
  }

  @Post('dividend')
  async recordDividend(@Body() body: { ticker: string; paymentDate: string; grossAmount: number; withholdingTax: number; notes?: string }) {
    return this.portfolioService.recordDividend(body);
  }
}
