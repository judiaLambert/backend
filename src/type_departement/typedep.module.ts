
import { Module } from '@nestjs/common';
import { TypeDepartementService } from './typedep.service';
import { TypeDepartementController } from './typedep.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeDepartement } from './typedep.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TypeDepartement])],
  controllers: [TypeDepartementController],
  providers: [TypeDepartementService],
})
export class TypeDepartementModule {}
