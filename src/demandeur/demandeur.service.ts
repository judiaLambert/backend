import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Demandeur } from './demandeur.entity';

@Injectable()
export class DemandeurService {
  constructor(
    @InjectRepository(Demandeur)
    private demandeurRepository: Repository<Demandeur>,
  ) {}

  async create(
    nom: string, 
    telephone: string, 
    email: string,
    type_demandeur: string,
    id_departement: string,
    id_utilisateur: number
  ) {
    const demandeur = this.demandeurRepository.create({
      nom,
      telephone,
      email,
      type_demandeur,
      departement: { id_departement } as any,
      utilisateur: { id_utilisateur } as any,
    });
    return await this.demandeurRepository.save(demandeur);
  }

  async findAll() {
    return await this.demandeurRepository.find({
      relations: ['departement', 'utilisateur'],
    });
  }

  async findOne(id_demandeur: string) {
    return await this.demandeurRepository.findOne({
      where: { id_demandeur: id_demandeur },
      relations: ['departement', 'utilisateur'],
    });
  }

  async update(
    id_demandeur: string, 
    nom: string, 
    telephone: string, 
    email: string,
    type_demandeur: string,
    id_departement: string,
    id_utilisateur: number
  ) {
    await this.demandeurRepository.update(id_demandeur, {
      nom,
      telephone,
      email,
      type_demandeur,
      departement: { id_departement } as any,
      utilisateur: { id_utilisateur } as any,
    });
    return this.findOne(id_demandeur);
  }

  async remove(id_demandeur: string) {
    return await this.demandeurRepository.delete(id_demandeur);
  }

  // Trouver par email
  async findByEmail(email: string) {
    return await this.demandeurRepository.findOne({
      where: { email },
      relations: ['departement', 'utilisateur'],
    });
  }

  // Trouver par id_utilisateur
  async findByUtilisateur(id_utilisateur: number) {
    return await this.demandeurRepository.findOne({
      where: { utilisateur: { id_utilisateur } },
      relations: ['departement', 'utilisateur'],
    });
  }
}