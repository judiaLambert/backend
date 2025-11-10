import { Controller, Get, Post, Put, Delete, Param, Body, HttpException, HttpStatus } from '@nestjs/common';
import { DemandeMaterielService } from './demande.service';
import { DemandeMateriel } from './demande.entity';

@Controller('demande-materiel')
export class DemandeMaterielController {
  constructor(
    private readonly demandeMaterielService: DemandeMaterielService,
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

  @Post()
  async create(@Body() demandeData: {
    id_demandeur: string;
    raison_demande: string;
    details: Array<{ id_materiel: string; quantite_demander: number }>;
  }) {
    try {
      if (!demandeData.id_demandeur || !demandeData.raison_demande) {
        throw new HttpException(
          'id_demandeur et raison_demande sont requis',
          HttpStatus.BAD_REQUEST
        );
      }

      if (!demandeData.details || demandeData.details.length === 0) {
        throw new HttpException(
          'Au moins un matériel doit être demandé',
          HttpStatus.BAD_REQUEST
        );
      }

      const result = await this.demandeMaterielService.create(
        demandeData.id_demandeur,
        demandeData.raison_demande,
        demandeData.details
      );

      return result;
    } catch (error) {
      console.error('Erreur création demande:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Erreur création demande: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateData: {
      raison_demande: string;
    },
  ): Promise<DemandeMateriel> {
    return await this.demandeMaterielService.update(id, updateData.raison_demande);
  }

  @Put(':id/validation')
  async validateDemande(
    @Param('id') id: string,
    @Body() validationData: { statut: 'approuvee' | 'refusee'; motif_refus?: string }
  ) {
    try {
      const demande = await this.demandeMaterielService.updateStatut(
        id,
        validationData.statut,
        validationData.motif_refus
      );
      
      return {
        success: true,
        message: `Demande ${validationData.statut === 'approuvee' ? 'approuvée' : 'refusée'} avec succès`,
        data: demande
      };
    } catch (error) {
      throw new HttpException(
        `Erreur validation demande: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<{ message: string }> {
    await this.demandeMaterielService.remove(id);
    return { message: 'Demande supprimée avec succès' };
  }
}
