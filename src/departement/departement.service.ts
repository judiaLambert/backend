import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Departement } from './departement.entity';

@Injectable()
export class DepartementService {
  constructor(
    @InjectRepository(Departement)
    private departementRepository: Repository<Departement>,
  ) {}

  async create(idDepartement: string, numSalle: string, idTypeDepartement: number, nomService: string) {
    const departement = this.departementRepository.create({
      id_departement: idDepartement,
      num_salle: numSalle,
      typeDepartement: { id: idTypeDepartement } as any,
      nom_service: nomService,
    });
    return await this.departementRepository.save(departement);
  }

  async findAll() {
    return await this.departementRepository.find({
      relations: ['typeDepartement'],
    });
  }

  async findOne(idDepartement: string) {
    return await this.departementRepository.findOne({
      where: { id_departement: idDepartement },
      relations: ['typeDepartement'],
    });
  }

  async update(idDepartement: string, numSalle: string, idTypeDepartement: number, nomService: string) {
    await this.departementRepository.update(idDepartement, {
      num_salle: numSalle,
      typeDepartement: { id: idTypeDepartement } as any,
      nom_service: nomService,
    });
    return this.findOne(idDepartement);
  }

  async remove(idDepartement: string) {
    return await this.departementRepository.delete(idDepartement);
  }
}