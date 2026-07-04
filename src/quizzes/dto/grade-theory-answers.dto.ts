import { IsArray, ArrayNotEmpty, IsString, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class GradeEntry {
  @ApiProperty({ example: 'clx...', description: 'Question ID' })
  @IsString()
  questionId: string;

  @ApiProperty({ example: 3, description: 'Marks to award for this question' })
  @IsInt()
  @Min(0)
  marksEarned: number;
}

export class GradeTheoryAnswersDto {
  @ApiProperty({
    type: [GradeEntry],
    example: [{ questionId: 'clx...', marksEarned: 3 }],
    description: 'Array of question grades to update',
  })
  @IsArray()
  @ArrayNotEmpty()
  answers: GradeEntry[];
}
