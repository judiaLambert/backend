import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Materiel } from './materiel.entity';
import { MaterielService } from './materiel.service';
import { MaterielController } from './materiel.controller';
import { EtatMateriel } from '../etatmateriel/etatmateriel.entity';
import { TypeMateriel } from '../typemateriel/typemateriel.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Materiel, EtatMateriel, TypeMateriel])],
  providers: [MaterielService],
  controllers: [MaterielController],
  exports: [MaterielService],
})
export class MaterielModule {}