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

  async create(
    nom: string, 
    contact: string, 
    adresse: string, 
    nif: string,
    stat: string,
    email: string
  ) {
    const fournisseur = this.fournisseurRepository.create({
      nom,
      contact,
      adresse,
      nif: nif?.trim() || undefined,      // ✅ undefined au lieu de null
      stat: stat?.trim() || undefined,    // ✅ undefined au lieu de null
      email: email?.trim() || undefined   // ✅ undefined au lieu de null
    });
    return await this.fournisseurRepository.save(fournisseur);
  }

  async findAll() {
    return await this.fournisseurRepository.find({
      order: { nom: 'ASC' }
    });
  }

  async findOne(id: string) {
    return await this.fournisseurRepository.findOne({
      where: { id }
    });
  }

  async update(
    id: string, 
    nom: string, 
    contact: string, 
    adresse: string,
    nif: string,
    stat: string,
    email: string
  ) {
    // ✅ Construction d'un objet de mise à jour dynamique
    const updateData: any = {
      nom,
      contact,
      adresse
    };

    // ✅ Ajouter uniquement si non vide
    if (nif?.trim()) {
      updateData.nif = nif.trim();
    }
    if (stat?.trim()) {
      updateData.stat = stat.trim();
    }
    if (email?.trim()) {
      updateData.email = email.trim();
    }

    await this.fournisseurRepository.update(id, updateData);
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
          nif: f.nif,
          stat: f.stat,
          email: f.email
        };
      }
    });
    
    return Object.values(grouped);
  }
}
