import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventaire } from './inventaire.entity';

@Injectable()
export class InventaireService {
  constructor(
    @InjectRepository(Inventaire)
    private inventaireRepository: Repository<Inventaire>,
  ) {}

  async generateId(): Promise<string> {
    const lastInventaire = await this.inventaireRepository.findOne({
      where: {},
      order: { id: 'DESC' },
    });

    if (!lastInventaire) {
      return 'INV001';
    }

    const lastNumber = parseInt(lastInventaire.id.replace('INV', ''));
    const newNumber = lastNumber + 1;
    return `INV${newNumber.toString().padStart(3, '0')}`;
  }

  async create(
    id_materiel: string,
    quantite_stock: number,
    seuil_alerte: number,
    emplacement: string,
  ) {
    const id = await this.generateId();
    
    const inventaire = this.inventaireRepository.create({
      id,
      materiel: { id: id_materiel } as any,
      quantite_stock,
      quantite_reservee: 0,
      quantite_disponible: quantite_stock,
      seuil_alerte,
      date_dernier_inventaire: new Date(),
      emplacement,
    });

    return await this.inventaireRepository.save(inventaire);
  }

  async findAll() {
    return await this.inventaireRepository.find({
      relations: ['materiel'],
      order: { date_mise_a_jour: 'DESC' },
    });
  }

  async findOne(id: string) {
    const inventaire = await this.inventaireRepository.findOne({
      where: { id },
      relations: ['materiel'],
    });
    
    if (!inventaire) {
      throw new NotFoundException(`Inventaire ${id} non trouvé`);
    }
    
    return inventaire;
  }

  async findByMateriel(id_materiel: string) {
    return await this.inventaireRepository.findOne({
      where: { materiel: { id: id_materiel } },
      relations: ['materiel'],
    });
  }

  async update(
    id: string,
    updateData: {
      quantite_stock?: number;
      quantite_reservee?: number;
      seuil_alerte?: number;
      emplacement?: string;
    },
  ) {
    const inventaire = await this.findOne(id);
    
    const updateFields: any = {};
    
    if (updateData.quantite_stock !== undefined) {
      updateFields.quantite_stock = updateData.quantite_stock;
      // Recalculer la quantité disponible
      updateFields.quantite_disponible = updateData.quantite_stock - inventaire.quantite_reservee;
    }
    
    if (updateData.quantite_reservee !== undefined) {
      updateFields.quantite_reservee = updateData.quantite_reservee;
      // Recalculer la quantité disponible
      updateFields.quantite_disponible = inventaire.quantite_stock - updateData.quantite_reservee;
    }
    
    if (updateData.seuil_alerte !== undefined) {
      updateFields.seuil_alerte = updateData.seuil_alerte;
    }
    
    if (updateData.emplacement !== undefined) {
      updateFields.emplacement = updateData.emplacement;
    }

    updateFields.date_mise_a_jour = new Date();

    await this.inventaireRepository.update(id, updateFields);
    return this.findOne(id);
  }

  async updateQuantiteReservee(id_materiel: string, nouvelle_quantite_reservee: number) {
    const inventaire = await this.findByMateriel(id_materiel);
    
    if (!inventaire) {
      throw new NotFoundException(`Inventaire pour le matériel ${id_materiel} non trouvé`);
    }

    await this.inventaireRepository.update(inventaire.id, {
      quantite_reservee: nouvelle_quantite_reservee,
      quantite_disponible: inventaire.quantite_stock - nouvelle_quantite_reservee,
      date_mise_a_jour: new Date(),
    });

    return this.findOne(inventaire.id);
  }

  async updateQuantiteStock(id_materiel: string, nouvelle_quantite_stock: number) {
    const inventaire = await this.findByMateriel(id_materiel);
    
    if (!inventaire) {
      throw new NotFoundException(`Inventaire pour le matériel ${id_materiel} non trouvé`);
    }

    await this.inventaireRepository.update(inventaire.id, {
      quantite_stock: nouvelle_quantite_stock,
      quantite_disponible: nouvelle_quantite_stock - inventaire.quantite_reservee,
      date_dernier_inventaire: new Date(),
      date_mise_a_jour: new Date(),
    });

    return this.findOne(inventaire.id);
  }

  async remove(id: string) {
    return await this.inventaireRepository.delete(id);
  }

  async getAlertesStockBas() {
    return await this.inventaireRepository
      .createQueryBuilder('inventaire')
      .where('inventaire.quantite_disponible <= inventaire.seuil_alerte')
      .leftJoinAndSelect('inventaire.materiel', 'materiel')
      .orderBy('inventaire.quantite_disponible', 'ASC')
      .getMany();
  }

 async getStatistiques() {
  const totalMateriels = await this.inventaireRepository.count();
  
  const stockBas = await this.inventaireRepository
    .createQueryBuilder('inventaire')
    .where('inventaire.quantite_disponible <= inventaire.seuil_alerte')
    .getCount();
  
  const stockZero = await this.inventaireRepository.count({
    where: { quantite_disponible: 0 }
  });

    const totalStock = await this.inventaireRepository
      .createQueryBuilder('inventaire')
      .select('SUM(inventaire.quantite_stock)', 'total')
      .getRawOne();

    const totalValeur = await this.inventaireRepository
    .createQueryBuilder('inventaire')
    .leftJoin('inventaire.materiel', 'materiel')
    .leftJoin('detail_approvisionnement', 'detail', 'detail.id_materiel = materiel.id_materiel')
    .select('SUM(inventaire.quantite_stock * detail.prix_unitaire)', 'total')
    .getRawOne();

    return {
      totalMateriels,
      stockBas,
      stockZero,
      totalStock: parseInt(totalStock.total) || 0,
      totalValeur: parseFloat(totalValeur.total) || 0,
    };
  }
}