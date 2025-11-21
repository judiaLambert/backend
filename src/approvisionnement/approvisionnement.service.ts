import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Approvisionnement } from './aprrovisionnement.entity';


@Injectable()
export class ApprovisionnementService {
  constructor(
    @InjectRepository(Approvisionnement)
    private approvisionnementRepository: Repository<Approvisionnement>,
  ) {}

  async create(dateApprovisionnement: Date, recu: string, idAcquisition: string, noteApprovisionnement: string) {
    const approvisionnement = this.approvisionnementRepository.create({
      dateApprovisionnement,
      recu,
      acquisition: { id: idAcquisition } as any,
      noteApprovisionnement,
    });
    return await this.approvisionnementRepository.save(approvisionnement);
  }

  async findAll() {
    return await this.approvisionnementRepository.find({
      relations: ['acquisition', 'acquisition.fournisseur'],
      order: { dateApprovisionnement: 'DESC' }
    });
  }

  async findOne(id: string) {
    return await this.approvisionnementRepository.findOne({
      where: { id },
      relations: ['acquisition', 'acquisition.fournisseur'],
    });
  }

  async update(id: string, dateApprovisionnement: Date, recu: string, idAcquisition: string, noteApprovisionnement: string) {
    await this.approvisionnementRepository.update(id, {
      dateApprovisionnement,
      recu,
      acquisition: { id: idAcquisition } as any,
      noteApprovisionnement,
    });
    return this.findOne(id);
  }

  async remove(id: string) {
    return await this.approvisionnementRepository.delete(id);
  }

  async findByAcquisition(acquisitionId: string) {
    return await this.approvisionnementRepository.find({
      where: { acquisition: { id: acquisitionId } },
      relations: ['acquisition', 'acquisition.fournisseur'],
    });
  }
}