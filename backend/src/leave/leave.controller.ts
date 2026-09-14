import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { PublicAdmin } from '../common/types/public-admin';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { QueryLeaveDto } from './dto/query-leave.dto';
import { RejectLeaveDto } from './dto/reject-leave.dto';
import { UpdateLeaveDto } from './dto/update-leave.dto';
import { LeaveService } from './leave.service';
import { LeaveResponse, PaginatedLeave } from './leave.types';

@Controller('leave')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  create(@Body() dto: CreateLeaveDto): Promise<LeaveResponse> {
    return this.leaveService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryLeaveDto): Promise<PaginatedLeave> {
    return this.leaveService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<LeaveResponse> {
    return this.leaveService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeaveDto,
  ): Promise<LeaveResponse> {
    return this.leaveService.update(id, dto);
  }

  @Post(':id/approve')
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: PublicAdmin,
  ): Promise<LeaveResponse> {
    return this.leaveService.approve(id, admin.id);
  }

  @Post(':id/reject')
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectLeaveDto,
  ): Promise<LeaveResponse> {
    return this.leaveService.reject(id, dto);
  }

  @Post(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string): Promise<LeaveResponse> {
    return this.leaveService.cancel(id);
  }
}
