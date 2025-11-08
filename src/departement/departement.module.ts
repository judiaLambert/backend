import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Departement } from './departement.entity';
import { DepartementService } from './departement.service';
import { DepartementController } from './departement.controller';
import { TypeDepartement } from '../type_departement/typedep.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Departement, TypeDepartement])],
  providers: [DepartementService],
  controllers: [DepartementController],
})
export class DepartementModule {}