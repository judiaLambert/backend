import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EtatMateriel } from './etatmateriel.entity';

@Injectable()
export class EtatMaterielService {
  constructor(
    @InjectRepository(EtatMateriel)
    private etatMaterielRepository: Repository<EtatMateriel>,
  ) {}

  async create(designation: string, description: string) {
    const etatMateriel = this.etatMaterielRepository.create({
      designation,
      description,
    });
    return await this.etatMaterielRepository.save(etatMateriel);
  }

  async findAll() {
    return await this.etatMaterielRepository.find();
  }

  async findOne(id: string) {
    return await this.etatMaterielRepository.findOne({
      where: { id },
    });
  }

  async update(id: string, designation: string, description: string) {
    await this.etatMaterielRepository.update(id, {
      designation,
      description,
    });
    return this.findOne(id);
  }

  async remove(id: string) {
    return await this.etatMaterielRepository.delete(id);
  }
}