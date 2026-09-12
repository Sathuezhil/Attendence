import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { QueryEmployeesDto } from './dto/query-employees.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesService } from './employees.service';
import { EmployeeResponse, PaginatedEmployees } from './employees.types';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  create(@Body() dto: CreateEmployeeDto): Promise<EmployeeResponse> {
    return this.employeesService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryEmployeesDto): Promise<PaginatedEmployees> {
    return this.employeesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<EmployeeResponse> {
    return this.employeesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeeDto,
  ): Promise<EmployeeResponse> {
    return this.employeesService.update(id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EmployeeResponse> {
    return this.employeesService.deactivate(id);
  }
}
