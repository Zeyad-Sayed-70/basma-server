import { ApiProperty } from '@nestjs/swagger';

export class BrandPublicResponseDto {
  @ApiProperty({
    example: 'http://localhost:9000/basma-assets/abc123/logo.png',
    description: 'Logo URL (null if no logo uploaded)',
  })
  logoUrl: string | null;

  @ApiProperty({ example: '#2563eb', description: 'Primary brand color' })
  primaryColor: string;

  @ApiProperty({ example: '#1e40af', description: 'Secondary brand color' })
  secondaryColor: string;

  @ApiProperty({ example: 'Cairo', description: 'Font family' })
  fontFamily: string;

  @ApiProperty({
    example: false,
    description: 'Whether this instance has white-label enabled',
  })
  whiteLabelEnabled: boolean;

  @ApiProperty({ example: 'مدرستي', description: 'Instance name' })
  instanceName: string;
}
