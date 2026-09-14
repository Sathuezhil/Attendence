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
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { QueryInvoicesDto } from './dto/query-invoices.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoicesService } from './invoices.service';
import type {
  InvoicePreview,
  InvoiceResponse,
  PaginatedInvoices,
} from './invoices.types';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post('preview')
  preview(@Body() dto: CreateInvoiceDto): InvoicePreview {
    return this.invoicesService.preview(dto);
  }

  @Post()
  create(@Body() dto: CreateInvoiceDto): Promise<InvoiceResponse> {
    return this.invoicesService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryInvoicesDto): Promise<PaginatedInvoices> {
    return this.invoicesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<InvoiceResponse> {
    return this.invoicesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInvoiceDto,
  ): Promise<InvoiceResponse> {
    return this.invoicesService.update(id, dto);
  }

  @Post(':id/send')
  send(@Param('id', ParseUUIDPipe) id: string): Promise<InvoiceResponse> {
    return this.invoicesService.send(id);
  }

  @Post(':id/mark-paid')
  markPaid(@Param('id', ParseUUIDPipe) id: string): Promise<InvoiceResponse> {
    return this.invoicesService.markPaid(id);
  }

  @Post(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string): Promise<InvoiceResponse> {
    return this.invoicesService.cancel(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<InvoiceResponse> {
    return this.invoicesService.cancel(id);
  }
}
