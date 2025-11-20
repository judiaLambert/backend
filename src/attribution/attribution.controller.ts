import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { AttributionService } from './attribution.service';

@Controller('attributions')
export class AttributionController {
  constructor(private readonly service: AttributionService) {}

  // Routes spécifiques EN PREMIER
  @Get('statistiques')
  async getStatistiques() {
    return await this.service.getStatistiques();
  }

  @Get('retard')
  async getAttributionsEnRetard() {
    return await this.service.getAttributionsEnRetard();
  }

  // ✅ NOUVELLE ROUTE : Matériels approuvés d'un demandeur
  @Get('demandeur/:id_demandeur/materiels-approuves')
  async getMaterielsApprouves(@Param('id_demandeur') id_demandeur: string) {
    return await this.service.getMaterielsDemandesApprouves(id_demandeur);
  }

  @Get('demandeur/:id_demandeur')
  async getByDemandeur(@Param('id_demandeur') id_demandeur: string) {
    return await this.service.findByDemandeur(id_demandeur);
  }

  @Get('materiel/:id_materiel')
  async getByMateriel(@Param('id_materiel') id_materiel: string) {
    return await this.service.findByMateriel(id_materiel);
  }

  @Get()
  async findAll() {
    return await this.service.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.service.findOne(id);
  }

  @Post()
  async create(
    @Body()
    body: {
      id_materiel: string;
      id_demandeur: string;
      quantite_attribuee: number;
      date_retour_prevue?: string;
      motif_attribution?: string;
    },
  ) {
    return await this.service.create(
      body.id_materiel,
      body.id_demandeur,
      body.quantite_attribuee,
      body.date_retour_prevue ? new Date(body.date_retour_prevue) : undefined,
      body.motif_attribution,
    );
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      quantite_attribuee?: number;
      statut_attribution?: string;
      date_retour_prevue?: string;
      motif_attribution?: string;
    },
  ) {
    return await this.service.update(id, {
      ...body,
      date_retour_prevue: body.date_retour_prevue ? new Date(body.date_retour_prevue) : undefined,
    });
  }

  @Put(':id/statut')
  async updateStatut(@Param('id') id: string, @Body() body: { statut_attribution: string }) {
    return await this.service.updateStatut(id, body.statut_attribution);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { message: 'Attribution supprimée avec succès' };
  }
}
