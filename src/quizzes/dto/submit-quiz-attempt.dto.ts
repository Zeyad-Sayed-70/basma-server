import { IsArray, ArrayNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class AnswerEntry {
  @ApiProperty({ example: 'clx...', description: 'Question ID' })
  @IsString()
  questionId: string;

  @ApiProperty({ example: 'x²-4', description: "Student's answer" })
  @IsString()
  answer: string;
}

export class SubmitQuizAttemptDto {
  @ApiProperty({
    type: [AnswerEntry],
    example: [{ questionId: 'clx...', answer: 'x²-4' }],
    description: 'Array of questionId-answer pairs',
  })
  @IsArray()
  @ArrayNotEmpty()
  answers: AnswerEntry[];
}
