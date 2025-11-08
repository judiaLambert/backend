import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeMateriel } from './typemateriel.entity';
import { TypeMaterielService } from './typemateriel.service';
import { TypeMaterielController } from './typemateriel.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TypeMateriel])],
  providers: [TypeMaterielService],
  controllers: [TypeMaterielController],
})
export class TypeMaterielModule {}