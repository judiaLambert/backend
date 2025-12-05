import { Controller, Get, Post, Put, Delete, Body, Param,Patch } from '@nestjs/common';
import { AttributionService } from './attribution.service';

@Controller('attributions')
export class AttributionController {
  constructor(private readonly attributionService: AttributionService) {}

  @Post()
  create(@Body() createAttributionDto: any) {
    return this.attributionService.create(createAttributionDto);
  }
  
  @Get('demandeur/:id_demandeur/materiels-approuves')
  async getMaterielsApprouvesByDemandeur(@Param('id_demandeur') id_demandeur: string) {
    return await this.attributionService.getMaterielsApprouvesByDemandeur(id_demandeur);
  }

 @Get('retard')
  async getAttributionsEnRetard() {
    return await this.attributionService.getAttributionsEnRetard();
  }
 @Get('en-cours')
  getEnCours() {
    return this.attributionService.getEnCours();
  }

  @Get('statistiques')
  getStatistiques() {
    return this.attributionService.getStatistiques();
  }

 @Put(':id/statut')
  async changerStatut(
    @Param('id') id: string,
    @Body() body: { nouveau_statut: 'En possession' | 'Retourné' | 'Annuler'; commentaire?: string }
  ) {
    return await this.attributionService.changerStatut(
      id, 
      body.nouveau_statut, 
      body.commentaire
    );
  }

  @Get()
  findAll() {
    return this.attributionService.findAll();
  }

  @Put(':id/retourner')
  retourner(@Param('id') id: string, @Body() retourData: any) {
    return this.attributionService.retourner(id, retourData);
  }

 

  @Get('demandeur/:id_demandeur')
  findByDemandeur(@Param('id_demandeur') id_demandeur: string) {
    return this.attributionService.findByDemandeur(id_demandeur);
  }

  @Get('materiel/:id_materiel')
  findByMateriel(@Param('id_materiel') id_materiel: string) {
    return this.attributionService.findByMateriel(id_materiel);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.attributionService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.attributionService.remove(id);
  }
}
