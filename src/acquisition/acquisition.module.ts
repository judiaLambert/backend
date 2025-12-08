import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcquisitionService } from './acquisition.service';
import { AcquisitionController } from './acquisition.controller';
import { Acquisition } from './acquisition.entity';
import { MaterielModule } from '../materiel/materiel.module';
import { FournisseurTypeMaterielModule } from '../fournisseur_typemateriel/fournisseurtype.module'; 

@Module({
  imports: [
    TypeOrmModule.forFeature([Acquisition]),
    forwardRef(() => MaterielModule),
    FournisseurTypeMaterielModule, 
  ],
  controllers: [AcquisitionController],
  providers: [AcquisitionService],
  exports: [AcquisitionService],
})
export class AcquisitionModule {}
