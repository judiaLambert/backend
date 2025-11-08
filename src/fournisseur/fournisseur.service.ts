import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Fournisseur } from './fournisseur.entity';

@Injectable()
export class FournisseurService {
  constructor(
    @InjectRepository(Fournisseur)
    private fournisseurRepository: Repository<Fournisseur>,
  ) {}

  async create(nom: string, contact: string, adresse: string, idTypeMateriel: string, dateLivraison: Date) {
    // Vérifier si le fournisseur existe déjà
    const existingFournisseur = await this.fournisseurRepository.findOne({
      where: { nom, contact }
    });

    if (existingFournisseur) {
      // Ajouter seulement le nouveau type de matériel avec date
      const nouveauFournisseur = this.fournisseurRepository.create({
        nom,
        contact,
        adresse,
        typeMateriel: { id: idTypeMateriel } as any,
        dateLivraison,
      });
      return await this.fournisseurRepository.save(nouveauFournisseur);
    } else {
      // Nouveau fournisseur
      const fournisseur = this.fournisseurRepository.create({
        nom,
        contact,
        adresse,
        typeMateriel: { id: idTypeMateriel } as any,
        dateLivraison,
      });
      return await this.fournisseurRepository.save(fournisseur);
    }
  }

  async findAll() {
    return await this.fournisseurRepository.find({
      relations: ['typeMateriel'],
      order: { nom: 'ASC', dateLivraison: 'DESC' }
    });
  }

  async findOne(id: string) {
    return await this.fournisseurRepository.findOne({
      where: { id },
      relations: ['typeMateriel'],
    });
  }

  async findByNom(nom: string) {
    return await this.fournisseurRepository.find({
      where: { nom },
      relations: ['typeMateriel'],
      order: { dateLivraison: 'DESC' }
    });
  }

  async update(id: string, nom: string, contact: string, adresse: string, idTypeMateriel: string, dateLivraison: Date) {
    await this.fournisseurRepository.update(id, {
      nom,
      contact,
      adresse,
      typeMateriel: { id: idTypeMateriel } as any,
      dateLivraison,
    });
    return this.findOne(id);
  }

  async remove(id: string) {
    return await this.fournisseurRepository.delete(id);
  }

  async getFournisseursGroupes() {
    const fournisseurs = await this.findAll();
    const grouped = {};
    
    fournisseurs.forEach(f => {
      if (!grouped[f.nom]) {
        grouped[f.nom] = {
          id: f.id,
          nom: f.nom,
          contact: f.contact,
          adresse: f.adresse,
          typesMateriel: []
        };
      }
      grouped[f.nom].typesMateriel.push({
        type: f.typeMateriel?.designation,
        date: f.dateLivraison
      });
    });
    
    return Object.values(grouped);
  }
}