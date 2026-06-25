import { Type } from 'class-transformer';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsArray,
  ValidateNested,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CsvStudentRow {
  @ApiProperty({ example: 'علي أحمد', description: 'Student full name' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ example: 'ali@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+201234567890' })
  @IsString()
  @IsOptional()
  phone?: string;
}

export class BulkImportDto {
  @ApiProperty({
    type: [CsvStudentRow],
    description: 'Array of students to import',
    example: [
      { name: 'علي أحمد', email: 'ali@example.com', phone: '+201234567890' },
      { name: 'محمد حسن', email: 'mohamed@example.com' },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CsvStudentRow)
  students: CsvStudentRow[];

  @ApiProperty({ example: 'clx...', description: 'Target group ID' })
  @IsString()
  groupId: string;
}

export class BulkImportResultDto {
  @ApiProperty({ example: 50 })
  imported: number;

  @ApiProperty({ example: 3 })
  inactive: number;

  @ApiProperty({ example: 2 })
  skipped: number;

  @ApiProperty({
    example: ['ali@example.com'],
    description: 'Emails that were skipped (already existed)',
  })
  skippedEmails: string[];
}

export class RedeemInvitationDto {
  @ApiProperty({
    example: 'a1b2c3d4e5f6',
    description: 'Invitation code from the group',
  })
  @IsString()
  invitationCode: string;

  @ApiProperty({ example: 'علي أحمد', description: 'Student full name' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: 'ali@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+201234567890' })
  @IsString()
  @IsOptional()
  phone?: string;
}
