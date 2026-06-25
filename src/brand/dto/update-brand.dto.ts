import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBrandDto {
  @ApiPropertyOptional({
    example: '#2563eb',
    description: 'Primary brand color (hex)',
  })
  @IsString()
  @IsOptional()
  primaryColor?: string;

  @ApiPropertyOptional({
    example: '#1e40af',
    description: 'Secondary brand color (hex)',
  })
  @IsString()
  @IsOptional()
  secondaryColor?: string;

  @ApiPropertyOptional({
    example: 'Cairo',
    description: 'Font family name',
  })
  @IsString()
  @IsOptional()
  fontFamily?: string;

  @ApiPropertyOptional({
    example: 'myschool.example.com',
    description: 'Custom domain for the platform',
  })
  @IsString()
  @IsOptional()
  customDomain?: string;

  @ApiPropertyOptional({
    description:
      'Enable white-label (remove "Powered by Basma" branding). Requires paid tier.',
  })
  @IsBoolean()
  @IsOptional()
  whiteLabelEnabled?: boolean;
}
