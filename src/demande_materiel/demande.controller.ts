import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { DemandeMaterielService } from './demande.service';

@Controller('demandes')
export class DemandeMaterielController {
  constructor(private readonly demandeService: DemandeMaterielService) {}
  
@Post()
create(@Body() body: any) {
  return this.demandeService.create(
    body.id_demandeur,
    body.raison_demande,
    body.details,
    body.type_possession,
    body.date_retour
  );
}

  @Get()
  findAll() {
    return this.demandeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.demandeService.findOne(id);
  }

  @Get('demandeur/:id')
  findByDemandeur(@Param('id') id: string) {
    return this.demandeService.findByDemandeur(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.demandeService.update(id, body.raison_demande);
  }

  @Put(':id/statut')
  updateStatut(@Param('id') id: string, @Body() body: any) {
    return this.demandeService.updateStatut(id, body.statut, body.motif_refus);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.demandeService.remove(id);
  }

  // Routes pour gérer les détails
  @Post(':id/details')
  addDetail(@Param('id') id: string, @Body() body: any) {
    return this.demandeService.addDetail(id, body.id_materiel, body.quantite_demander);
  }

  @Put('details/:id')
  updateDetail(@Param('id') id: string, @Body() body: any) {
    return this.demandeService.updateDetail(id, body.quantite_demander);
  }

  @Delete('details/:id')
  removeDetail(@Param('id') id: string) {
    return this.demandeService.removeDetail(id);
  }
}
