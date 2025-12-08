import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FournisseurTypeMateriel } from './fournisseurtype.entity';

@Injectable()
export class FournisseurTypeMaterielService {
  constructor(
    @InjectRepository(FournisseurTypeMateriel)
    private repository: Repository<FournisseurTypeMateriel>,
  ) {}

  //  Créer une association automatiquement (appelé lors d'une acquisition)
  async createAssociation(id_fournisseur: string, id_typemateriel: string, notes?: string) {
    // Vérifier si l'association existe déjà
    const existing = await this.repository.findOne({
      where: { id_fournisseur, id_typemateriel }
    });

    if (existing) {
      console.log(' Association déjà existante');
      return existing;
    }

    const association = this.repository.create({
      id_fournisseur,
      id_typemateriel,
      notes
    });

    const saved = await this.repository.save(association);
    console.log(` Association créée: Fournisseur ${id_fournisseur} ↔ Type ${id_typemateriel}`);
    return saved;
  }

  //  Obtenir tous les types de matériels fournis par un fournisseur
  async getTypesMaterielsByFournisseur(id_fournisseur: string) {
    return await this.repository.find({
      where: { id_fournisseur },
      relations: ['typeMateriel'],
      order: { dateAssociation: 'DESC' }
    });
  }

  // ✅ Obtenir tous les fournisseurs pour un type de matériel
  async getFournisseursByTypeMateriel(id_typemateriel: string) {
    return await this.repository.find({
      where: { id_typemateriel },
      relations: ['fournisseur'],
      order: { dateAssociation: 'DESC' }
    });
  }

  // ✅ Statistiques pour un fournisseur
  async getStatistiquesFournisseur(id_fournisseur: string) {
    const associations = await this.getTypesMaterielsByFournisseur(id_fournisseur);
    
    return {
      total_types_fournis: associations.length,
      types_materiels: associations.map(a => ({
        id: a.typeMateriel.id,
        designation: a.typeMateriel.designation,
        date_premiere_fourniture: a.dateAssociation,
        notes: a.notes
      }))
    };
  }

  // ✅ Supprimer une association
  async removeAssociation(id: string) {
    return await this.repository.delete(id);
  }
}