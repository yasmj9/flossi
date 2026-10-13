import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { CompaniesModule } from './companies/companies.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { DecisionsModule } from './decisions/decisions.module';

@Module({
  imports: [DatabaseModule, CompaniesModule, PortfolioModule, DecisionsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
