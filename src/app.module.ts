import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { connexionModule } from './connexion/connexion.module';
import {TypeDepartementModule} from './type_departement/typedep.module';
import { DepartementModule } from './departement/departement.module';
import { DemandeurModule } from './demandeur/demandeur.module'; 
import {TypeMaterielModule} from './typemateriel/typemateriel.module';
import {EtatMaterielModule} from './etatmateriel/etatmateriel.module';
import {FournisseurModule} from './fournisseur/fournisseur.module';
import {MaterielModule} from './materiel/materiel.module';
import { AcquisitionModule } from './acquisition/acquisition.module';
import {ApprovisionnementModule} from './approvisionnement/approvisionnement.module';
import { DetailApprovisionnementModule } from './detail_approvisionnement/detailappro.module';
import { DemandeModule } from './demande_materiel/demande.module';
import { DetailDemandeModule } from './detail_demande/detail.module';
import { AttributionModule } from './attribution/attribution.module';
import { DepannageModule } from './depannage/depannage.module';
import { InventaireModule } from './inventaire/inventaire.module';
import { MouvementStockModule } from './mouvement_stock/mouvement.module';
import { AuthModule } from './auth/auth.module';
import { TypeComptabiliteModule } from './type_comptabilite/typecompta.module';
import { CommissionModule } from './commission_recensement/commission.module';
import { ResultatRecensementModule } from './resultat_recensement/resultat.module';
import { JournalModule } from './journal/journal.module';
import { RedditionAnnuelleModule } from './reddition_annuelle/reddition.module';

@Module({
  imports: [connexionModule, TypeDepartementModule,
    DepartementModule, DemandeurModule,TypeMaterielModule
    ,EtatMaterielModule,FournisseurModule, MaterielModule,
    AcquisitionModule,ApprovisionnementModule,DetailApprovisionnementModule,
    DemandeModule,DetailDemandeModule,AttributionModule,DepannageModule,
    InventaireModule,MouvementStockModule,AuthModule,TypeComptabiliteModule,
  CommissionModule,ResultatRecensementModule,JournalModule,RedditionAnnuelleModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
