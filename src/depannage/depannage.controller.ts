import { Controller, Get, Post, Put, Delete, Patch, Param, Body, BadRequestException } from '@nestjs/common';
import { DepannageService } from './depannage.service';

@Controller('depannage')
export class DepannageController {
  constructor(private readonly depannageService: DepannageService) {}

  @Post()
  async create(@Body() body: {
    id_materiel: string;
    id_demandeur: string;
    date_signalement: string;
    description_panne: string;
  }) {
    if (!body.id_materiel || !body.id_demandeur || !body.description_panne) {
      throw new BadRequestException('Tous les champs sont obligatoires');
    }
    return await this.depannageService.create(
      body.id_materiel,
      body.id_demandeur,
      new Date(body.date_signalement),
      body.description_panne,
      'Signalé',
    );
  }

  @Get()
  async findAll() {
    return await this.depannageService.findAll();
  }

  @Get('statistiques')
  async getStatistiques() {
    return await this.depannageService.getStatistiques();
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

  // ✅ NOUVELLE ROUTE : Obtenir les infos d'inventaire
  @Get('inventaire-infos/:id_materiel')
  async getInventaireInfos(@Param('id_materiel') id_materiel: string) {
    return await this.depannageService.getInventaireInfos(id_materiel);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.depannageService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return await this.depannageService.update(id, body);
  }

  @Patch(':id/statut')
  async updateStatut(@Param('id') id: string, @Body() body: { statut_depannage: string }) {
    if (!body.statut_depannage) {
      throw new BadRequestException('Le statut est obligatoire');
    }
    return await this.depannageService.update(id, { statut_depannage: body.statut_depannage });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.depannageService.remove(id);
  }
}
