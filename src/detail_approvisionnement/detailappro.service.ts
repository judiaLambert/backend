import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DetailApprovisionnement } from './detailappro.entity';

@Injectable()
export class DetailApprovisionnementService {
  constructor(
    @InjectRepository(DetailApprovisionnement)
    private detailApproRepository: Repository<DetailApprovisionnement>,
  ) {}

  async create(idMateriel: string, idAppro: string, quantiteRecu: number, prixUnitaire: number, quantiteTotal: number) {
    const detailAppro = this.detailApproRepository.create({
      materiel: { id: idMateriel } as any,
      approvisionnement: { id: idAppro } as any,
      quantiteRecu,
      prixUnitaire,
      quantiteTotal,
    });
    return await this.detailApproRepository.save(detailAppro);
  }

  async findAll() {
    return await this.detailApproRepository.find({
      relations: ['materiel', 'materiel.typeMateriel', 'approvisionnement', 'approvisionnement.acquisition'],
      order: { id: 'ASC' }
    });
  }

  async findOne(id: string) {
    return await this.detailApproRepository.findOne({
      where: { id },
      relations: ['materiel', 'materiel.typeMateriel', 'approvisionnement', 'approvisionnement.acquisition'],
    });
  }

  async findByApprovisionnement(approId: string) {
    return await this.detailApproRepository.find({
      where: { approvisionnement: { id: approId } },
      relations: ['materiel', 'materiel.typeMateriel', 'approvisionnement', 'approvisionnement.acquisition'],
      order: { id: 'ASC' }
    });
  }

  async update(id: string, idMateriel: string, idAppro: string, quantiteRecu: number, prixUnitaire: number, quantiteTotal: number) {
    await this.detailApproRepository.update(id, {
      materiel: { id: idMateriel } as any,
      approvisionnement: { id: idAppro } as any,
      quantiteRecu,
      prixUnitaire,
      quantiteTotal,
    });
    return this.findOne(id);
  }

  async remove(id: string) {
    return await this.detailApproRepository.delete(id);
  }

  async getStatsByApprovisionnement(approId: string) {
    const details = await this.findByApprovisionnement(approId);
    
    const stats = {
      totalQuantiteRecu: details.reduce((sum, detail) => sum + detail.quantiteRecu, 0),
      totalQuantiteTotal: details.reduce((sum, detail) => sum + detail.quantiteTotal, 0),
      totalValeur: details.reduce((sum, detail) => sum + (detail.quantiteRecu * detail.prixUnitaire), 0),
      parTypeMateriel: {}
    };

    // Grouper par type de matériel
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
      stats.parTypeMateriel[type].valeur += detail.quantiteRecu * detail.prixUnitaire;
    });

    return stats;
  }
  async getTotalByApprovisionnement(approId: string) {
  const result = await this.detailApproRepository
    .createQueryBuilder('detail')
    .select('SUM(detail.quantite_recu)', 'total')
    .where('detail.id_appro = :approId', { approId })
    .getRawOne();
  
  return result.total || 0;
}
}