import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { CompaniesService } from './companies.service';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  async getAllCompanies() {
    return this.companiesService.findAllCompanies();
  }

  @Get(':ticker')
  async getCompanyDetails(@Param('ticker') ticker: string) {
    return this.companiesService.findCompanyByTicker(ticker);
  }

  @Post()
  async upsertCompany(@Body() body: { ticker: string; name: string; sector: string; description?: string }) {
    return this.companiesService.upsertCompany(body);
  }

  @Post(':ticker/reports')
  async addReport(@Param('ticker') ticker: string, @Body() body: any) {
    return this.companiesService.addFinancialReport(ticker, body);
  }

  @Post(':ticker/prices')
  async addPrice(@Param('ticker') ticker: string, @Body() body: any) {
    return this.companiesService.addPriceObservation(ticker, body);
  }
}
