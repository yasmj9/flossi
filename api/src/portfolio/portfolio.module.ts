import { Module } from '@nestjs/common';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';
import { DatabaseModule } from '../database/database.module';
import { CompaniesModule } from '../companies/companies.module';

@Module({
  imports: [DatabaseModule, CompaniesModule],
  controllers: [PortfolioController],
  providers: [PortfolioService],
  exports: [PortfolioService],
})
export class PortfolioModule {}
