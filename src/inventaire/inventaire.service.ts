import { Injectable, NotFoundException, BadRequestException, ConflictException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventaire } from './inventaire.entity';
import { Materiel, CategorieMateriel } from '../materiel/materiel.entity';
import { MouvementStockService } from '../mouvement_stock/mouvement.service';
import { MouvementType } from '../mouvement_stock/mouvement.entity';
import { DetailApprovisionnement } from '../detail_approvisionnement/detailappro.entity';

@Injectable()
export class InventaireService {
  constructor(
    @InjectRepository(Inventaire)
    private inventaireRepository: Repository<Inventaire>,
    @InjectRepository(Materiel)
    private materielRepository: Repository<Materiel>,
    @Inject(forwardRef(() => MouvementStockService))
    private mouvementService: MouvementStockService,
    @InjectRepository(DetailApprovisionnement)
    private detailApproRepo: Repository<DetailApprovisionnement>,
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

  // 🔍 Calcule la quantité et la valeur initiales depuis les appro
  private async getStockInitialFromAppro(id_materiel: string) {
    const res = await this.detailApproRepo
      .createQueryBuilder('detail')
      .select('COALESCE(SUM(detail.quantiteRecu), 0)', 'totalQuantite')
      .addSelect(
        'COALESCE(SUM(detail.quantiteRecu * detail.prixUnitaire), 0)',
        'totalValeur',
      )
      .where('detail.id_materiel = :id_materiel', { id_materiel })
      .getRawOne();

    const quantite = Number(res.totalQuantite) || 0;
    const valeur = Number(res.totalValeur) || 0;

    return { quantite, valeur };
  }

  // ✅ Création MANUELLE du 1er inventaire, valeur auto depuis les appro
  async create(
    id_materiel: string,
    quantite_stock: number, // ignoré, on se base sur les appro
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

    // ✅ Récupérer les appro déjà existants pour ce matériel
    const { quantite, valeur } = await this.getStockInitialFromAppro(id_materiel);

    if (quantite === 0) {
      throw new BadRequestException(
        `Aucun approvisionnement trouvé pour le matériel ${id_materiel} – impossible de créer un inventaire initial`,
      );
    }

    const id = await this.generateId();
    
    const inventaire = this.inventaireRepository.create({
      id,
      materiel: { id: id_materiel } as any,
      quantite_stock: quantite,
      quantite_reservee: 0,
      quantite_disponible: quantite,
      valeur_stock: valeur,
      seuil_alerte,
      date_dernier_inventaire: new Date(),
    });

    const saved = await this.inventaireRepository.save(inventaire);
    console.log(
      `✅ Inventaire créé : ${id} – Qté: ${quantite}, Valeur: ${valeur} Ar`,
    );
    
    return saved;
  }

  async getCUMP(id_materiel: string): Promise<number> {
    const inventaire = await this.findByMateriel(id_materiel);
    
    if (!inventaire) {
      return 0;
    }

    const valeur = Number(inventaire.valeur_stock || 0);
    const quantite = Number(inventaire.quantite_stock || 0);

    return quantite > 0 ? valeur / quantite : 0;
  }

 // ✅ CORRECTION 1 : appliquerAttribution ne doit PAS toucher au stock
async appliquerAttribution(id_materiel: string, quantite: number) {
  console.log(`\n📦 === ATTRIBUTION ===`);
  console.log(`Matériel: ${id_materiel}, Quantité: ${quantite}`);

  const inventaire = await this.findByMateriel(id_materiel);
  
  if (!inventaire) {
    console.log(`⚠️ Pas d'inventaire pour ${id_materiel}`);
    return null;
  }

  if (inventaire.materiel.categorie_materiel !== CategorieMateriel.DURABLE) {
    console.log(`ℹ️ Matériel consommable, pas de gestion inventaire`);
    return inventaire;
  }

  const quantiteNum = Number(quantite);

  if (quantiteNum > inventaire.quantite_disponible) {
    throw new BadRequestException(
      `Quantité insuffisante. Disponible: ${inventaire.quantite_disponible}, Demandé: ${quantiteNum}`
    );
  }

  console.log(`Stock AVANT: ${inventaire.quantite_stock} (ne change pas)`);
  console.log(`Réservée AVANT: ${inventaire.quantite_reservee}`);
  console.log(`Disponible AVANT: ${inventaire.quantite_disponible}`);

  // ✅ ON NE TOUCHE PAS AU STOCK, juste réservé ↑ et dispo ↓
  inventaire.quantite_reservee = Number(inventaire.quantite_reservee) + quantiteNum;
  inventaire.quantite_disponible = Number(inventaire.quantite_disponible) - quantiteNum;
  
  if (inventaire.quantite_disponible < 0) {
    inventaire.quantite_disponible = 0;
  }

  console.log(`Stock APRÈS: ${inventaire.quantite_stock} (inchangé) ✅`);
  console.log(`Réservée APRÈS: ${inventaire.quantite_reservee}`);
  console.log(`Disponible APRÈS: ${inventaire.quantite_disponible}`);
  console.log(`===================\n`);

  inventaire.date_mise_a_jour = new Date();
  await this.inventaireRepository.save(inventaire);
  
  return inventaire;
}

// ✅ CORRECTION 2 : appliquerDepannage doit libérer les réservations
async appliquerDepannage(id_materiel: string, nouveau_statut: string, ancien_statut?: string) {
  console.log(`\n🔧 === DÉPANNAGE - MAJ INVENTAIRE ===`);
  console.log(`Matériel: ${id_materiel}`);
  console.log(`Statut: ${ancien_statut || 'Nouveau'} → ${nouveau_statut}`);

  const inventaire = await this.findByMateriel(id_materiel);
  
  if (!inventaire) {
    console.log(`⚠️ Pas d'inventaire pour ${id_materiel}`);
    return null;
  }

  if (inventaire.materiel.categorie_materiel !== CategorieMateriel.DURABLE) {
    console.log(`ℹ️ Matériel consommable, pas de gestion inventaire`);
    return inventaire;
  }

  console.log(`Stock AVANT: ${inventaire.quantite_stock}`);
  console.log(`Disponible AVANT: ${inventaire.quantite_disponible}`);
  console.log(`Réservée AVANT: ${inventaire.quantite_reservee}`);
  console.log(`Valeur: ${inventaire.valeur_stock} Ar`);

  // ✅ NOUVEAU : Si mise en panne, libérer les réservations si nécessaire
  if (nouveau_statut === 'Signalé' && (!ancien_statut || ancien_statut === 'Résolu')) {
    inventaire.quantite_disponible = Number(inventaire.quantite_disponible) - 1;
    if (inventaire.quantite_disponible < 0) {
      inventaire.quantite_disponible = 0;
    }
    
    // ✅ Si c'était un matériel réservé qui tombe en panne, libérer la réservation
    if (inventaire.quantite_reservee > 0) {
      inventaire.quantite_reservee = Number(inventaire.quantite_reservee) - 1;
      if (inventaire.quantite_reservee < 0) {
        inventaire.quantite_reservee = 0;
      }
      console.log(`⚠️ Mise en panne d'un matériel réservé : réservation libérée`);
    } else {
      console.log(`⚠️ Mise en panne : disponible -1`);
    }
  }
  else if (nouveau_statut === 'En cours') {
    console.log(`🔄 En cours de réparation : pas de changement`);
  }
  else if (nouveau_statut === 'Résolu' && ancien_statut && ancien_statut !== 'Résolu') {
    inventaire.quantite_disponible = Number(inventaire.quantite_disponible) + 1;
    
    const maxDispo = Number(inventaire.quantite_stock) - Number(inventaire.quantite_reservee);
    if (inventaire.quantite_disponible > maxDispo) {
      inventaire.quantite_disponible = maxDispo;
    }
    console.log(`✅ Réparation terminée : disponible +1`);
  }
  else if (nouveau_statut === 'Irréparable' && ancien_statut && ancien_statut !== 'Irréparable') {
    const cump = await this.getCUMP(id_materiel);
    
    // ✅ Diminuer le stock total
    inventaire.quantite_stock = Number(inventaire.quantite_stock) - 1;
    if (inventaire.quantite_stock < 0) {
      inventaire.quantite_stock = 0;
    }
    
    inventaire.valeur_stock = Number(inventaire.valeur_stock) - cump;
    if (inventaire.valeur_stock < 0) {
      inventaire.valeur_stock = 0;
    }
    
    // ✅ Le matériel n'était pas disponible (déjà compté en -1 lors du signalement)
    // Donc on ne touche pas à quantite_disponible ici
    
    console.log(`❌ Irréparable : stock -1, valeur -${cump.toFixed(2)} Ar`);
    console.log(`   Nouvelle valeur stock: ${inventaire.valeur_stock} Ar`);
  }

  console.log(`Stock APRÈS: ${inventaire.quantite_stock}`);
  console.log(`Disponible APRÈS: ${inventaire.quantite_disponible}`);
  console.log(`Réservée APRÈS: ${inventaire.quantite_reservee}`);
  console.log(`===================================\n`);

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
        
        const cump_actuel = await this.getCUMP(inventaire.materiel.id);
        
        await this.mouvementService.create({
          id_materiel: inventaire.materiel.id,
          type_mouvement: typeMouvement,
          quantite_mouvement: Math.abs(diff),
          prix_unitaire: cump_actuel || 0,
          id_reference: id,
          type_reference: typeReference,
          motif: `Ajustement manuel inventaire - ${diff > 0 ? '+' : ''}${diff} unités`,
          utilisateur: 'system',
        });
        
        const inventaireMisAJour = await this.findOne(id);
        return inventaireMisAJour;
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
    
    await this.inventaireRepository.remove(inventaire);
    console.log(` Inventaire ${id} supprimé`);
    
    return { message: 'Inventaire supprimé avec succès' };
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

    const valeurTotale = await this.inventaireRepository
      .createQueryBuilder('inventaire')
      .select('SUM(inventaire.valeur_stock)', 'valeur')
      .getRawOne();

    return {
      totalMateriels,
      stockBas,
      stockZero,
      totalStock: parseInt(totalStock.total) || 0,
      totalReserve: await this.getTotalReserve(),
      totalDisponible: await this.getTotalDisponible(),
      valeurTotaleStock: parseFloat(valeurTotale.valeur) || 0,
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
