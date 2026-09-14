import { Body, Controller, Get, Patch } from '@nestjs/common';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsService } from './settings.service';
import { AppSettingsResponse } from './settings.types';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  get(): Promise<AppSettingsResponse> {
    return this.settingsService.get();
  }

  @Patch()
  update(@Body() dto: UpdateSettingsDto): Promise<AppSettingsResponse> {
    return this.settingsService.update(dto);
  }
}
