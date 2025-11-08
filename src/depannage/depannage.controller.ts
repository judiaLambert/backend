import { Controller, Get, Post, Put, Delete, Param, Body, Patch } from '@nestjs/common';
import { DepannageService } from './depannage.service';

@Controller('depannage')
export class DepannageController {
  constructor(private readonly depannageService: DepannageService) {}

  @Get()
  async getAll() {
    return await this.depannageService.findAll();
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return await this.depannageService.findOne(id);
  }

  @Post()
  async create(@Body() body: {
    id_materiel: string;
    id_demandeur: string;
    date_signalement: Date;
    description_panne: string;
    statut_depannage: string;
  }) {
    return await this.depannageService.create(
      body.id_materiel,
      body.id_demandeur,
      body.date_signalement,
      body.description_panne,
      body.statut_depannage,
    );
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: {
      description_panne?: string;
      statut_depannage?: string;
      date_signalement?: Date;
      id_materiel?: string;
      id_demandeur?: string;
    },
  ) {
    return await this.depannageService.update(id, body);
  }

 @Patch(':id')
async updateStatut(
  @Param('id') id: string,
  @Body() body: { statut_depannage: string },
) {
  console.log('🔄 ROUTE PATCH appelée:', id, body);
  return await this.depannageService.update(id, {
    statut_depannage: body.statut_depannage,
  });
}

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.depannageService.remove(id);
    return { message: 'Dépannage supprimé' };
  }

  @Get('statut/:statut')
  async getByStatut(@Param('statut') statut: string) {
    return await this.depannageService.findByStatut(statut);
  }

  @Get('demandeur/:id_demandeur')
  async getByDemandeur(@Param('id_demandeur') id_demandeur: string) {
    return await this.depannageService.findByDemandeur(id_demandeur);
  }

  @Get('materiel/:id_materiel')
  async getByMateriel(@Param('id_materiel') id_materiel: string) {
    return await this.depannageService.findByMateriel(id_materiel);
  }

  @Get('stats/statistiques')
  async getStatistiques() {
    return await this.depannageService.getStatistiques();
  }
}