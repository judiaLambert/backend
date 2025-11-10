import { Injectable, NotFoundException } from '@nestjs/common';
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
    const demandeur = await this.demandeurRepository.findOne({
      where: { id_demandeur: id_demandeur },
      relations: ['departement', 'utilisateur'],
    });
    
    if (!demandeur) {
      throw new NotFoundException(`Demandeur avec l'ID ${id_demandeur} non trouvé`);
    }
    
    return demandeur;
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
    const demandeur = await this.findOne(id_demandeur);
    return await this.demandeurRepository.delete(id_demandeur);
  }

  // Trouver par email
  async findByEmail(email: string) {
    const demandeur = await this.demandeurRepository.findOne({
      where: { email },
      relations: ['departement', 'utilisateur'],
    });
    
    if (!demandeur) {
      throw new NotFoundException(`Demandeur avec l'email ${email} non trouvé`);
    }
    
    return demandeur;
  }

  // Trouver par id_utilisateur
  async findByUtilisateur(id_utilisateur: number) {
    const demandeur = await this.demandeurRepository.findOne({
      where: { utilisateur: { id_utilisateur } },
      relations: ['departement', 'utilisateur'],
    });
    
    if (!demandeur) {
      throw new NotFoundException(`Demandeur pour l'utilisateur ${id_utilisateur} non trouvé`);
    }
    
    return demandeur;
  }

  // Trouver par userId (string converti en number)
  async findByUserId(userId: string) {
    const userIdNumber = parseInt(userId, 10);
    
    if (isNaN(userIdNumber)) {
      throw new NotFoundException(`ID utilisateur invalide: ${userId}`);
    }

    const demandeur = await this.demandeurRepository
      .createQueryBuilder('demandeur')
      .leftJoinAndSelect('demandeur.utilisateur', 'utilisateur')
      .leftJoinAndSelect('demandeur.departement', 'departement')
      .where('utilisateur.id_utilisateur = :userId', { userId: userIdNumber })
      .getOne();
    
    if (!demandeur) {
      throw new NotFoundException(`Demandeur non trouvé pour l'utilisateur ${userId}`);
    }
    
    return demandeur;
  }
}
