import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { DecisionsService, DecisionEvaluationCriteria } from './decisions.service';

@Controller('decisions')
export class DecisionsController {
  constructor(private readonly decisionsService: DecisionsService) {}

  @Get('evaluate')
  async evaluateGet(@Query() query: any) {
    return this.decisionsService.evaluateMonthlyDecisions(query);
  }

  @Post('evaluate')
  async evaluatePost(
    @Body() body: { criteria?: Partial<DecisionEvaluationCriteria>; clientSavedCompanies?: any[] }
  ) {
    return this.decisionsService.evaluateMonthlyDecisions(body?.criteria, body?.clientSavedCompanies);
  }

  @Post('snapshots')
  async saveSnapshot(@Body() body: any) {
    return this.decisionsService.saveSnapshot(body);
  }

  @Get('snapshots')
  async listSnapshots() {
    return this.decisionsService.listSnapshots();
  }
}
