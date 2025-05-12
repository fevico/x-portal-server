import { IsString } from 'class-validator';

export class UpdateSubRoleIdDto {
  @IsString()
  subRoleId: string;
}
