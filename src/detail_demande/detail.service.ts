import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DetailDemande } from './detail.entity';

@Injectable()
export class DetailDemandeService {
  constructor(
    @InjectRepository(DetailDemande)
    private detailDemandeRepository: Repository<DetailDemande>,
  ) {}

  async findAll() {
    return await this.detailDemandeRepository.find({
      relations: ['materiel', 'demandeMateriel', 'demandeMateriel.demandeur']
    });
  }

  async findOne(id: string) {
    const detail = await this.detailDemandeRepository.findOne({
      where: { id },
      relations: ['materiel', 'demandeMateriel', 'demandeMateriel.demandeur'],
    });
    
    if (!detail) {
      throw new NotFoundException(`Détail demande ${id} non trouvé`);
    }
    
    return detail;
  }
}
