import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MouvementStock } from './mouvement.entity';

@Injectable()
export class MouvementStockService {
  constructor(
    @InjectRepository(MouvementStock)
    private mouvementStockRepository: Repository<MouvementStock>,
  ) {}

  async generateId(): Promise<string> {
    const lastMouvement = await this.mouvementStockRepository.findOne({
      where: {},
      order: { id: 'DESC' },
    });

    if (!lastMouvement) {
      return 'MV01';
    }

    const lastNumber = parseInt(lastMouvement.id.replace('MV', ''));
    const newNumber = lastNumber + 1;
    return `MV${newNumber.toString().padStart(2, '0')}`;
  }

  async create(mouvementData: {
    id_materiel: string;
    type_mouvement: string;
    quantite: number;
    id_reference?: string;
    type_reference?: string;
    motif?: string;
    utilisateur?: string;
  }) {
    const id = await this.generateId();
    
    const mouvement = this.mouvementStockRepository.create({
      id,
      ...mouvementData
    });

    return await this.mouvementStockRepository.save(mouvement);
  }

  async findAll() {
    return await this.mouvementStockRepository.find({
      relations: ['materiel'],
      order: { date_mouvement: 'DESC' },
    });
  }

  async findByMateriel(id_materiel: string) {
    return await this.mouvementStockRepository.find({
      where: { materiel: { id: id_materiel } },
      relations: ['materiel'],
      order: { date_mouvement: 'DESC' },
    });
  }

  async findByReference(type_reference: string, id_reference: string) {
    return await this.mouvementStockRepository.find({
      where: { type_reference, id_reference },
      relations: ['materiel'],
    });
  }

  async getMouvementsRecent() {
    return await this.mouvementStockRepository.find({
      relations: ['materiel'],
      order: { date_mouvement: 'DESC' },
      take: 50, // Derniers 50 mouvements
    });
  }

  async getStatistiquesMouvements() {
    const totalMouvements = await this.mouvementStockRepository.count();
    
    const mouvementsParType = await this.mouvementStockRepository
      .createQueryBuilder('mouvement')
      .select('mouvement.type_mouvement, COUNT(*) as count')
      .groupBy('mouvement.type_mouvement')
      .getRawMany();

    return {
      totalMouvements,
      mouvementsParType,
    };
  }
}