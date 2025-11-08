import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { AttributionService } from './attribution.service';

@Controller('attributions')
export class AttributionController {
  constructor(private readonly attributionService: AttributionService) {}

  @Post()
  async create(@Body() body: {
    id_materiel: string;
    id_demandeur: string;
    date_attribution: string;
    quantite_attribuee: number;
    statut_attribution: string;
    date_retour_prevue?: string;
    motif_attribution?: string;
  }) {
    return await this.attributionService.create(
      body.id_materiel,
      body.id_demandeur,
      new Date(body.date_attribution),
      body.quantite_attribuee,
      body.statut_attribution,
      body.date_retour_prevue ? new Date(body.date_retour_prevue) : undefined,
      body.motif_attribution
    );
  }

  @Get()
  async findAll() {
    return await this.attributionService.findAll();
  }

  @Get('demandeur/:id')
  async findByDemandeur(@Param('id') id: string) {
    return await this.attributionService.findByDemandeur(id);
  }

  @Get('materiel/:id')
  async findByMateriel(@Param('id') id: string) {
    return await this.attributionService.findByMateriel(id);
  }

  @Get('retard')
  async getAttributionsEnRetard() {
    return await this.attributionService.getAttributionsEnRetard();
  }

  @Get('statistiques')
  async getStatistiques() {
    return await this.attributionService.getStatistiques();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.attributionService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: {
      date_attribution?: string;
      quantite_attribuee?: number;
      statut_attribution?: string;
      date_retour_prevue?: string;
      motif_attribution?: string;
    }
  ) {
    const updateData: any = {};
    
    if (body.date_attribution) updateData.date_attribution = new Date(body.date_attribution);
    if (body.quantite_attribuee !== undefined) updateData.quantite_attribuee = body.quantite_attribuee;
    if (body.statut_attribution) updateData.statut_attribution = body.statut_attribution;
    if (body.date_retour_prevue) updateData.date_retour_prevue = new Date(body.date_retour_prevue);
    if (body.motif_attribution) updateData.motif_attribution = body.motif_attribution;

    return await this.attributionService.update(id, updateData);
  }

  @Put(':id/statut')
  async updateStatut(@Param('id') id: string, @Body() body: { statut_attribution: string }) {
    return await this.attributionService.updateStatut(id, body.statut_attribution);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.attributionService.remove(id);
  }
}