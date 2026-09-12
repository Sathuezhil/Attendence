export class DashboardActivityDto {
  id!: string;
  type!: string;
  description!: string;
  occurredAt!: string;
}

export class RecentActivityResponseDto {
  activities!: DashboardActivityDto[];
}
