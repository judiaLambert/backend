import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventaire } from './inventaire.entity';
import { Materiel, CategorieMateriel } from '../materiel/materiel.entity';
import { MouvementStockService } from '../mouvement_stock/mouvement.service';
import { MouvementType } from '../mouvement_stock/mouvement.entity';

@Injectable()
export class InventaireService {
  constructor(
    @InjectRepository(Inventaire)
    private inventaireRepository: Repository<Inventaire>,
    @InjectRepository(Materiel)
    private materielRepository: Repository<Materiel>,
    private mouvementService: MouvementStockService,
  ) {}

  async generateId(): Promise<string> {
    const lastInventaire = await this.inventaireRepository
      .createQueryBuilder('inventaire')
      .orderBy('inventaire.id', 'DESC')
      .limit(1)
      .getOne();

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
) {
  const materiel = await this.materielRepository.findOne({ 
    where: { id: id_materiel } 
  });
  
  if (!materiel) {
    throw new NotFoundException(`Matériel ${id_materiel} non trouvé`);
  }

  if (materiel.categorie_materiel !== CategorieMateriel.DURABLE) {
    throw new BadRequestException('Impossible de créer un inventaire pour un matériel consommable');
  }

  const existant = await this.findByMateriel(id_materiel);
  if (existant) {
    throw new ConflictException('Un inventaire existe déjà pour ce matériel');
  }

  const id = await this.generateId();
  
  const inventaire = this.inventaireRepository.create({
    id,
    materiel: { id: id_materiel } as any,
    quantite_stock,
    quantite_reservee: 0,
    quantite_disponible: quantite_stock,
    seuil_alerte,
    date_dernier_inventaire: new Date(),
  });

  const saved = await this.inventaireRepository.save(inventaire);

  console.log(`✅ Inventaire créé : ${id} - Stock: ${quantite_stock} (sans mouvement - sera créé par approvisionnement)`);
  return saved;
}


  async approvisionner(id_materiel: string, quantite_ajoutee: number) {
    console.log(`\n=== APPROVISIONNEMENT ===`);
    console.log(`Matériel: ${id_materiel}`);
    console.log(`Quantité à ajouter: ${quantite_ajoutee}`);

    const materiel = await this.materielRepository.findOne({ 
      where: { id: id_materiel } 
    });
    
    if (!materiel) {
      throw new NotFoundException(`Matériel ${id_materiel} non trouvé`);
    }

    if (materiel.categorie_materiel !== CategorieMateriel.DURABLE) {
      console.log(`⚠️ Matériel consommable, pas d'inventaire`);
      return null;
    }

    const inventaire = await this.findByMateriel(id_materiel);
    
    if (!inventaire) {
      throw new NotFoundException(`Aucun inventaire trouvé pour le matériel ${id_materiel}`);
    }

    console.log(`Stock AVANT: ${inventaire.quantite_stock}`);
    console.log(`Disponible AVANT: ${inventaire.quantite_disponible}`);

    const quantiteAjouter = Number(quantite_ajoutee);
    const stockActuel = Number(inventaire.quantite_stock);
    const dispoActuelle = Number(inventaire.quantite_disponible);

    inventaire.quantite_stock = stockActuel + quantiteAjouter;
    inventaire.quantite_disponible = dispoActuelle + quantiteAjouter;
    inventaire.date_dernier_inventaire = new Date();
    inventaire.date_mise_a_jour = new Date();

    console.log(`Stock APRÈS: ${inventaire.quantite_stock}`);
    console.log(`Disponible APRÈS: ${inventaire.quantite_disponible}`);
    console.log(`=========================\n`);

    const saved = await this.inventaireRepository.save(inventaire);
    return saved;
  }

  async appliquerAttribution(id_materiel: string, quantite: number) {
    console.log(`\n=== ATTRIBUTION ===`);
    console.log(`Matériel: ${id_materiel}, Quantité: ${quantite}`);

    const inventaire = await this.findByMateriel(id_materiel);
    
    if (!inventaire) {
      console.log(`⚠️ Pas d'inventaire pour ${id_materiel}`);
      return null;
    }

    if (inventaire.materiel.categorie_materiel !== CategorieMateriel.DURABLE) {
      console.log(`⚠️ Matériel consommable, pas de gestion inventaire`);
      return inventaire;
    }

    const quantiteNum = Number(quantite);

    if (quantiteNum > inventaire.quantite_disponible) {
      throw new BadRequestException(
        `Quantité insuffisante. Disponible: ${inventaire.quantite_disponible}, Demandé: ${quantiteNum}`
      );
    }

    console.log(`Réservée AVANT: ${inventaire.quantite_reservee}`);
    console.log(`Disponible AVANT: ${inventaire.quantite_disponible}`);

    inventaire.quantite_reservee = Number(inventaire.quantite_reservee) + quantiteNum;
    inventaire.quantite_disponible = Number(inventaire.quantite_disponible) - quantiteNum;
    
    if (inventaire.quantite_disponible < 0) {
      inventaire.quantite_disponible = 0;
    }

    console.log(`Réservée APRÈS: ${inventaire.quantite_reservee}`);
    console.log(`Disponible APRÈS: ${inventaire.quantite_disponible}`);
    console.log(`===================\n`);

    inventaire.date_mise_a_jour = new Date();
    await this.inventaireRepository.save(inventaire);
    
    return inventaire;
  }

  async appliquerRetour(id_materiel: string, quantite: number) {
    const inventaire = await this.findByMateriel(id_materiel);
    
    if (!inventaire) {
      return null;
    }

    if (inventaire.materiel.categorie_materiel !== CategorieMateriel.DURABLE) {
      return inventaire;
    }

    const quantiteNum = Number(quantite);

    if (quantiteNum > inventaire.quantite_reservee) {
      throw new BadRequestException(
        `Quantité de retour > quantité réservée. Réservée: ${inventaire.quantite_reservee}`
      );
    }

    inventaire.quantite_reservee = Number(inventaire.quantite_reservee) - quantiteNum;
    inventaire.quantite_disponible = Number(inventaire.quantite_disponible) + quantiteNum;
    
    if (inventaire.quantite_disponible > inventaire.quantite_stock) {
      inventaire.quantite_disponible = inventaire.quantite_stock;
    }

    inventaire.date_mise_a_jour = new Date();
    await this.inventaireRepository.save(inventaire);
    
    return inventaire;
  }

  /**
   * ✅ NOUVELLE MÉTHODE : Appliquer les changements suite à un dépannage
   * Cette méthode est appelée automatiquement par le service de dépannage
   */
  async appliquerDepannage(id_materiel: string, nouveau_statut: string, ancien_statut?: string) {
    console.log(`\n=== DÉPANNAGE - MAJ INVENTAIRE ===`);
    console.log(`Matériel: ${id_materiel}`);
    console.log(`Statut: ${ancien_statut || 'Nouveau'} → ${nouveau_statut}`);

    const inventaire = await this.findByMateriel(id_materiel);
    
    if (!inventaire) {
      console.log(`⚠️ Pas d'inventaire pour ${id_materiel}`);
      return null;
    }

    if (inventaire.materiel.categorie_materiel !== CategorieMateriel.DURABLE) {
      console.log(`⚠️ Matériel consommable, pas de gestion inventaire`);
      return inventaire;
    }

    console.log(`Disponible AVANT: ${inventaire.quantite_disponible}`);
    console.log(`Stock: ${inventaire.quantite_stock}`);
    console.log(`Réservée: ${inventaire.quantite_reservee}`);

    // ✅ LOGIQUE : Matériel signalé en panne → disponibilité diminue
    if (nouveau_statut === 'Signalé' && (!ancien_statut || ancien_statut === 'Résolu')) {
      // Un matériel passe de disponible à en panne
      inventaire.quantite_disponible = Number(inventaire.quantite_disponible) - 1;
      if (inventaire.quantite_disponible < 0) {
        inventaire.quantite_disponible = 0;
      }
      console.log(`➡️ Mise en panne : disponible -1`);
    }
    
    // ✅ LOGIQUE : Matériel en cours de réparation → reste indisponible
    else if (nouveau_statut === 'En cours') {
      // Pas de changement de disponibilité (déjà comptabilisé lors du signalement)
      console.log(`➡️ En cours de réparation : pas de changement`);
    }
    
    // ✅ LOGIQUE : Matériel réparé → disponibilité augmente
    else if (nouveau_statut === 'Résolu' && ancien_statut && ancien_statut !== 'Résolu') {
      // Un matériel en panne est réparé et redevient disponible
      inventaire.quantite_disponible = Number(inventaire.quantite_disponible) + 1;
      
      // Vérifier que ça ne dépasse pas le stock moins les réservations
      const maxDispo = Number(inventaire.quantite_stock) - Number(inventaire.quantite_reservee);
      if (inventaire.quantite_disponible > maxDispo) {
        inventaire.quantite_disponible = maxDispo;
      }
      console.log(`➡️ Réparation terminée : disponible +1`);
    }
    
    // ✅ LOGIQUE : Matériel irréparable → stock diminue
    else if (nouveau_statut === 'Irréparable' && ancien_statut && ancien_statut !== 'Irréparable') {
      // Le matériel est définitivement hors service, retrait du stock
      inventaire.quantite_stock = Number(inventaire.quantite_stock) - 1;
      if (inventaire.quantite_stock < 0) {
        inventaire.quantite_stock = 0;
      }
      // La disponibilité reste à 0 (déjà indisponible depuis le signalement)
      console.log(`➡️ Irréparable : stock -1`);
    }

    console.log(`Disponible APRÈS: ${inventaire.quantite_disponible}`);
    console.log(`Stock APRÈS: ${inventaire.quantite_stock}`);
    console.log(`===================================\n`);

    inventaire.date_mise_a_jour = new Date();
    await this.inventaireRepository.save(inventaire);
    
    return inventaire;
  }

  async findAll() {
    return await this.inventaireRepository.find({
      relations: ['materiel', 'materiel.typeMateriel', 'materiel.etatMateriel'],
      order: { date_mise_a_jour: 'DESC' },
    });
  }

  async findOne(id: string) {
    const inventaire = await this.inventaireRepository.findOne({
      where: { id },
      relations: ['materiel', 'materiel.typeMateriel', 'materiel.etatMateriel'],
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
      
    },
  ) {
    const inventaire = await this.findOne(id);
    
    const updateFields: any = {};
    
    if (updateData.quantite_stock !== undefined) {
      const diff = Number(updateData.quantite_stock) - Number(inventaire.quantite_stock);
      
      if (diff !== 0) {
        const typeMouvement = diff > 0 ? MouvementType.ENTREE : MouvementType.SORTIE;
        const typeReference = diff > 0 ? 'CORRECTION_POSITIVE' : 'CORRECTION_NEGATIVE';
        
        await this.mouvementService.create({
          id_materiel: inventaire.materiel.id,
          type_mouvement: typeMouvement,
          quantite_mouvement: Math.abs(diff),
          id_reference: id,
          type_reference: typeReference,
          motif: `Ajustement manuel inventaire - ${diff > 0 ? '+' : ''}${diff} unités`,
          utilisateur: 'system',
        });
      }
      
      updateFields.quantite_stock = Number(updateData.quantite_stock);
      updateFields.quantite_disponible = updateFields.quantite_stock - Number(inventaire.quantite_reservee);
      if (updateFields.quantite_disponible < 0) {
        updateFields.quantite_disponible = 0;
      }
    }
    
    if (updateData.quantite_reservee !== undefined) {
      updateFields.quantite_reservee = Number(updateData.quantite_reservee);
      updateFields.quantite_disponible = Number(inventaire.quantite_stock) - updateFields.quantite_reservee;
      if (updateFields.quantite_disponible < 0) {
        updateFields.quantite_disponible = 0;
      }
    }
    
    if (updateData.seuil_alerte !== undefined) {
      updateFields.seuil_alerte = Number(updateData.seuil_alerte);
    }
    
    

    updateFields.date_mise_a_jour = new Date();

    await this.inventaireRepository.update(id, updateFields);
    return this.findOne(id);
  }

  async remove(id: string) {
    const inventaire = await this.findOne(id);
    
    if (inventaire.quantite_stock > 0) {
      await this.mouvementService.create({
        id_materiel: inventaire.materiel.id,
        type_mouvement: MouvementType.SORTIE,
        quantite_mouvement: inventaire.quantite_stock,
        id_reference: id,
        type_reference: 'SUPPRESSION_INVENTAIRE',
        motif: `Suppression inventaire - Retrait de ${inventaire.quantite_stock} unités`,
        utilisateur: 'system',
      });
    }
    
    return await this.inventaireRepository.delete(id);
  }

  async getAlertesStockBas() {
    return await this.inventaireRepository
      .createQueryBuilder('inventaire')
      .where('inventaire.quantite_disponible <= inventaire.seuil_alerte')
      .leftJoinAndSelect('inventaire.materiel', 'materiel')
      .leftJoinAndSelect('materiel.typeMateriel', 'typeMateriel')
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

    return {
      totalMateriels,
      stockBas,
      stockZero,
      totalStock: parseInt(totalStock.total) || 0,
      totalReserve: await this.getTotalReserve(),
      totalDisponible: await this.getTotalDisponible(),
    };
  }

  private async getTotalReserve() {
    const result = await this.inventaireRepository
      .createQueryBuilder('inventaire')
      .select('SUM(inventaire.quantite_reservee)', 'total')
      .getRawOne();
    return parseInt(result.total) || 0;
  }

  private async getTotalDisponible() {
    const result = await this.inventaireRepository
      .createQueryBuilder('inventaire')
      .select('SUM(inventaire.quantite_disponible)', 'total')
      .getRawOne();
    return parseInt(result.total) || 0;
  }
}
