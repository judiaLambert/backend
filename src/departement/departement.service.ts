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

  // Fonction pour générer le prochain ID au format DEP01, DEP02, etc.
  private async generateNextId(): Promise<string> {
    const lastDepartement = await this.departementRepository
      .createQueryBuilder('dept')
      .orderBy('dept.id_departement', 'DESC')
      .getOne();

    if (!lastDepartement) {
      return 'DEP01'; // Premier département
    }

    // Extraire le numéro de l'ID précédent (ex: DEP01 -> 01)
    const lastNumber = parseInt(lastDepartement.id_departement.replace('DEP', ''));
    const nextNumber = lastNumber + 1;
    
    // Formater avec zéro padding (ex: 2 -> 02)
    return `DEP${nextNumber.toString().padStart(2, '0')}`;
  }

  async create(numSalle: string, idTypeDepartement: string, nomService: string) {
    const newId = await this.generateNextId();
    
    const departement = this.departementRepository.create({
      id_departement: newId,
      num_salle: numSalle,
      typeDepartement: { id_typedepartement: idTypeDepartement },
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

  async update(idDepartement: string, numSalle: string, idTypeDepartement: string, nomService: string) {
    await this.departementRepository.update(idDepartement, {
      num_salle: numSalle,
      typeDepartement: { id_typedepartement: idTypeDepartement },
      nom_service: nomService,
    });
    return this.findOne(idDepartement);
  }

  async remove(idDepartement: string) {
    return await this.departementRepository.delete(idDepartement);
  }
}