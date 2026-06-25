import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, Min, IsOptional } from 'class-validator';

export class ManualPaymentDto {
  @ApiProperty({ description: 'Student ID to record payment for' })
  @IsString()
  studentId: string;

  @ApiPropertyOptional({ description: 'Course ID this payment is for' })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiProperty({ description: 'Amount in cents (e.g. 2000 = 20.00 EGP)', example: 2000 })
  @IsInt()
  @Min(1)
  amountCents: number;

  @ApiPropertyOptional({ description: 'Currency code', default: 'EGP', example: 'EGP' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Optional notes about this payment' })
  @IsOptional()
  @IsString()
  notes?: string;
}
