import { Module } from '@nestjs/common';
import { DecisionsController } from './decisions.controller';
import { DecisionsService } from './decisions.service';
import { DatabaseModule } from '../database/database.module';
import { CompaniesModule } from '../companies/companies.module';
import { PortfolioModule } from '../portfolio/portfolio.module';

@Module({
  imports: [DatabaseModule, CompaniesModule, PortfolioModule],
  controllers: [DecisionsController],
  providers: [DecisionsService],
  exports: [DecisionsService],
})
export class DecisionsModule {}
