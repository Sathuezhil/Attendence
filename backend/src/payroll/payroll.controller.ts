import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { MarkPaidDto } from './dto/mark-paid.dto';
import { QueryPayrollDto } from './dto/query-payroll.dto';
import { UpdatePayrollDto } from './dto/update-payroll.dto';
import { PayrollService } from './payroll.service';
import {
  PaginatedPayroll,
  PayrollPreview,
  PayrollResponse,
} from './payroll.types';

@Controller()
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post('payroll/preview')
  preview(@Body() dto: CreatePayrollDto): Promise<PayrollPreview> {
    return this.payrollService.preview(dto);
  }

  @Post('payroll')
  create(@Body() dto: CreatePayrollDto): Promise<PayrollResponse> {
    return this.payrollService.create(dto);
  }

  @Get('payroll')
  findAll(@Query() query: QueryPayrollDto): Promise<PaginatedPayroll> {
    return this.payrollService.findAll(query);
  }

  @Get('employees/:employeeId/payroll')
  findForEmployee(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ): Promise<PayrollResponse[]> {
    return this.payrollService.findForEmployee(employeeId);
  }

  @Get('payroll/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<PayrollResponse> {
    return this.payrollService.findOne(id);
  }

  @Patch('payroll/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePayrollDto,
  ): Promise<PayrollResponse> {
    return this.payrollService.update(id, dto);
  }

  @Post('payroll/:id/mark-paid')
  markPaid(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarkPaidDto,
  ): Promise<PayrollResponse> {
    return this.payrollService.markPaid(id, dto);
  }

  @Delete('payroll/:id')
  cancel(@Param('id', ParseUUIDPipe) id: string): Promise<PayrollResponse> {
    return this.payrollService.cancel(id);
  }
}
