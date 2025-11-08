import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TypeMateriel } from './typemateriel.entity';

@Injectable()
export class TypeMaterielService {
  constructor(
    @InjectRepository(TypeMateriel)
    private typeMaterielRepository: Repository<TypeMateriel>,
  ) {}

  async create(designation: string, description: string) {
    const typeMateriel = this.typeMaterielRepository.create({
      designation,
      description,
    });
    return await this.typeMaterielRepository.save(typeMateriel);
  }

  async findAll() {
    return await this.typeMaterielRepository.find();
  }

  async findOne(id: string) {
    return await this.typeMaterielRepository.findOne({
      where: { id },
    });
  }

  async update(id: string, designation: string, description: string) {
    await this.typeMaterielRepository.update(id, {
      designation,
      description,
    });
    return this.findOne(id);
  }

  async remove(id: string) {
    return await this.typeMaterielRepository.delete(id);
  }
}