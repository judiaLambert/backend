import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { DemandeMaterielService } from '../demande_materiel/demande.service';
import { DetailDemandeService } from '../detail_demande/detail.service';
import { DemandeMateriel } from '../demande_materiel/demande.entity';

@Controller('demande-materiel')
export class DemandeMaterielController {
  constructor(
    private readonly demandeMaterielService: DemandeMaterielService,
    private readonly detailDemandeService: DetailDemandeService,
  ) {}

  @Get()
  async getAll(): Promise<DemandeMateriel[]> {
    return await this.demandeMaterielService.findAll();
  }

  @Get('demandeur/:idDemandeur')
  async getByDemandeur(@Param('idDemandeur') idDemandeur: string): Promise<DemandeMateriel[]> {
    return await this.demandeMaterielService.findByDemandeur(idDemandeur);
  }

  @Get(':id')
  async getOne(@Param('id') id: string): Promise<DemandeMateriel> {
    return await this.demandeMaterielService.findOne(id);
  }

  // MODIFIÉ : Création avec détails automatiques
  @Post()
  async create(@Body() demandeData: {
    id_demandeur: string;
    raison_demande: string;
    details: Array<{ id_materiel: string; quantite_demander: number }>;
  }): Promise<{ message: string; data: DemandeMateriel }> {
    try {
      // 1. Créer la demande principale avec statut "en_attente"
      const nouvelleDemande = await this.demandeMaterielService.create(
        demandeData.id_demandeur,
        new Date(), // Date automatique
        demandeData.raison_demande
      );

      // 2. Créer automatiquement les détails de la demande
      for (const detail of demandeData.details) {
        await this.detailDemandeService.create(
          detail.id_materiel,
          nouvelleDemande.id,
          detail.quantite_demander
        );
      }

      return { 
        message: 'Demande créée avec succès et en attente de validation',
        data: nouvelleDemande 
      };
    } catch (error) {
      throw new Error(`Erreur création demande: ${error.message}`);
    }
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateData: {
      id_demandeur: string;
      raison_demande: string;
    },
  ): Promise<DemandeMateriel> {
    return await this.demandeMaterielService.update(
      id,
      updateData.id_demandeur,
      new Date(), // Date mise à jour automatique
      updateData.raison_demande
    );
  }

  // NOUVEAU : Endpoint pour valider/refuser une demande (pour l'admin)
  @Put(':id/validation')
  async validateDemande(
    @Param('id') id: string,
    @Body() validationData: { statut: 'approuvee' | 'refusee'; motif?: string }
  ): Promise<{ message: string; data: DemandeMateriel }> {
    const demande = await this.demandeMaterielService.updateStatut(
      id,
      validationData.statut,
      validationData.motif
    );
    
    return {
      message: `Demande ${validationData.statut === 'approuvee' ? 'approuvée' : 'refusée'} avec succès`,
      data: demande
    };
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<{ message: string }> {
    await this.demandeMaterielService.remove(id);
    return { message: 'Demande supprimée avec succès' };
  }
}