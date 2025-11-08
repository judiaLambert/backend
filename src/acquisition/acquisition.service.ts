import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Acquisition } from './acquisition.entity';

@Injectable()
export class AcquisitionService {
  constructor(
    @InjectRepository(Acquisition)
    private acquisitionRepository: Repository<Acquisition>,
  ) {}

  async create(idFournisseur: string, dateAcquisition: Date, typeAcquisition: string) {
    const acquisition = this.acquisitionRepository.create({
      fournisseur: { id: idFournisseur } as any,
      dateAcquisition,
      typeAcquisition,
    });
    return await this.acquisitionRepository.save(acquisition);
  }

  async findAll() {
    return await this.acquisitionRepository.find({
      relations: ['fournisseur'],
      order: { dateAcquisition: 'DESC' }
    });
  }

  async findOne(id: string) {
    return await this.acquisitionRepository.findOne({
      where: { id },
      relations: ['fournisseur'],
    });
  }

  async update(id: string, idFournisseur: string, dateAcquisition: Date, typeAcquisition: string) {
    await this.acquisitionRepository.update(id, {
      fournisseur: { id: idFournisseur } as any,
      dateAcquisition,
      typeAcquisition,
    });
    return this.findOne(id);
  }

  async remove(id: string) {
    return await this.acquisitionRepository.delete(id);
  }

  async findByFournisseur(fournisseurId: string) {
    return await this.acquisitionRepository.find({
      where: { fournisseur: { id: fournisseurId } },
      relations: ['fournisseur'],
      order: { dateAcquisition: 'DESC' }
    });
  }
}