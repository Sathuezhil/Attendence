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
import { AttendanceService } from './attendance.service';
import {
  AttendanceResponse,
  PaginatedAttendance,
  TodayAttendanceResponse,
} from './attendance.types';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { QueryAttendanceDto } from './dto/query-attendance.dto';
import { QueryTodayAttendanceDto } from './dto/query-today-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('today')
  getToday(
    @Query() query: QueryTodayAttendanceDto,
  ): Promise<TodayAttendanceResponse> {
    return this.attendanceService.getToday(query);
  }

  @Get()
  findAll(@Query() query: QueryAttendanceDto): Promise<PaginatedAttendance> {
    return this.attendanceService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AttendanceResponse> {
    return this.attendanceService.findOne(id);
  }

  @Post('check-in')
  checkIn(@Body() dto: CheckInDto): Promise<AttendanceResponse> {
    return this.attendanceService.checkIn(dto);
  }

  @Post(':id/check-out')
  checkOut(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CheckOutDto,
  ): Promise<AttendanceResponse> {
    return this.attendanceService.checkOut(id, dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAttendanceDto,
  ): Promise<AttendanceResponse> {
    return this.attendanceService.update(id, dto);
  }

  @Delete(':id')
  refuseDelete(@Param('id', ParseUUIDPipe) id: string): never {
    void id;
    return this.attendanceService.refuseDelete();
  }
}
