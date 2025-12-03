import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DetailApprovisionnement } from './detailappro.entity';
import { MouvementStockService } from '../mouvement_stock/mouvement.service';
import { MouvementType } from '../mouvement_stock/mouvement.entity';

@Injectable()
export class DetailApprovisionnementService {
  constructor(
    @InjectRepository(DetailApprovisionnement)
    private detailApproRepository: Repository<DetailApprovisionnement>,
    private mouvementService: MouvementStockService,
  ) {}

  async generateId(): Promise<string> {
    const lastDetail = await this.detailApproRepository
      .createQueryBuilder('detail')
      .orderBy('detail.id', 'DESC')
      .limit(1)
      .getOne();

    if (!lastDetail) {
      return 'DAP001';
    }

    const lastNumber = parseInt(lastDetail.id.replace('DAP', ''));
    const newNumber = lastNumber + 1;
    return `DAP${newNumber.toString().padStart(3, '0')}`;
  }

  async create(
    idMateriel: string, 
    idAppro: string, 
    quantiteRecu: number, 
    prixUnitaire: number, 
    quantiteTotal?: number
  ) {
    if (quantiteRecu <= 0) {
      throw new BadRequestException('La quantité reçue doit être supérieure à 0');
    }
    if (prixUnitaire < 0) {
      throw new BadRequestException('Le prix unitaire ne peut pas être négatif');
    }

    const total = quantiteTotal ?? quantiteRecu;

    if (total <= 0) {
      throw new BadRequestException('La quantité totale doit être supérieure à 0');
    }

    const id = await this.generateId();

    const detailAppro = this.detailApproRepository.create({
      id,
      materiel: { id: idMateriel } as any,
      approvisionnement: { id: idAppro } as any,
      quantiteRecu,
      prixUnitaire,
      quantiteTotal: total,
    });

    const saved = await this.detailApproRepository.save(detailAppro);

    // ✅ MOUVEMENT ENTREE
    await this.mouvementService.create({
      id_materiel: idMateriel,
      type_mouvement: MouvementType.ENTREE,
      quantite_mouvement: quantiteRecu,
      prix_unitaire: prixUnitaire,
      id_reference: idAppro,
      type_reference: 'APPROVISIONNEMENT',
      motif: `Approvisionnement ${idAppro} - Réception de ${quantiteRecu} unités`,
      utilisateur: 'system',
    });

    console.log(`✅ Détail créé + Mouvement ENTREE`);

    return saved;
  }

  async update(
    id: string, 
    idMateriel: string, 
    idAppro: string, 
    quantiteRecu: number, 
    prixUnitaire: number, 
    quantiteTotal?: number
  ) {
    const detail = await this.findOne(id);

    if (quantiteRecu <= 0) {
      throw new BadRequestException('La quantité reçue doit être supérieure à 0');
    }
    if (prixUnitaire < 0) {
      throw new BadRequestException('Le prix unitaire ne peut pas être négatif');
    }

    const total = quantiteTotal ?? quantiteRecu;

    if (total <= 0) {
      throw new BadRequestException('La quantité totale doit être supérieure à 0');
    }

    const diffQuantite = quantiteRecu - detail.quantiteRecu;

    await this.detailApproRepository.update(id, {
      materiel: { id: idMateriel } as any,
      approvisionnement: { id: idAppro } as any,
      quantiteRecu,
      prixUnitaire,
      quantiteTotal: total,
    });

    // ✅ MOUVEMENT CORRECTION si changement
    if (diffQuantite !== 0) {
      const typeMouvement = diffQuantite > 0 ? MouvementType.ENTREE : MouvementType.SORTIE;
      const typeReference = diffQuantite > 0 ? 'CORRECTION_POSITIVE' : 'CORRECTION_NEGATIVE';
      
      await this.mouvementService.create({
        id_materiel: idMateriel,
        type_mouvement: typeMouvement,
        quantite_mouvement: Math.abs(diffQuantite),
        prix_unitaire: prixUnitaire,
        id_reference: idAppro,
        type_reference: typeReference,
        motif: `Correction approvisionnement ${idAppro} : ${diffQuantite > 0 ? '+' : ''}${diffQuantite} unités`,
        utilisateur: 'system',
      });

      console.log(`✅ Mouvement CORRECTION : ${diffQuantite > 0 ? '+' : ''}${diffQuantite}`);
    }

    return this.findOne(id);
  }

  // ✅ SUPPRESSION avec mouvement SORTIE
  async remove(id: string) {
    const detail = await this.findOne(id);
    
    const idMateriel = detail.materiel.id;
    const quantiteRecu = detail.quantiteRecu;
    const prixUnitaire = detail.prixUnitaire;
    const idAppro = detail.approvisionnement.id;

    console.log(`🗑️ Suppression du détail ${id}`);
    console.log(`   Matériel: ${idMateriel}`);
    console.log(`   Quantité à retirer: ${quantiteRecu}`);
    
    // ✅ CRÉER MOUVEMENT SORTIE
    await this.mouvementService.create({
      id_materiel: idMateriel,
      type_mouvement: MouvementType.SORTIE,
      quantite_mouvement: quantiteRecu,
      prix_unitaire: prixUnitaire,
      id_reference: idAppro,
      type_reference: 'ANNULATION_APPROVISIONNEMENT',
      motif: `Annulation approvisionnement ${idAppro} - Suppression détail ${id}`,
      utilisateur: 'system',
    });

    console.log(`✅ Mouvement SORTIE créé : -${quantiteRecu} unités`);

    // ✅ SUPPRIMER LE DÉTAIL
    await this.detailApproRepository.delete(id);
    
    return { 
      message: 'Détail supprimé avec succès',
      id,
      quantite_retiree: quantiteRecu,
      mouvement_cree: 'SORTIE',
      inventaire_mis_a_jour: true
    };
  }

  async findAll() {
    return await this.detailApproRepository.find({
      relations: ['materiel', 'materiel.typeMateriel', 'approvisionnement', 'approvisionnement.acquisition'],
      order: { id: 'ASC' }
    });
  }

  async findOne(id: string) {
    const detail = await this.detailApproRepository.findOne({
      where: { id },
      relations: ['materiel', 'materiel.typeMateriel', 'approvisionnement', 'approvisionnement.acquisition'],
    });

    if (!detail) {
      throw new NotFoundException(`Détail approvisionnement ${id} non trouvé`);
    }

    return detail;
  }

  async findByApprovisionnement(approId: string) {
    return await this.detailApproRepository.find({
      where: { approvisionnement: { id: approId } },
      relations: ['materiel', 'materiel.typeMateriel', 'approvisionnement', 'approvisionnement.acquisition'],
      order: { id: 'ASC' }
    });
  }

  async getStatsByApprovisionnement(approId: string) {
    const details = await this.findByApprovisionnement(approId);
    
    const stats = {
      totalQuantiteRecu: details.reduce((sum, detail) => sum + detail.quantiteRecu, 0),
      totalQuantiteTotal: details.reduce((sum, detail) => sum + detail.quantiteTotal, 0),
      totalValeur: details.reduce((sum, detail) => sum + (detail.quantiteRecu * Number(detail.prixUnitaire)), 0),
      parTypeMateriel: {}
    };

    details.forEach(detail => {
      const type = detail.materiel.typeMateriel?.designation || 'Non spécifié';
      if (!stats.parTypeMateriel[type]) {
        stats.parTypeMateriel[type] = {
          quantiteRecu: 0,
          quantiteTotal: 0,
          valeur: 0
        };
      }
      stats.parTypeMateriel[type].quantiteRecu += detail.quantiteRecu;
      stats.parTypeMateriel[type].quantiteTotal += detail.quantiteTotal;
      stats.parTypeMateriel[type].valeur += detail.quantiteRecu * Number(detail.prixUnitaire);
    });

    return stats;
  }

  async getTotalByApprovisionnement(approId: string) {
    const result = await this.detailApproRepository
      .createQueryBuilder('detail')
      .select('SUM(detail.quantite_recu)', 'total')
      .where('detail.id_approvisionnement = :approId', { approId })
      .getRawOne();
    
    return parseInt(result.total) || 0;
  }
  
  async getTotalQuantiteRecuByMateriel(id_materiel: string): Promise<number> {
    const result = await this.detailApproRepository
      .createQueryBuilder('detail')
      .select('SUM(detail.quantite_recu)', 'total')
      .where('detail.id_materiel = :id_materiel', { id_materiel })
      .getRawOne();
    
    return parseInt(result.total) || 0;
  }
}
