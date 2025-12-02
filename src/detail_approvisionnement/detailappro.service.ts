import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DetailApprovisionnement } from './detailappro.entity';
import { InventaireService } from '../inventaire/inventaire.service';
import { MouvementStockService } from '../mouvement_stock/mouvement.service';
import { MouvementType } from '../mouvement_stock/mouvement.entity'; // ✅ Import

@Injectable()
export class DetailApprovisionnementService {
  constructor(
    @InjectRepository(DetailApprovisionnement)
    private detailApproRepository: Repository<DetailApprovisionnement>,
    private inventaireService: InventaireService,
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

    // ✅ CRÉER MOUVEMENT ENTRÉE
    await this.mouvementService.create({
      id_materiel: idMateriel,
      type_mouvement: MouvementType.ENTREE, // ✅ ENTREE au lieu de ENTREE_APPRO
      quantite_mouvement: quantiteRecu,
      id_reference: idAppro,
      type_reference: 'APPROVISIONNEMENT', // ✅ Contexte dans référence
      prix_unitaire: prixUnitaire,
      motif: `Approvisionnement - Réception de ${quantiteRecu} unités`,
      utilisateur: 'system',
    });

    // Mettre à jour l'inventaire
    try {
      await this.inventaireService.approvisionner(idMateriel, quantiteRecu);
    } catch (err) {
      console.warn(`Inventaire non mis à jour pour ${idMateriel}:`, err.message);
    }

    return saved;
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

    // ✅ CRÉER MOUVEMENT CORRECTION SI CHANGEMENT
    if (diffQuantite !== 0) {
      // ✅ Type simplifié + référence explicite
      const typeMouvement = diffQuantite > 0 ? MouvementType.ENTREE : MouvementType.SORTIE;
      const typeReference = diffQuantite > 0 ? 'CORRECTION_POSITIVE' : 'CORRECTION_NEGATIVE';
      
      await this.mouvementService.create({
        id_materiel: idMateriel,
        type_mouvement: typeMouvement, // ✅ ENTREE ou SORTIE
        quantite_mouvement: Math.abs(diffQuantite),
        id_reference: idAppro,
        type_reference: typeReference, // ✅ Contexte dans référence
        prix_unitaire: prixUnitaire,
        motif: `Correction approvisionnement - Ajustement de ${diffQuantite > 0 ? '+' : ''}${diffQuantite} unités`,
        utilisateur: 'system',
      });

      try {
        await this.inventaireService.approvisionner(idMateriel, diffQuantite);
      } catch (err) {
        console.warn(`Inventaire non mis à jour pour ${idMateriel}:`, err.message);
      }
    }

    return this.findOne(id);
  }

 async remove(id: string) {
  const detail = await this.findOne(id);
  
  //  SEULEMENT METTRE À JOUR L'INVENTAIRE (sans créer de mouvement)
  try {
    // Retirer la quantité de l'inventaire (quantité négative)
    await this.inventaireService.approvisionner(
      detail.materiel.id, 
      -detail.quantiteRecu
    );
    console.log(` Inventaire mis à jour pour matériel ${detail.materiel.id} (-${detail.quantiteRecu})`);
  } catch (err) {
    console.warn(` Inventaire non mis à jour lors de la suppression:`, err.message);
    // Ne pas bloquer la suppression si l'inventaire échoue
  }

  //  SUPPRIMER LE DÉTAIL (sans créer de mouvement)
  try {
    await this.detailApproRepository.delete(id);
    console.log(` Détail approvisionnement ${id} supprimé (aucun mouvement créé)`);
    return { 
      message: 'Détail supprimé avec succès',
      id
    };
  } catch (err) {
    console.error(` Erreur suppression détail ${id}:`, err);
    throw new BadRequestException(
      `Impossible de supprimer le détail: ${err.message}`
    );
  }
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
