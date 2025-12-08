import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DetailApprovisionnementService } from './detailappro.service';
import { DetailApprovisionnementController } from './detailappro.controller';
import { DetailApprovisionnement } from './detailappro.entity';
import { MouvementStockModule } from '../mouvement_stock/mouvement.module';
import { InventaireModule } from '../inventaire/inventaire.module';
import { FournisseurTypeMaterielModule } from '../fournisseur_typemateriel/fournisseurtype.module';
import { MaterielModule } from '../materiel/materiel.module';
import { ApprovisionnementModule } from '../approvisionnement/approvisionnement.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DetailApprovisionnement]),
    forwardRef(() => MouvementStockModule),
    forwardRef(() => InventaireModule),
    forwardRef(() => FournisseurTypeMaterielModule),
    forwardRef(() => MaterielModule),
    forwardRef(() => ApprovisionnementModule),
  ],
  controllers: [DetailApprovisionnementController],
  providers: [DetailApprovisionnementService],
  exports: [DetailApprovisionnementService, TypeOrmModule],
})
export class DetailApprovisionnementModule {}
